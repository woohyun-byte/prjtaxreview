// Created: 2026-06-13 14:47:26
import Link from "next/link"
import { SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"

export default function NotFound() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-7 text-muted-foreground" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">페이지를 찾을 수 없습니다</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </Container>
  )
}
