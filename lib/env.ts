// Created: 2026-06-13 14:45:55
/**
 * 타입 안전 환경변수 접근 헬퍼
 *
 * 사용 예:
 *   const apiUrl = getEnv("NEXT_PUBLIC_API_URL")          // 없으면 에러
 *   const debug  = getOptionalEnv("NEXT_PUBLIC_DEBUG")    // 없으면 undefined
 */
export function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `[env] 필수 환경변수 "${key}"가 설정되지 않았습니다. .env.local을 확인하세요.`
    )
  }
  return value
}

export function getOptionalEnv(key: string): string | undefined {
  return process.env[key]
}
