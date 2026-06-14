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

let _cache: AnnexCatalog | null = null

function loadCatalog(): AnnexCatalog {
  if (_cache) return _cache
  const p = path.join(process.cwd(), "lib", "criteria", "annex-catalog.json")
  _cache = JSON.parse(fs.readFileSync(p, "utf-8")) as AnnexCatalog
  return _cache
}

/** ID → "[별표7의2 6.아목] 환경친화적 첨단 선박의 운송ㆍ추진 기술" 형식 반환. 미존재 시 null. */
export function lookupAnnexLabel(id: string): string | null {
  const cat = loadCatalog()
  const item = cat.items[id]
  if (!item) return null
  return `[${item.별표} ${item.조문위치}] ${item.정식명칭}`
}

/** ID → 시행령 원문 설명문 반환. 카탈로그에 설명이 없으면 null. */
export function lookupAnnexDescription(id: string): string | null {
  const cat = loadCatalog()
  return cat.items[id]?.설명 ?? null
}

export function getCatalogMeta(): { 출처: string; 개정일: string } {
  const { 출처, 개정일 } = loadCatalog()
  return { 출처, 개정일 }
}

/** AI enum 후보 목록: 카탈로그 ID + "해당없음" */
export function enabledAnnexIds(): string[] {
  return [...Object.keys(loadCatalog().items), "해당없음"]
}

/** 국가전략기술(별표7의2, "국-" 접두) ID enum 후보 + "해당없음" */
export function nationalStrategyIds(): string[] {
  return [...Object.keys(loadCatalog().items).filter((id) => id.startsWith("국-")), "해당없음"]
}

/** 신성장·원천기술(별표7, "신-" 접두) ID enum 후보 + "해당없음" */
export function newGrowthIds(): string[] {
  return [...Object.keys(loadCatalog().items).filter((id) => id.startsWith("신-")), "해당없음"]
}

/**
 * 시스템 프롬프트에 주입할 기술 기준 텍스트 생성.
 * - 조선추출: 항목 사전 + 매핑 가이드 (토큰 절약)
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
  for (const [id, item] of 국가전략) {
    lines.push(`  ${id}: [${item.별표} ${item.조문위치}] ${item.정식명칭}`)
  }
  lines.push("", "■ ② 신성장·원천기술 항목 (별표7, 20%+α) — 그다음 검토")
  for (const [id, item] of 신성장) {
    lines.push(`  ${id}: [${item.별표} ${item.조문위치}] ${item.정식명칭}`)
  }
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
