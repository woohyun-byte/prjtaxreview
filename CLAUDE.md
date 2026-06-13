# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 프로젝트 정체성

이 앱은 제네릭 Next.js 스타터가 **아니다**. 조세특례제한법 제10조에 따른 조선산업 대기업 R&D **세액공제
대상기술 부합도 판정 도구**다.

평가 범위 = **기술 부합도 전용**: 별표7의2(국가전략 30%+α)를 먼저 검토한 뒤, 별표7(신성장 20%+α)를 검토.
연구개발활동 적격성 평가(STEP1~7: 공통요건·제외활동·5대기준 등)는 의도적으로 제거됐다 — 추후 별도 도구로 분리 예정.

상위 도메인 규칙·법령 컨텍스트(조문 인용·과제 현황·핵심 규칙)는 부모 디렉터리 `../CLAUDE.md`에 있다.

---

## Commands

```bash
npm run dev      # 개발 서버 — 3000 점유 시 3001→3002 순으로 자동 증가
npm run build    # next build + TypeScript 검사 (빌드 통과 = 타입 0오류)
npm run start    # 프로덕션 서버 (build 후)
npm run lint     # ESLint 검사
```

**테스트 러너 없음** — `playwright`가 devDependency에 존재하지만 test 스크립트가 없다. 변경 후 검증은
`npm run build`(타입) + `npm run dev`(브라우저 수동) 조합으로 한다.

**데이터 스냅샷 재생성** (별표 카탈로그 갱신이 필요할 때만):
```bash
node scripts/build-annex-catalog.mjs ["소스폴더"]
# 기본 소스: G:\내 드라이브\01_업무\01_세액공제\세액공제 시행령\20260401
# → lib/criteria/annex-catalog.json + 별표7_전문.txt + 별표7의2_전문.txt 갱신
```
시행령 별표가 개정될 때만 실행한다. 평상시엔 커밋된 스냅샷을 그대로 사용하고 파일을 손수정하지 않는다.

---

## 이중 엔진 판정 파이프라인

```
components/assessment-form.tsx   (UI 입력)
        ↓  POST /api/assess
app/api/assess/route.ts          (키 해석: body.apiKey > env, 필수항목 검증)
        ↓
lib/assess.ts  assess()          (엔진 디스패처)
   ├─ Claude  → tool_use + 프롬프트 캐싱 (system 블록에 cache_control)
   └─ Gemini  → responseSchema JSON 모드
        ↓  postProcessResult()
components/assessment-result.tsx (국가전략 / 신성장 2섹션 표시)
```

**단일 스키마 공유**: `RESULT_SCHEMA` + `buildResultSchemaWithEnum()` (카탈로그 ID enum 주입) 하나로
양 엔진을 커버한다. Claude는 그대로 `tool.input_schema`로 전달하고, Gemini는 `toGeminiSchema()` 재귀
변환기를 거쳐 `responseSchema`로 변환된다. **결과 필드를 추가·제거할 때 이 한 곳만 수정하면 양 엔진에 동시 반영된다.**

`friendlyError()`가 크레딧 부족·잘못된 키·레이트리밋 오류를 사용자 친화 메시지로 변환한다.

---

## 별표 카탈로그 시스템

`lib/criteria/annex-catalog.json` = 별표7·7의2 시행령 원문을 사전 추출한 **읽기 전용 스냅샷**. 손수정 금지.

`lib/annex.ts`가 단일 진입점으로 제공하는 함수:

| 함수 | 역할 |
|---|---|
| `lookupAnnexLabel(id)` | ID → `[별표7의2 6.아목] 환경친화적 첨단 선박의 운송ㆍ추진 기술` 원문 반환 |
| `nationalStrategyIds()` | `국-` 접두 ID 목록 + `"해당없음"` — 국가전략매핑 배열 enum 후보 |
| `newGrowthIds()` | `신-` 접두 ID 목록 + `"해당없음"` — 신성장매핑 배열 enum 후보 |
| `buildAnnexContext(기준범위, engine)` | 시스템 프롬프트 주입용 카탈로그 텍스트 생성 |
| `getCatalogMeta()` | `{ 출처, 개정일 }` 메타 반환 |

**ID 규칙 — 반드시 구분, 절대 혼용 금지**:
- `국-N-목` = 별표7의2 **국가전략기술** (30%+α)
- `신-N-목-호` = 별표7 **신성장·원천기술** (20%+α)

**enum 게이팅**: `buildResultSchemaWithEnum()`이 국가전략매핑 배열엔 `nationalStrategyIds()` enum만,
신성장매핑 배열엔 `newGrowthIds()` enum만 주입한다 — AI가 배열을 잘못 채우는 것을 스키마 수준에서 차단.

**서버 후처리 신뢰 경계**: `postProcessResult()`가 AI 반환 `매핑항목명`을 카탈로그 원문으로 **덮어쓴다**.
UI에 표시되는 항목명은 AI 출력이 아니라 항상 시행령 원문이다.

**기준범위 2모드**:
- `"조선추출"` — 기본, 양 엔진 지원, 큐레이션된 조선 관련 항목만 주입(토큰 절약)
- `"별표전문"` — Claude 전용, 별표7·7의2 전문 주입. Gemini 요청 시 자동으로 `"조선추출"`로 강등.

---

## lib/criteria 데이터 파일 역할

| 파일 | 역할 |
|---|---|
| `PRD.md` | `assess.ts` 시스템 프롬프트에 주입 (업무 지침) |
| `annex-catalog.json` | 항상 로드 — 카탈로그 단일 소스 |
| `별표7의2_전문.txt` | `별표전문` 모드에서만 로드 |
| `별표7_전문.txt` | `별표전문` 모드에서만 로드 |
| `평가기준.md` | 현재 `assess.ts`가 로드하지 않음 (레거시·읽기 전용) |
| `기술참조표.md` | 현재 `assess.ts`가 로드하지 않음 (레거시·읽기 전용) |

`평가기준.md`·`기술참조표.md`는 참조 문서로만 보존한다 — 수정 금지.

---

## 컨벤션 / 제약

**한글 식별자**: 인터페이스·필드·함수 상당수가 한글(`매핑항목`, `국가전략매핑`, `종합판정`, `buildUserMessage` 내 템플릿 등). 기존 패턴을 유지한다.

**API 키**: 서버 사이드 전용 — 라우트 핸들러가 `body.apiKey` 또는 env를 병합한 뒤 `assess()`에만 전달. 클라이언트에서 직접 AI API를 호출하지 않는다. 하드코딩 금지. `.env*` 파일은 `.gitignore`에 포함.

**면책 배너**: "1차 초안 — 기술심의위원회·국세청 사전심사·전문가 검토 필요"를 결과 화면(`assessment-result.tsx`)과 다운로드물(`buildCsv`, `buildMd`)에 항상 유지한다.

**불확실성 처리**: 분류가 불명확하면 단정하지 말고 `확인필요`로 표기. `근거 없이 "적합도 상"·"공제 가능" 단정 금지`는 상위 CLAUDE.md 규칙이기도 하다.

---

## 스택 특성

**Next.js 16 / React 19** — `node_modules/next/dist/docs/` 확인 필수. `params`/`searchParams`는 `Promise`로 래핑돼 `await` 필요.

**Tailwind v4** — `tailwind.config.js` 없음. 테마는 `app/globals.css`의 `@theme inline` 블록에서 CSS 변수로 관리.

**shadcn (radix-nova)** — 통합 `radix-ui` 패키지 사용 (개별 `@radix-ui/*` 아님). 컴포넌트 추가: `npx shadcn@latest add <name>`.

**lucide-react v1.18** — `Github` 아이콘 없음. 아이콘 이름 불확실 시 빌드로 확인.

**경로 별칭**: `@/*` = 프로젝트 루트 (`tsconfig.json` paths).

**설정 단일 소스**: `lib/site.ts`의 `siteConfig` — 사이트 이름·설명·네비게이션 링크.

**환경변수 접근**: `lib/env.ts`의 `getEnv(key)` / `getOptionalEnv(key)` 헬퍼 사용.
