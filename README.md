# Next Starter

Next.js 16 + Tailwind CSS v4 + shadcn/ui(radix-nova) + TypeScript 기반 모던 웹 스타터킷.

## 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| Next.js | 16.x | App Router, 서버 컴포넌트 |
| React | 19.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 4.x | 유틸리티 CSS (`@theme inline` 기반) |
| shadcn/ui | 4.x | UI 컴포넌트 (radix-nova 스타일) |
| lucide-react | 1.x | 아이콘 |
| next-themes | — | 라이트/다크/시스템 테마 |

## 시작하기

```bash
# 1. 저장소 클론 후 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 값을 채워주세요

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

## 폴더 구조

```
nextjs-starter/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 루트 레이아웃 (ThemeProvider, Header, Footer)
│   ├── page.tsx            # 홈 페이지
│   ├── loading.tsx         # 전역 로딩 UI (Skeleton)
│   ├── error.tsx           # 전역 에러 바운더리
│   ├── not-found.tsx       # 404 페이지
│   └── globals.css         # Tailwind v4 + 테마 CSS 변수
│
├── components/
│   ├── ui/                 # [L1] shadcn 프리미티브 (직접 수정 가능)
│   ├── theme/              # [L2] 테마 인프라
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── layout/             # [L3] 페이지 골격 컴포넌트
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── container.tsx
│   │   ├── main-nav.tsx
│   │   └── mobile-nav.tsx
│   └── features/           # [L4] 도메인별 컴포넌트 (직접 추가)
│
├── hooks/                  # 커스텀 훅
│   └── use-mobile.ts
│
├── lib/
│   ├── utils.ts            # cn() 유틸리티
│   ├── site.ts             # 사이트 메타·네비 단일 소스
│   └── env.ts              # 타입 안전 환경변수 접근
│
├── types/
│   └── index.ts            # 공용 타입 정의
│
├── public/                 # 정적 파일
└── .env.example            # 환경변수 예시
```

## 사이트 설정 변경

`lib/site.ts`에서 사이트 이름, 설명, 네비게이션 링크를 한 곳에서 관리합니다:

```ts
export const siteConfig = {
  name: "My App",           // 사이트 이름 (헤더·메타데이터에 사용)
  description: "...",       // 사이트 설명 (메타데이터에 사용)
  url: "https://...",       // 배포 URL
  nav: [
    { title: "Home", href: "/" },
    { title: "About", href: "/about" },
  ],
}
```

## shadcn 컴포넌트 추가

```bash
npx shadcn@latest add <component-name>
# 예시
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add form
```

설치된 컴포넌트는 `components/ui/`에 추가됩니다.

## 설치된 shadcn 컴포넌트

- `button` — 버튼 (variant: default/secondary/outline/ghost/destructive/link)
- `card` — 카드
- `input` — 인풋
- `label` — 레이블
- `dropdown-menu` — 드롭다운 메뉴
- `avatar` — 아바타
- `badge` — 뱃지
- `separator` — 구분선
- `sonner` — 토스트 알림
- `skeleton` — 로딩 스켈레톤

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SITE_URL` | 권장 | 사이트 배포 URL (OG 이미지 base URL) |

자세한 내용은 `.env.example`을 참고하세요.

## 스크립트

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 시작
npm run lint     # ESLint 검사
```
