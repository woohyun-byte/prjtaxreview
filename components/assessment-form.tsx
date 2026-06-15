"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { AssessmentResult } from "@/components/assessment-result"
import type { AssessmentInput, AssessmentResult as ResultType } from "@/types"

// ── 엔진 설정 ──────────────────────────────────
const ENGINE_CONFIG = {
  gemini: {
    label: "무료 (Gemini)",
    models: [
      { id: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite (무료·권장)" },
      { id: "gemini-2.5-flash", label: "gemini-2.5-flash (무료·고품질)" },
    ],
    keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/apikey",
    keyLinkLabel: "aistudio.google.com",
    storageKey: "gemini_api_key",
  },
  claude: {
    label: "유료 (Claude)",
    models: [
      { id: "claude-sonnet-4-6", label: "Sonnet 4.6 (빠름)" },
      { id: "claude-opus-4-8", label: "Opus 4.8 (고정밀)" },
    ],
    keyPlaceholder: "sk-ant-...",
    keyLink: "https://console.anthropic.com",
    keyLinkLabel: "console.anthropic.com",
    storageKey: "claude_api_key",
  },
} as const

type Engine = keyof typeof ENGINE_CONFIG

const EMPTY: AssessmentInput = {
  과제번호: "",
  과제명: "",
  개발배경: "",
  과제목표: "",
  수행방안: "",
  기대효과: "",
  engine: "gemini",
  model: "gemini-2.5-flash-lite",
  apiKey: "",
  기준범위: "조선추출",
}

export function AssessmentForm() {
  const [form, setForm] = useState<AssessmentInput>(EMPTY)
  const [saveKey, setSaveKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultType | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const engine = form.engine as Engine
  const config = ENGINE_CONFIG[engine]

  // localStorage에서 저장된 키 복원
  useEffect(() => {
    const saved = localStorage.getItem(config.storageKey)
    if (saved) {
      setForm((prev) => ({ ...prev, apiKey: saved }))
      setSaveKey(true)
    } else {
      setForm((prev) => ({ ...prev, apiKey: "" }))
      setSaveKey(false)
    }
  }, [engine, config.storageKey])

  function set(key: keyof AssessmentInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function switchEngine(e: Engine) {
    const defaultModel = ENGINE_CONFIG[e].models[0].id
    setForm((prev) => ({
      ...prev,
      engine: e,
      model: defaultModel,
      기준범위: e === "gemini" ? "조선추출" : prev.기준범위,
    }))
    setResult(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.과제명.trim() || !form.개발배경.trim() || !form.과제목표.trim() || !form.수행방안.trim()) {
      toast.error("과제명, 개발 배경, 과제 목표, 수행 방안은 필수 입력 항목입니다.")
      return
    }

    // localStorage 키 저장/삭제
    if (saveKey && form.apiKey?.trim()) {
      localStorage.setItem(config.storageKey, form.apiKey.trim())
    } else {
      localStorage.removeItem(config.storageKey)
    }

    const payload: AssessmentInput = {
      ...form,
      기대효과: form.기대효과.trim() || "(미입력)",
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "판정 중 오류가 발생했습니다.", { duration: 8000 })
        return
      }
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    } catch {
      toast.error("서버와 통신 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              과제 정보 입력
              <Badge variant="outline" className="text-xs font-normal">필수 4항목</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* ── 필수 항목 ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">필수 항목</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="과제번호">
                    과제번호 <span className="text-xs text-muted-foreground">(선택 — 미입력 시 NEW-001)</span>
                  </Label>
                  <Input id="과제번호" placeholder="예: P006" value={form.과제번호} onChange={(e) => set("과제번호", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="과제명">연구 제목 (과제명) <span className="text-red-500">*</span></Label>
                  <Input id="과제명" placeholder="예: LNG 화물창 극저온 단열 적층설계 기술 개발" value={form.과제명} onChange={(e) => set("과제명", e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="개발배경">개발배경 및 목적 <span className="text-red-500">*</span></Label>
                <Textarea id="개발배경" rows={3} placeholder="기존 기술의 한계, 시장 필요, 규제 변화 등 개발을 착수하게 된 배경을 입력하세요." value={form.개발배경} onChange={(e) => set("개발배경", e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="과제목표">개발목표(세부목표) <span className="text-red-500">*</span></Label>
                <Textarea id="과제목표" rows={4} placeholder={"최종 목표와 세부 목표를 입력하세요.\n예:\n(1) 극저온(-163℃) 환경에서 열침투율 0.07%/day 이하 단열 설계\n(2) 신소재 적층 공법 시험·검증"} value={form.과제목표} onChange={(e) => set("과제목표", e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="수행방안">주요개발항목 및 개발목표수준 <span className="text-red-500">*</span></Label>
                <Textarea id="수행방안" rows={4} placeholder="개발 방법론, 실험/시험 계획, 시뮬레이션 방식, 외부 기관 협력 계획 등을 입력하세요." value={form.수행방안} onChange={(e) => set("수행방안", e.target.value)} required />
              </div>
            </div>

            <Separator />

            {/* ── 선택 항목 ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                선택 항목 <span className="font-normal normal-case">(기술 부합도 판단에 참고)</span>
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="기대효과">개발효과</Label>
                <Textarea id="기대효과" rows={2} placeholder="예: 단열 성능 20% 향상, 특허 출원 2건, 양산기술 이전" value={form.기대효과} onChange={(e) => set("기대효과", e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* ── 엔진 설정 ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">판정 엔진 설정</p>

              {/* 엔진 선택 */}
              <div className="space-y-1.5">
                <Label>엔진 선택</Label>
                <div className="flex gap-2">
                  {(["gemini", "claude"] as Engine[]).map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => switchEngine(e)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        engine === e
                          ? "border-ring bg-muted font-semibold"
                          : "border-input hover:bg-muted/50"
                      }`}
                    >
                      {ENGINE_CONFIG[e].label}
                    </button>
                  ))}
                </div>
                {engine === "gemini" && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ 신용카드 없이 무료 사용 가능 — 키 발급:{" "}
                    <a href={config.keyLink} target="_blank" rel="noopener noreferrer" className="underline">
                      {config.keyLinkLabel}
                    </a>
                  </p>
                )}
                {engine === "claude" && (
                  <p className="text-xs text-muted-foreground">
                    크레딧 충전 필요 — 키 발급:{" "}
                    <a href={config.keyLink} target="_blank" rel="noopener noreferrer" className="underline">
                      {config.keyLinkLabel}
                    </a>
                  </p>
                )}
              </div>

              {/* 모델 선택 */}
              <div className="space-y-1.5">
                <Label>모델</Label>
                <div className="flex flex-wrap gap-2">
                  {config.models.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set("model", id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        form.model === id
                          ? "border-ring bg-muted font-semibold"
                          : "border-input hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 판정 기준 데이터 */}
              <div className="space-y-1.5">
                <Label>판정 기준 데이터</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set("기준범위", "조선추출")}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      form.기준범위 !== "별표전문"
                        ? "border-ring bg-muted font-semibold"
                        : "border-input hover:bg-muted/50"
                    }`}
                  >
                    조선 관련 항목만 (권장)
                  </button>
                  <button
                    type="button"
                    disabled={engine === "gemini"}
                    onClick={() => set("기준범위", "별표전문")}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      form.기준범위 === "별표전문"
                        ? "border-ring bg-muted font-semibold"
                        : "border-input hover:bg-muted/50"
                    }`}
                  >
                    별표 전문 (유료 전용)
                  </button>
                </div>
                {engine === "gemini" && (
                  <p className="text-xs text-muted-foreground">
                    별표 전문은 Claude(유료) 전용입니다.
                  </p>
                )}
              </div>

              {/* API 키 입력 */}
              <div className="space-y-1.5">
                <Label htmlFor="apiKey">
                  API 키{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (직접 입력 — 키는 서버에 저장되지 않습니다)
                  </span>
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={config.keyPlaceholder}
                  value={form.apiKey ?? ""}
                  onChange={(e) => set("apiKey", e.target.value)}
                  autoComplete="off"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveKey"
                    checked={saveKey}
                    onChange={(e) => setSaveKey(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <label htmlFor="saveKey" className="text-xs text-muted-foreground cursor-pointer">
                    이 브라우저에 키 저장 (localStorage — 공용 PC에서는 사용 금지)
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── 제출 ── */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} size="lg">
                {loading ? "판정 중…" : "기술 부합도 판정 시작"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ── 로딩 ── */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <p className="text-center text-sm text-muted-foreground">
            {engine === "gemini" ? "Gemini" : "Claude"}가 별표7/7의2 기준으로 기술 부합도를 검토 중입니다…
          </p>
        </div>
      )}

      {/* ── 결과 ── */}
      {result && !loading && (
        <div ref={resultRef}>
          <Separator className="my-4" />
          <h2 className="mb-4 text-lg font-semibold">판정 결과</h2>
          <AssessmentResult
            result={result}
            input={{ 과제번호: form.과제번호 }}
            onUseTitle={(t) => set("과제명", t)}
          />
        </div>
      )}
    </div>
  )
}
