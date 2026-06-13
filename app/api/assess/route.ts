import { NextRequest, NextResponse } from "next/server"
import { assess } from "@/lib/assess"
import { getOptionalEnv } from "@/lib/env"
import type { AssessmentInput } from "@/types"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  let input: AssessmentInput
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const engine = input.engine ?? "gemini"

  // 키 우선순위: body.apiKey > 환경변수
  const envKey =
    engine === "claude"
      ? getOptionalEnv("ANTHROPIC_API_KEY")
      : getOptionalEnv("GEMINI_API_KEY")

  const apiKey = (input.apiKey?.trim() || "") || envKey || ""

  if (!apiKey) {
    const guide =
      engine === "claude"
        ? "ANTHROPIC_API_KEY를 .env.local에 설정하거나 화면 키 입력란에 입력하세요. 키 발급: console.anthropic.com"
        : "GEMINI_API_KEY를 .env.local에 설정하거나 화면 키 입력란에 입력하세요. 무료 키 발급: aistudio.google.com"
    return NextResponse.json({ error: `API 키가 없습니다. ${guide}` }, { status: 400 })
  }

  if (!input.과제명?.trim()) {
    return NextResponse.json({ error: "과제명은 필수 입력 항목입니다." }, { status: 400 })
  }
  if (!input.개발배경?.trim() || !input.과제목표?.trim() || !input.수행방안?.trim()) {
    return NextResponse.json(
      { error: "필수 항목(개발 배경, 과제 목표, 수행 방안)을 모두 입력해 주세요." },
      { status: 400 }
    )
  }

  try {
    const result = await assess(input, apiKey)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
