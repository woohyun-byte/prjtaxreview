"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type {
  AssessmentResult,
  AssessmentInput,
  매핑항목,
  부합도분류,
  기준판정,
  연구개발부합도검토,
} from "@/types"

interface Props {
  result: AssessmentResult
  input: Pick<AssessmentInput, "과제번호">
  onUseTitle?: (title: string) => void
}

// ── 색상 헬퍼 ──────────────────────────────────
function 적합도색(v: string) {
  if (v === "상") return "text-green-600 dark:text-green-400 font-semibold"
  if (v === "하") return "text-red-600 dark:text-red-400 font-semibold"
  if (v === "중") return "text-amber-600 dark:text-amber-400 font-semibold"
  return "text-muted-foreground font-semibold"
}

function 종합배지(v: string) {
  if (v === "적합(유력)") return <Badge className="bg-green-600 text-white hover:bg-green-700">{v}</Badge>
  if (v === "조건부") return <Badge className="bg-amber-500 text-white hover:bg-amber-600">{v}</Badge>
  if (v === "부적합(유력)") return <Badge variant="destructive">{v}</Badge>
  return <Badge variant="outline">{v}</Badge>
}

// ── 연구개발 부합도 분류 → 배지 + 라벨 ──
function 부합도배지(v: 부합도분류) {
  const cfg: Record<부합도분류, { cls: string; emoji: string }> = {
    "연구개발활동": { cls: "bg-green-600 text-white hover:bg-green-700", emoji: "✅" },
    "연구개발 부합도가 높은 활동": { cls: "bg-blue-600 text-white hover:bg-blue-700", emoji: "🔵" },
    "연구개발 부합도가 낮은 활동": { cls: "bg-amber-500 text-white hover:bg-amber-600", emoji: "🟢" },
    "비연구개발활동": { cls: "bg-zinc-500 text-white hover:bg-zinc-600", emoji: "⚪" },
  }
  const c = cfg[v] ?? { cls: "bg-zinc-400 text-white", emoji: "·" }
  return <Badge className={c.cls}>{c.emoji} {v}</Badge>
}

function 기준색(v: 기준판정) {
  if (v === "충족") return "text-green-600 dark:text-green-400 font-semibold"
  if (v === "부분충족") return "text-amber-600 dark:text-amber-400 font-semibold"
  if (v === "미충족") return "text-red-600 dark:text-red-400 font-semibold"
  return "text-muted-foreground"
}

// ── CSV 생성 ─────────────────────────────────────
function buildCsv(result: AssessmentResult, 과제번호: string): string {
  const cols = ["과제번호", "과제명", "구분", "매핑항목ID", "매핑항목명", "기술의설명", "적합도", "적용공제율", "종합판정", "연구개발부합도분류", "5대기준_충족수", "판정근거", "비고"]
  const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`
  const 비고 = result.확인필요항목.join("; ")
  const 부합도 = result.연구개발부합도검토
  const 부합도분류값 = 부합도?.분류 ?? ""
  const 기준 = 부합도?.["5대기준평가"]
  const 충족수 = 기준
    ? [기준.신규성, 기준.창의성, 기준.불확실성, 기준.체계성, 기준.재현가능성]
        .filter((k) => k?.평가 === "충족").length
    : 0
  const 충족표시 = 기준 ? `${충족수}/5` : ""

  const toRow = (m: 매핑항목, 구분: string) =>
    [
      과제번호 || "NEW-001",
      result.과제명,
      구분,
      m.매핑항목ID,
      m.매핑항목명,
      m.기술의설명 ?? "",
      m.적합도,
      result.적용공제율,
      result.종합판정,
      부합도분류값,
      충족표시,
      m.판정근거,
      비고,
    ]
      .map(escape)
      .join(",")

  const 국가전략rows = (result.국가전략매핑 ?? []).map((m) => toRow(m, "국가전략(별표7의2 30%)"))
  const 신성장rows = (result.신성장매핑 ?? []).map((m) => toRow(m, "신성장(별표7 20%)"))
  const rows = [...국가전략rows, ...신성장rows]

  if (rows.length === 0) {
    rows.push(
      [
        과제번호 || "NEW-001",
        result.과제명,
        "해당없음",
        "-",
        "해당없음",
        "",
        "하",
        result.적용공제율,
        result.종합판정,
        부합도분류값,
        충족표시,
        result.판단사유,
        비고,
      ]
        .map(escape)
        .join(",")
    )
  }

  return "﻿" + cols.join(",") + "\n" + rows.join("\n")
}

// ── MD 생성 ──────────────────────────────────────
function buildMd(result: AssessmentResult, 과제번호: string): string {
  const r = result

  const toTableRows = (items: 매핑항목[]) =>
    items.length > 0
      ? items
          .map((m) => `| ${m.매핑항목ID} | ${m.매핑항목명} | ${(m.기술의설명 ?? "").replace(/\n/g, " ")} | ${m.적합도} | ${m.판정근거} |`)
          .join("\n")
      : "| — | 부합 항목 없음 | — | — | — |"

  const 국가전략표 = [
    "| 항목ID | 항목명 | 기술의설명 | 적합도 | 판정근거 |",
    "|---|---|---|---|---|",
    toTableRows(r.국가전략매핑 ?? []),
  ].join("\n")

  const 신성장표 = [
    "| 항목ID | 항목명 | 기술의설명 | 적합도 | 판정근거 |",
    "|---|---|---|---|---|",
    toTableRows(r.신성장매핑 ?? []),
  ].join("\n")

  // ③ 연구개발 부합도 검토 섹션
  const 부합도 = r.연구개발부합도검토
  let 부합도섹션 = ""
  if (부합도) {
    const k = 부합도["5대기준평가"]
    const 기준표 = k
      ? [
          "| 기준 | 평가 | 근거 |",
          "|---|---|---|",
          `| 신규성 | ${k.신규성?.평가 ?? "-"} | ${(k.신규성?.근거 ?? "").replace(/\n/g, " ")} |`,
          `| 창의성 | ${k.창의성?.평가 ?? "-"} | ${(k.창의성?.근거 ?? "").replace(/\n/g, " ")} |`,
          `| 불확실성 | ${k.불확실성?.평가 ?? "-"} | ${(k.불확실성?.근거 ?? "").replace(/\n/g, " ")} |`,
          `| 체계성 | ${k.체계성?.평가 ?? "-"} | ${(k.체계성?.근거 ?? "").replace(/\n/g, " ")} |`,
          `| 재현가능성 | ${k.재현가능성?.평가 ?? "-"} | ${(k.재현가능성?.근거 ?? "").replace(/\n/g, " ")} |`,
        ].join("\n")
      : "(5대기준 평가 없음)"
    const 핵심 = (부합도.핵심포인트 ?? []).map((p) => `- ${p}`).join("\n") || "- (없음)"
    const 경고 = (부합도.경고요소 ?? []).length
      ? (부합도.경고요소 ?? []).map((p) => `- ⚠️ ${p}`).join("\n")
      : "- (없음)"
    부합도섹션 = `\n### ③ 연구개발 부합도 검토 (자가진단)
- **분류**: ${부합도.분류}
- **판단근거**: ${부합도.판단근거}

#### 5대 판단기준
${기준표}

#### 핵심 포인트
${핵심}

#### 경고 요소
${경고}
`
  }

  return `## [${r.과제명}] 세액공제 대상기술 부합도 판정 결과
> ⚠️ 1차 초안 — 기술심의위원회·국세청 사전심사·세무 전문가 검토로 확정 필요. 단정 아님.
> 연구개발 부합도 검토는 「기업 연구개발활동 가이드라인」(KOITA) 기반 자가진단입니다. 공통·필수요건(연구소 신고·인력 전담·설비 용도)은 별도 확인이 필요합니다.

### 과제 정보 요약
- 과제번호: ${과제번호 || "미입력"}
- 과제명: ${r.과제명}
- 종합판정: **${r.종합판정}**
- 적용공제율: ${r.적용공제율}

### 판단 사유
${r.판단사유}

### ① 국가전략기술 부합도 (별표7의2, 30%+α)
${국가전략표}

### ② 신성장·원천기술 부합도 (별표7, 20%+α)
${신성장표}
${부합도섹션}
### 제목 진단
- 오해소지: ${r.제목진단.오해소지}
${r.제목진단.오해소지 === "있음" ? `- 사유: ${r.제목진단.사유}\n- 대체 제목 추천:\n${r.제목진단.대체제목추천.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}` : ""}

### 보완사항
${r.보완사항.map((b, i) => `**${i + 1}. ${b.항목}**\n- 현재 문제: ${b.현재문제}\n- 개선안: ${b.구체적_개선안}`).join("\n\n")}

### 확인 필요 항목
${r.확인필요항목.map((v) => `- ${v}`).join("\n") || "없음"}
`
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── 연구개발 부합도 검토 카드 ──────────────────
function 부합도카드({ 검토 }: { 검토: 연구개발부합도검토 }) {
  const 기준 = 검토["5대기준평가"]
  const 행: Array<[string, 기준판정, string]> = 기준
    ? [
        ["신규성", 기준.신규성?.평가, 기준.신규성?.근거 ?? ""],
        ["창의성", 기준.창의성?.평가, 기준.창의성?.근거 ?? ""],
        ["불확실성", 기준.불확실성?.평가, 기준.불확실성?.근거 ?? ""],
        ["체계성", 기준.체계성?.평가, 기준.체계성?.근거 ?? ""],
        ["재현가능성", 기준.재현가능성?.평가, 기준.재현가능성?.근거 ?? ""],
      ]
    : []
  const 핵심 = 검토.핵심포인트 ?? []
  const 경고 = 검토.경고요소 ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span>연구개발 부합도 검토</span>
          {부합도배지(검토.분류)}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            평가기준.md(v1.2) 기반 자가진단
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/90">{검토.판단근거}</p>

        {행.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-1.5 px-3 text-left font-medium text-muted-foreground whitespace-nowrap">기준</th>
                  <th className="py-1.5 px-3 text-left font-medium text-muted-foreground whitespace-nowrap">평가</th>
                  <th className="py-1.5 px-3 text-left font-medium text-muted-foreground">근거</th>
                </tr>
              </thead>
              <tbody>
                {행.map(([이름, 평가, 근거], i) => (
                  <tr key={i} className="border-b last:border-0 align-top">
                    <td className="py-2 px-3 text-xs whitespace-nowrap font-medium">{이름}</td>
                    <td className={`py-2 px-3 text-xs whitespace-nowrap ${기준색(평가)}`}>{평가 ?? "-"}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground leading-snug">{근거}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {핵심.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">핵심 포인트</p>
            <ul className="space-y-1 text-sm">
              {핵심.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {경고.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
            <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">⚠️ 경고 요소</p>
            <ul className="space-y-1">
              {경고.map((p, i) => (
                <li key={i} className="flex gap-2 text-amber-800 dark:text-amber-200">
                  <span>•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 매핑 테이블 ──────────────────────────────────
function MappingTable({ items }: { items: 매핑항목[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        부합 항목 없음
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-2 text-left font-medium text-muted-foreground whitespace-nowrap">항목ID</th>
            <th className="py-1 pr-3 text-left font-medium text-muted-foreground whitespace-nowrap">항목명</th>
            <th className="py-1 pr-3 text-left font-medium text-muted-foreground">기술의설명</th>
            <th className="py-1 pr-2 text-left font-medium text-muted-foreground whitespace-nowrap">적합도</th>
            <th className="py-1 text-left font-medium text-muted-foreground">판정근거</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={i} className="border-b last:border-0 align-top">
              <td className="py-2 pr-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{m.매핑항목ID}</td>
              <td className="py-2 pr-3 text-xs leading-snug max-w-[12rem]">{m.매핑항목명}</td>
              <td className="py-2 pr-3 text-xs text-muted-foreground leading-snug max-w-[26rem] whitespace-pre-wrap">{m.기술의설명 ?? ""}</td>
              <td className={`py-2 pr-2 text-xs whitespace-nowrap ${적합도색(m.적합도)}`}>{m.적합도}</td>
              <td className="py-2 text-xs text-muted-foreground leading-snug">{m.판정근거}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────
export function AssessmentResult({ result: r, input, onUseTitle }: Props) {
  const 과제번호 = input.과제번호 || "NEW-001"
  const 국가전략 = r.국가전략매핑 ?? []
  const 신성장 = r.신성장매핑 ?? []

  return (
    <div className="space-y-4">
      {/* 면책 배너 */}
      <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <p>⚠️ <strong>1차 초안</strong> — 기술심의위원회·국세청 사전심사·세무 전문가 검토로 확정 필요. 단정 아님.</p>
        <p className="text-xs">
          연구개발 부합도 검토는 「기업 연구개발활동 가이드라인」(KOITA) 기반 자가진단입니다. 공통·필수요건(연구소 신고·인력 전담·설비 용도)은 별도 확인이 필요합니다.
        </p>
      </div>

      {/* 요약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">판정 요약</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">종합판정</p>
            {종합배지(r.종합판정)}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">적용공제율</p>
            <Badge variant="outline">{r.적용공제율}</Badge>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => download(buildCsv(r, 과제번호), `기술부합도_${r.과제명}.csv`, "text/csv;charset=utf-8")}
            >
              CSV 다운로드
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => download(buildMd(r, 과제번호), `기술부합도_${r.과제명}.md`, "text/markdown;charset=utf-8")}
            >
              MD 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 판단 사유 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">종합 판단 사유</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{r.판단사유}</p>
        </CardContent>
      </Card>

      {/* 연구개발 부합도 검토 (4단계 분류) */}
      {r.연구개발부합도검토 && <부합도카드 검토={r.연구개발부합도검토} />}

      {/* 제목 진단 (오해소지 있을 때) */}
      {r.제목진단.오해소지 === "있음" && (
        <Card className="border-orange-300 dark:border-orange-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-700 dark:text-orange-400">
              ⚠️ 과제 제목 진단 — R&D 성격 가려질 위험
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{r.제목진단.사유}</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400">대체 제목 추천 (클릭 시 복사)</p>
              {r.제목진단.대체제목추천.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1 text-xs text-muted-foreground">{i + 1}.</span>
                  <button
                    className="flex-1 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-left text-sm hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
                    onClick={() => {
                      navigator.clipboard.writeText(t)
                      onUseTitle?.(t)
                    }}
                  >
                    {t}
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ① 국가전략기술 매핑 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>
              <Badge className="mr-2 bg-blue-600 text-white hover:bg-blue-700">①</Badge>
              국가전략기술 부합도
              <span className="ml-2 text-xs font-normal text-muted-foreground">(별표7의2, 30%+α)</span>
            </span>
            {r._기준메타 && (
              <span className="text-xs font-normal text-muted-foreground">
                개정 {r._기준메타.개정일}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MappingTable items={국가전략} />
        </CardContent>
      </Card>

      {/* ② 신성장·원천기술 매핑 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base">
            <Badge className="mr-2 bg-purple-600 text-white hover:bg-purple-700">②</Badge>
            신성장·원천기술 부합도
            <span className="ml-2 text-xs font-normal text-muted-foreground">(별표7, 20%+α)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MappingTable items={신성장} />
        </CardContent>
      </Card>

      {/* 보완사항 */}
      {r.보완사항.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">보완사항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.보완사항.map((b, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <p className="font-semibold">{i + 1}. {b.항목}</p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">현재 문제:</span> {b.현재문제}
                </p>
                <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-foreground">
                  <span className="font-medium">개선안:</span> {b.구체적_개선안}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 확인 필요 항목 */}
      {r.확인필요항목.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-700 dark:text-amber-400">확인 필요 항목</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {r.확인필요항목.map((v, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span className="text-muted-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-center text-xs text-muted-foreground">
        본 판정은 1차 초안이며 법적 효력이 없습니다. 최종 판단은 기술심의위원회·국세청 사전심사·세무 전문가 확인 후 결정하십시오.
      </p>
    </div>
  )
}
