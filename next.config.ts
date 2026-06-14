import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Vercel 서버리스 함수 번들에 lib/criteria/** 법령 데이터 파일을 강제 포함.
  // fs.readFileSync(process.cwd()+"lib/criteria/...") 동적 경로는 Next.js file tracing이
  // 정적으로 추적하지 못하므로 outputFileTracingIncludes로 명시 지정.
  outputFileTracingIncludes: {
    "/api/assess": ["./lib/criteria/**"],
  },
}

export default nextConfig
