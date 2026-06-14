# 조선 R&D 세액공제 — 대상기술 부합도 판정 도구

> ⚠️ **1차 초안** — 본 결과는 참고용이며 법적 효력이 없습니다. 최종 판단은 **기술심의위원회 사전확인(시행령 제9조⑮)·국세청 사전심사(시행령 제9조⑰)·세무 전문가 검토** 후 결정하십시오.

조세특례제한법 제10조 조선산업 **대기업** R&D 세액공제 신청을 위한 **대상기술 부합도 1차 판정** 웹앱.

과제 설명(개발 배경·목표·수행방안)을 입력하면 AI가 시행령 별표 기준으로 해당 기술 항목을 매핑하고 종합 판정을 반환합니다.

- ① **별표7의2 (국가전략기술, 30%+α)** 먼저 검토
- ② **별표7 (신성장·원천기술, 20%+α)** 검토
- 연구개발활동 적격성 평가(STEP1~7)는 이 도구의 범위에 포함되지 않습니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **이중 엔진** | 무료 Gemini(gemini-2.5-flash-lite/flash) 또는 유료 Claude(Sonnet 4.6/Opus 4.8) 선택 |
| **과제 입력** | 과제명·개발배경·과제목표·수행방안 4개 필수 + 기대효과 선택 |
| **2섹션 매핑 결과** | 국가전략(별표7의2) / 신성장(별표7) 각 매핑 항목·적합도·정량요건·판정근거 |
| **종합판정** | 적합(유력) / 조건부 / 부적합(유력) / 확인필요 |
| **제목 진단** | 과제명이 R&D 성격을 가리는지 진단 + 대체 제목 추천 |
| **보완사항·확인필요항목** | 심사 전 보완해야 할 항목 목록 |
| **CSV/MD 다운로드** | 판정 결과 파일 저장 |
| **기준범위 선택** | 조선 관련 항목만(양 엔진) / 별표 전문(Claude 전용) |
| **API 키 입력** | UI 키 입력란 또는 `.env.local` 설정 — 서버 사이드 전용 처리 |

---

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local을 열어 사용할 엔진의 API 키를 입력하세요
```

**또는** API 키를 `.env.local` 없이 UI의 "API 키 입력란"에 직접 입력해도 됩니다.

```bash
# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

---

## 환경변수

`.env.example`을 복사해 `.env.local`로 사용하세요. 둘 중 하나만 있으면 됩니다.

| 변수 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini 사용 시 | [aistudio.google.com](https://aistudio.google.com/apikey) — 신용카드 없이 무료 발급 |
| `ANTHROPIC_API_KEY` | Claude 사용 시 | [console.anthropic.com](https://console.anthropic.com) — 크레딧 충전 필요 |
| `NEXT_PUBLIC_SITE_URL` | 배포 시 권장 | 사이트 배포 URL (OG 이미지 base URL) |

> API 키는 서버 사이드(`/api/assess`)에서만 처리됩니다. 클라이언트에 노출되지 않습니다.  
> `.env*` 파일은 `.gitignore`에 포함되어 있습니다.

---

## 스크립트

```bash
npm run dev      # 개발 서버 — 3000 점유 시 3001→3002 순으로 자동 증가
npm run build    # 프로덕션 빌드 + TypeScript 검사
npm run start    # 프로덕션 서버 (build 후)
npm run lint     # ESLint 검사
```

테스트 러너는 설정되어 있지 않습니다. 변경 후 검증은 `npm run build` (타입 검사) + `npm run dev` (브라우저 수동 확인) 조합을 사용하세요.

---

## 폴더 구조

```
webapp-techfit/
├── app/
│   ├── api/assess/route.ts      # POST 엔드포인트 — 키 해석, 필수항목 검증, assess() 호출
│   ├── page.tsx                 # 홈 페이지 (AssessmentForm 렌더링)
│   ├── layout.tsx               # 루트 레이아웃 (ThemeProvider, Header)
│   └── globals.css              # Tailwind v4 @theme inline 테마 변수
│
├── components/
│   ├── assessment-form.tsx      # 과제 입력 폼 + 엔진/모델/기준범위 설정
│   ├── assessment-result.tsx    # 판정 결과 표시 (2섹션 매핑 + CSV/MD 다운로드)
│   ├── ui/                      # shadcn 프리미티브
│   ├── layout/                  # Header, Footer, Nav 등 레이아웃
│   └── theme/                   # ThemeProvider, ThemeToggle
│
├── lib/
│   ├── assess.ts                # 판정 파이프라인 — Claude/Gemini 디스패처, 스키마, 후처리
│   ├── annex.ts                 # 별표 카탈로그 단일 진입점 (lookupAnnexLabel, 열거형 등)
│   ├── site.ts                  # 사이트 메타·네비 단일 소스 (siteConfig)
│   ├── env.ts                   # 타입 안전 환경변수 접근 헬퍼
│   └── utils.ts                 # cn() 유틸리티
│
├── lib/criteria/                # 법령 기준 데이터 — 수정 금지
│   ├── annex-catalog.json       # 별표7·7의2 항목 카탈로그 (스냅샷)
│   ├── PRD.md                   # 시스템 프롬프트 주입용 업무 지침
│   ├── 별표7의2_전문.txt         # 별표 전문 모드(Claude 전용)에서 로드
│   ├── 별표7_전문.txt            # 별표 전문 모드(Claude 전용)에서 로드
│   ├── 기술참조표.md             # 참조 문서 (현재 앱에서 직접 로드하지 않음)
│   └── 평가기준.md               # 참조 문서 (현재 앱에서 직접 로드하지 않음)
│
├── scripts/
│   └── build-annex-catalog.mjs  # 시행령 개정 시 카탈로그 재생성 스크립트
│
├── types/
│   └── index.ts                 # 공용 타입 (AssessmentInput, AssessmentResult, 매핑항목 등)
│
├── .env.example                 # 환경변수 템플릿
├── CLAUDE.md                    # AI 에이전트용 아키텍처 가이드
└── AGENTS.md                    # Next.js 16 주의사항 (AI 에이전트용)
```

---

## 별표 카탈로그 재생성

`lib/criteria/annex-catalog.json`은 시행령 별표 원문을 사전 추출한 스냅샷입니다. **시행령이 개정될 때만** 재생성이 필요합니다.

```bash
node scripts/build-annex-catalog.mjs [소스폴더]
# → lib/criteria/annex-catalog.json + 별표7_전문.txt + 별표7의2_전문.txt 갱신
```

평상시에는 커밋된 스냅샷을 그대로 사용하세요. 파일을 손수정하지 마세요.

---

## 기술 스택

| 기술 | 버전 | 역할 |
|---|---|---|
| Next.js | 16.x | App Router, 서버 컴포넌트, API Routes |
| React | 19.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 4.x | `@theme inline` 기반 CSS 변수 테마 |
| shadcn/ui | 4.x | UI 컴포넌트 (radix-nova 패키지) |
| lucide-react | 1.x | 아이콘 |
| next-themes | — | 라이트/다크/시스템 테마 |
| @anthropic-ai/sdk | ^0.104 | Claude tool_use + 프롬프트 캐싱 |
| @google/genai | ^2.8 | Gemini responseSchema JSON 모드 |

아키텍처 상세(이중 엔진 파이프라인, enum 게이팅, 서버 후처리 신뢰 경계 등)는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.
