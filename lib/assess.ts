import fs from "fs"
import path from "path"
import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenAI, Type } from "@google/genai"
import type { AssessmentInput, AssessmentResult } from "@/types"
import {
  buildAnnexContext,
  nationalStrategyIds,
  newGrowthIds,
  lookupAnnexLabel,
  getCatalogMeta,
} from "@/lib/annex"

// ──────────────────────────────────────────────
// 기준문서 로드 (PRD만 — 활동 적격성 평가기준 제외)
// ──────────────────────────────────────────────
function loadCriteriaDocs(): { PRD: string } {
  const base = path.join(process.cwd(), "lib", "criteria")
  return {
    PRD: fs.readFileSync(path.join(base, "PRD.md"), "utf-8"),
  }
}

// ──────────────────────────────────────────────
// 결과 JSON 스키마 (기술 부합도 매핑 전용)
// ──────────────────────────────────────────────
const 매핑항목_스키마 = {
  type: "object",
  required: ["매핑항목ID", "매핑항목명", "적합도", "정량요건", "판정근거"],
  properties: {
    매핑항목ID: { type: "string" },   // enum은 buildResultSchemaWithEnum()에서 주입
    매핑항목명: { type: "string" },
    적합도: { type: "string", enum: ["상", "중", "하"] },
    정량요건: { type: "string", enum: ["충족", "미충족", "확인필요", "해당없음"] },
    판정근거: { type: "string" },
  },
}

const RESULT_SCHEMA = {
  type: "object" as const,
  required: [
    "과제명", "국가전략매핑", "신성장매핑",
    "적용공제율", "종합판정", "판단사유",
    "제목진단", "보완사항", "확인필요항목",
  ],
  properties: {
    과제명: { type: "string" },
    국가전략매핑: {
      type: "array",
      description: "별표7의2 국가전략기술(30%+α) 부합 항목. 없으면 빈 배열 [].",
      items: 매핑항목_스키마,
    },
    신성장매핑: {
      type: "array",
      description: "별표7 신성장·원천기술(20%+α) 부합 항목. 없으면 빈 배열 [].",
      items: 매핑항목_스키마,
    },
    적용공제율: {
      type: "string",
      description: "예: 국가전략(30%+α), 신성장(20%+α), 해당없음(일반R&D 최대2%)",
    },
    종합판정: {
      type: "string",
      enum: ["적합(유력)", "조건부", "부적합(유력)", "확인필요"],
    },
    판단사유: { type: "string" },
    제목진단: {
      type: "object",
      required: ["오해소지", "사유", "대체제목추천"],
      properties: {
        오해소지: { type: "string", enum: ["있음", "없음"] },
        사유: { type: "string" },
        대체제목추천: { type: "array", items: { type: "string" } },
      },
    },
    보완사항: {
      type: "array",
      items: {
        type: "object",
        required: ["항목", "현재문제", "구체적_개선안"],
        properties: {
          항목: { type: "string" },
          현재문제: { type: "string" },
          구체적_개선안: { type: "string" },
        },
      },
    },
    확인필요항목: { type: "array", items: { type: "string" } },
  },
}

// 카탈로그 enum을 각 매핑 배열에 주입한 스키마 생성
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResultSchemaWithEnum(): Record<string, any> {
  const nsIds = nationalStrategyIds()  // 국-*
  const ngIds = newGrowthIds()         // 신-*
  const base = RESULT_SCHEMA as any
  const patchItem = (ids: string[]) => ({
    ...매핑항목_스키마,
    properties: {
      ...매핑항목_스키마.properties,
      매핑항목ID: {
        type: "string",
        enum: ids,
        description: '카탈로그 ID 또는 "해당없음"',
      },
    },
  })
  return {
    ...base,
    properties: {
      ...base.properties,
      국가전략매핑: {
        ...base.properties.국가전략매핑,
        items: patchItem(nsIds),
      },
      신성장매핑: {
        ...base.properties.신성장매핑,
        items: patchItem(ngIds),
      },
    },
  }
}

function buildToolDef(): Anthropic.Tool {
  return {
    name: "판정결과",
    description:
      "조특법 제10조 세액공제 대상기술 해당여부 1차 판정 결과를 구조화된 JSON으로 반환합니다. " +
      "국가전략기술(별표7의2)을 먼저 검토하고, 신성장·원천기술(별표7)을 그다음에 검토합니다.",
    input_schema: buildResultSchemaWithEnum() as Anthropic.Tool["input_schema"],
  }
}

// ──────────────────────────────────────────────
// JSON Schema → Gemini Schema 변환
// ──────────────────────────────────────────────
type GeminiSchema = Record<string, unknown>

function toGeminiSchema(schema: Record<string, unknown>): GeminiSchema {
  const result: GeminiSchema = {}

  if (schema.type) {
    const t = (schema.type as string).toUpperCase()
    const typeMap: Record<string, string> = {
      OBJECT: Type.OBJECT,
      ARRAY: Type.ARRAY,
      STRING: Type.STRING,
      BOOLEAN: Type.BOOLEAN,
      NUMBER: Type.NUMBER,
      INTEGER: Type.INTEGER,
    }
    result.type = typeMap[t] ?? Type.STRING
  }

  if (schema.description) result.description = schema.description
  if (schema.enum) result.enum = schema.enum
  if (schema.required) result.required = schema.required

  if (schema.properties && typeof schema.properties === "object") {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties as Record<string, Record<string, unknown>>).map(
        ([k, v]) => [k, toGeminiSchema(v)]
      )
    )
  }

  if (schema.items && typeof schema.items === "object") {
    result.items = toGeminiSchema(schema.items as Record<string, unknown>)
  }

  return result
}

// ──────────────────────────────────────────────
// 시스템 프롬프트 빌드 (기술 부합도 매핑 전용)
// ──────────────────────────────────────────────
function buildSystemPrompt(docs: { PRD: string }, annexCtx: string): string {
  return `당신은 조선산업 대기업 연구소의 **연구개발 세액공제 대상기술 부합도 판정 전문가**입니다.
조세특례제한법 제10조에 따른 **기술 부합도 매핑**만을 수행합니다.
(연구개발활동 적격성 평가 — 연구소 신고·인력 전담·제외활동 등 — 은 이번 판정 범위에서 제외됩니다.)

─────────────────────────────────────────────────────────────────────
[기준문서 1] PRD — 연구개발 세액공제 업무 추진 (v2.1)
─────────────────────────────────────────────────────────────────────
${docs.PRD}

─────────────────────────────────────────────────────────────────────
[기준문서 2] 세액공제 대상기술 — 별표7/7의2 원문 카탈로그
─────────────────────────────────────────────────────────────────────
${annexCtx}

─────────────────────────────────────────────────────────────────────
[매핑 필수 규칙]
─────────────────────────────────────────────────────────────────────
【검토 순서 — 반드시 이 순서로】
① 먼저 별표7의2(국가전략기술, 30%+α) 부합 여부를 검토하여 국가전략매핑 배열을 채운다.
② 그다음 별표7(신성장·원천기술, 20%+α) 부합 여부를 검토하여 신성장매핑 배열을 채운다.
③ 부합 항목이 없는 배열은 빈 배열 []로 둔다.

【매핑 판정 규칙】
1. 중복 해당 시 국가전략 우선 — 국가전략매핑·신성장매핑 양쪽에 기재하되 적용공제율은 국가전략 기준으로 표기.
2. 정량요건(출력밀도·효율·온도 등 수치기준) 불명확 → 정량요건 = "확인필요".
3. "조선업 = 자동 적용" 아님 — 실제 개발 기술이 조문 정의에 부합해야 함.
4. 부합 항목이 전혀 없으면 두 배열 모두 빈 배열, 종합판정 = "부적합(유력)".
5. 불명확하면 "확인필요". 근거 없이 단정 금지.
6. 결과는 1차 초안이며 기술심의위원회·국세청 사전심사·전문가 검토로 확정해야 함.

【종합판정 기준 (기술 부합도 기준)】
- 적합(유력): 별표 조문에 명확히 부합하고 정량요건 충족 확인 가능
- 조건부: 부합 가능성 있으나 정량요건 미확인·조문 해석 불명확
- 부적합(유력): 별표 항목 없음 또는 제외 사유 명확
- 확인필요: 기술 내용 불충분으로 판단 보류

[보완사항 작성 지침]
- 각 보완사항은 항목·현재문제·구체적_개선안 세 필드. 기술 부합도 강화를 위한 실행 가능한 문장으로 기재.

[제목진단 지침]
- 과제명이 "설계/생산/지원/운영/원가절감/사양변경" 등 일상업무로 읽힐 위험 시 오해소지=있음.
- 오해소지 있을 때: 별표 조문 키워드를 반영한 대체 제목 2~3개 추천.`
}

// ──────────────────────────────────────────────
// 사용자 메시지 빌드
// ──────────────────────────────────────────────
function buildUserMessage(input: AssessmentInput): string {
  return `아래 과제에 대해 별표7의2(국가전략) → 별표7(신성장) 순서로 기술 부합도를 판정해 주십시오.

과제번호: ${input.과제번호 || "미입력"}
과제명: ${input.과제명}
개발 배경: ${input.개발배경}
과제 목표: ${input.과제목표}
수행 방안: ${input.수행방안}
기대 효과: ${input.기대효과 || "(미입력)"}

국가전략매핑·신성장매핑·적용공제율·종합판정·판단사유·제목진단·보완사항·확인필요항목을 모두 채워 주십시오.`
}

// ──────────────────────────────────────────────
// 서버 후처리: 항목명을 카탈로그 원문으로 덮어쓰기
// ──────────────────────────────────────────────
function postProcessResult(result: AssessmentResult): AssessmentResult {
  const patchItems = (items: AssessmentResult["국가전략매핑"]) =>
    items.map((m) => ({
      ...m,
      매핑항목명: lookupAnnexLabel(m.매핑항목ID) ?? m.매핑항목명,
    }))
  return {
    ...result,
    국가전략매핑: patchItems(result.국가전략매핑 ?? []),
    신성장매핑: patchItems(result.신성장매핑 ?? []),
    _기준메타: getCatalogMeta(),
  }
}

// ──────────────────────────────────────────────
// Claude 판정 (Anthropic tool use, 프롬프트 캐싱)
// ──────────────────────────────────────────────
async function assessWithClaude(input: AssessmentInput, apiKey: string): Promise<AssessmentResult> {
  const client = new Anthropic({ apiKey })
  const docs = loadCriteriaDocs()
  const annexCtx = buildAnnexContext(input.기준범위 ?? "조선추출", "claude")

  const response = await client.messages.create({
    model: input.model || "claude-sonnet-4-6",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(docs, annexCtx),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [buildToolDef()],
    tool_choice: { type: "tool", name: "판정결과" },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  })

  const toolUse = response.content.find((b) => b.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude API에서 판정결과를 받지 못했습니다.")
  }
  return postProcessResult(toolUse.input as AssessmentResult)
}

// ──────────────────────────────────────────────
// Gemini 판정 (JSON 모드, responseSchema)
// ──────────────────────────────────────────────
async function assessWithGemini(input: AssessmentInput, apiKey: string): Promise<AssessmentResult> {
  const ai = new GoogleGenAI({ apiKey })
  const docs = loadCriteriaDocs()
  const annexCtx = buildAnnexContext(input.기준범위 ?? "조선추출", "gemini")

  const response = await ai.models.generateContent({
    model: input.model || "gemini-2.5-flash-lite",
    contents: buildUserMessage(input),
    config: {
      systemInstruction: buildSystemPrompt(docs, annexCtx),
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(buildResultSchemaWithEnum()),
      maxOutputTokens: 8192,
    },
  })

  const text = response.text
  if (!text) throw new Error("Gemini API에서 응답을 받지 못했습니다.")

  try {
    return postProcessResult(JSON.parse(text) as AssessmentResult)
  } catch {
    throw new Error(`Gemini 응답 파싱 실패. 응답: ${text.slice(0, 200)}`)
  }
}

// ──────────────────────────────────────────────
// 오류 메시지 사용자 친화적 변환
// ──────────────────────────────────────────────
function friendlyError(err: unknown, engine: "claude" | "gemini"): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes("credit") || lower.includes("billing") || lower.includes("quota")) {
    return engine === "claude"
      ? `Claude 크레딧이 부족합니다. console.anthropic.com → Plans & Billing에서 충전하거나, 무료(Gemini) 엔진으로 전환하세요.`
      : `Gemini 할당량 관련 오류. 원문: ${msg.slice(0, 400)}`
  }
  if ((lower.includes("invalid") && lower.includes("key")) || lower.includes("api_key") || lower.includes("unauthorized")) {
    return engine === "claude"
      ? `Claude API 키가 유효하지 않습니다. console.anthropic.com에서 키를 확인하세요.`
      : `Gemini API 키가 유효하지 않습니다. aistudio.google.com에서 키를 확인하세요.`
  }
  if (lower.includes("per_minute") || lower.includes("rpm")) {
    return `분당 요청 한도 초과입니다. 1분 후 다시 시도해 주세요. (Gemini 무료: 분당 15회)`
  }
  if (lower.includes("per_day") || lower.includes("rpd") || lower.includes("daily")) {
    return `오늘의 무료 할당량(일 1,500회)이 소진됐습니다. 내일 다시 사용하거나 aistudio.google.com에서 새 키를 발급받으세요.`
  }
  if (lower.includes("not_found") || lower.includes("not found") || lower.includes("404")) {
    return `모델을 찾을 수 없습니다. 신규 API 키는 Gemini 2.x 모델만 지원합니다.`
  }
  if (lower.includes("rate") || lower.includes("429") || lower.includes("resource_exhausted")) {
    return `요청 한도 초과. 잠시 후 다시 시도해 주세요. Gemini 원문: ${msg.slice(0, 200)}`
  }
  return `판정 중 오류: ${msg}`
}

// ──────────────────────────────────────────────
// 공개 디스패처
// ──────────────────────────────────────────────
export async function assess(input: AssessmentInput, apiKey: string): Promise<AssessmentResult> {
  try {
    if (input.engine === "claude") {
      return await assessWithClaude(input, apiKey)
    } else {
      return await assessWithGemini(input, apiKey)
    }
  } catch (err) {
    throw new Error(friendlyError(err, input.engine ?? "gemini"))
  }
}
