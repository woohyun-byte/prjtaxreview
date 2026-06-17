/** 네비게이션 링크 항목 */
export interface NavItem {
  title: string
  href: string
  disabled?: boolean
  external?: boolean
  label?: string
}

// ──────────────────────────────────────────────
// 세액공제 대상기술 부합도 판정 결과 타입
// ──────────────────────────────────────────────

export interface 매핑항목 {
  매핑항목ID: string
  매핑항목명: string
  기술의설명?: string  // 서버 후처리로 카탈로그 원문 주입 — AI 스키마 외부
  적합도: "상" | "중" | "하"
  정량요건: "충족" | "미충족" | "확인필요" | "해당없음"
  판정근거: string
}

export interface 보완사항항목 {
  항목: string
  현재문제: string
  구체적_개선안: string
}

export interface 제목진단 {
  오해소지: "있음" | "없음"
  사유: string
  대체제목추천: string[]
}

// ── 연구개발 부합도 검토 (활동 적격성 4단계 분류) ──
export type 부합도분류 =
  | "연구개발활동"
  | "연구개발 부합도가 높은 활동"
  | "연구개발 부합도가 낮은 활동"
  | "비연구개발활동"

export type 기준판정 = "충족" | "부분충족" | "미충족" | "확인필요"

export interface 기준항목평가 {
  평가: 기준판정
  근거: string
}

export interface 다섯기준평가 {
  신규성: 기준항목평가
  창의성: 기준항목평가
  불확실성: 기준항목평가
  체계성: 기준항목평가
  재현가능성: 기준항목평가
}

export interface 연구개발부합도검토 {
  분류: 부합도분류
  판단근거: string
  "5대기준평가": 다섯기준평가
  핵심포인트: string[]
  경고요소: string[]
}

export interface AssessmentResult {
  과제명: string
  /** 별표7의2 국가전략기술(30%+α) 부합 항목 — 먼저 검토 */
  국가전략매핑: 매핑항목[]
  /** 별표7 신성장·원천기술(20%+α) 부합 항목 — 그다음 검토 */
  신성장매핑: 매핑항목[]
  적용공제율: string
  종합판정: "적합(유력)" | "조건부" | "부적합(유력)" | "확인필요"
  판단사유: string
  /** 연구개발활동 4단계 분류 의견 — 평가기준.md(v1.2) 기반 자가진단 */
  연구개발부합도검토: 연구개발부합도검토
  제목진단: 제목진단
  보완사항: 보완사항항목[]
  확인필요항목: string[]
  _기준메타?: { 출처: string; 개정일: string }
}

export interface AssessmentInput {
  과제번호: string
  과제명: string
  개발배경: string
  과제목표: string
  수행방안: string
  기대효과: string
  engine: "claude" | "gemini" | "bedrock" // bedrock = HD현대 LLM Gateway (IAM Role 자동인증, 사용자 키 불요)
  model: string
  apiKey?: string
  기준범위?: "조선추출" | "별표전문"
}
