import fs from "fs"
import path from "path"

interface AnnexItem {
  별표: string
  구분: string
  조문위치: string
  정식명칭: string
  설명?: string
}

interface AnnexCatalog {
  출처: string
  개정일: string
  items: Record<string, AnnexItem>
  조선분류: Array<{
    대분류: string
    우선: string[]
    보조: string[]
    예시: string
    강조: string
  }>
}

interface ExpandedItem {
  별표: string
  구분: string
  조문위치: string
  정식명칭: string
  설명: string
}

let _cache: AnnexCatalog | null = null
let _lookup: Map<string, ExpandedItem> | null = null   // 부모 포함 전체 (룩업 폴백용)
let _enumIds: Set<string> | null = null               // 리프 ID만 (enum 게이팅용)
let _parentToSubs: Map<string, string[]> | null = null // 컨텍스트 출력용

function loadCatalog(): AnnexCatalog {
  if (_cache) return _cache
  const p = path.join(process.cwd(), "lib", "criteria", "annex-catalog.json")
  _cache = JSON.parse(fs.readFileSync(p, "utf-8")) as AnnexCatalog
  return _cache
}

/** 설명 텍스트에서 번호 붙은 호 목록 추출 */
function parseSubItems(desc: string): Array<{ 번호: string; 제목: string; 본문: string }> {
  const result: Array<{ 번호: string; 제목: string; 본문: string }> = []
  for (const line of desc.split("\n")) {
    const m = line.match(/^(\d+)\)\s+(.+)$/)
    if (!m) continue
    const rest = m[2].trim()
    const colonIdx = rest.indexOf(": ")
    if (colonIdx > 0) {
      // "N) 제목: 본문" 형식 (신-12-* 스타일)
      result.push({ 번호: m[1], 제목: rest.slice(0, colonIdx).trim(), 본문: rest.slice(colonIdx + 2).trim() })
    } else {
      // "N) 본문만" 형식 (국-6-아 스타일) — 앞 50자를 식별 명칭으로
      const 제목 = rest.length > 50 ? rest.slice(0, 50) + "…" : rest
      result.push({ 번호: m[1], 제목, 본문: rest })
    }
  }
  return result
}

/** "12.가목" → "12-가", "6.아목" → "6-아" */
function stripMok(조문위치: string): string {
  return 조문위치.replace(/목$/, "").replace(".", "-")
}

function ensureIndexes(): void {
  if (_lookup) return
  const cat = loadCatalog()
  _lookup = new Map()
  _enumIds = new Set()
  _parentToSubs = new Map()

  for (const [id, item] of Object.entries(cat.items)) {
    const desc = item.설명 ?? ""
    const subs = parseSubItems(desc)

    if (subs.length > 0) {
      // 부모는 룩업 폴백으로 보존 (enum 제외)
      _lookup.set(id, { ...item, 설명: desc })

      const baseRef = stripMok(item.조문위치)
      const subIds: string[] = []
      for (const sub of subs) {
        const subId = `${id}-${sub.번호})`
        _lookup.set(subId, {
          별표: item.별표,
          구분: item.구분,
          조문위치: `${baseRef}-${sub.번호})`,
          정식명칭: sub.제목,
          설명: sub.본문,
        })
        _enumIds.add(subId)
        subIds.push(subId)
      }
      _parentToSubs.set(id, subIds)
    } else {
      _lookup.set(id, { ...item, 설명: desc })
      _enumIds.add(id)
    }
  }
}

/** ID → "[별표7의2 6-아-1)] 환경친화적 첨단 선박의 운송ㆍ추진 기술" 형식. 미존재 시 null. */
export function lookupAnnexLabel(id: string): string | null {
  ensureIndexes()
  const item = _lookup!.get(id)
  if (!item) return null
  return `[${item.별표} ${item.조문위치}] ${item.정식명칭}`
}

/** ID → 원문 설명 반환. 호 단위 ID면 해당 호 본문만 반환. */
export function lookupAnnexDescription(id: string): string | null {
  ensureIndexes()
  return _lookup!.get(id)?.설명 ?? null
}

export function getCatalogMeta(): { 출처: string; 개정일: string } {
  const { 출처, 개정일 } = loadCatalog()
  return { 출처, 개정일 }
}

/** AI enum 후보 목록: 리프 ID만 + "해당없음" */
export function enabledAnnexIds(): string[] {
  ensureIndexes()
  return [..._enumIds!, "해당없음"]
}

/** 국가전략기술(별표7의2, "국-" 접두) ID enum 후보 + "해당없음" */
export function nationalStrategyIds(): string[] {
  ensureIndexes()
  return [..._enumIds!].filter((id) => id.startsWith("국-")).concat(["해당없음"])
}

/** 신성장·원천기술(별표7, "신-" 접두) ID enum 후보 + "해당없음" */
export function newGrowthIds(): string[] {
  ensureIndexes()
  return [..._enumIds!].filter((id) => id.startsWith("신-")).concat(["해당없음"])
}

/**
 * 시스템 프롬프트에 주입할 기술 기준 텍스트 생성.
 * - 조선추출: 항목 사전 + 매핑 가이드 (토큰 절약). 호 있는 항목은 호 단위로 나열.
 * - 별표전문: 별표7의2·7 원문 전체 (claude 전용; gemini 요청 시 조선추출로 강등)
 */
export function buildAnnexContext(
  기준범위: "조선추출" | "별표전문",
  engine: "claude" | "gemini"
): string {
  const 범위 = 기준범위 === "별표전문" && engine !== "claude" ? "조선추출" : 기준범위
  const cat = loadCatalog()
  const base = path.join(process.cwd(), "lib", "criteria")

  if (범위 === "별표전문") {
    const 별표7의2 = fs.readFileSync(path.join(base, "별표7의2_전문.txt"), "utf-8")
    const 별표7 = fs.readFileSync(path.join(base, "별표7_전문.txt"), "utf-8")
    return [
      "[별표7의2 전문 — 국가전략기술]",
      별표7의2,
      "",
      "[별표7 전문 — 신성장·원천기술]",
      별표7,
    ].join("\n")
  }

  // 조선추출 모드
  ensureIndexes()
  const entries = Object.entries(cat.items)
  const 국가전략 = entries.filter(([id]) => id.startsWith("국-"))
  const 신성장 = entries.filter(([id]) => id.startsWith("신-"))
  const lines: string[] = [
    "【조선업 관련 세액공제 기술 카탈로그】",
    `출처: ${cat.출처}`,
    `개정일: ${cat.개정일}`,
    "",
    "■ ① 국가전략기술 항목 (별표7의2, 30%+α) — 먼저 검토",
  ]

  const appendItem = (id: string, item: AnnexItem) => {
    const subIds = _parentToSubs!.get(id)
    if (subIds && subIds.length > 0) {
      lines.push(`  ${id}: [${item.별표} ${item.조문위치}] ${item.정식명칭}`)
      for (const subId of subIds) {
        const sub = _lookup!.get(subId)!
        lines.push(`    ${subId}: ${sub.정식명칭}`)
      }
    } else {
      lines.push(`  ${id}: [${item.별표} ${item.조문위치}] ${item.정식명칭}`)
    }
  }

  for (const [id, item] of 국가전략) appendItem(id, item)
  lines.push("", "■ ② 신성장·원천기술 항목 (별표7, 20%+α) — 그다음 검토")
  for (const [id, item] of 신성장) appendItem(id, item)
  lines.push("", "■ 조선 과제 유형별 매핑 가이드")
  for (const row of cat.조선분류) {
    if (!row.대분류) continue
    lines.push(`\n▶ ${row.대분류}`)
    if (row.우선.length) lines.push(`  우선 검토 ID: ${row.우선.join(", ")}`)
    if (row.보조.length) lines.push(`  보조 검토 ID: ${row.보조.join(", ")}`)
    if (row.예시) lines.push(`  예시: ${row.예시}`)
    if (row.강조) lines.push(`  강조: ${row.강조}`)
  }

  return lines.join("\n")
}
