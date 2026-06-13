// Created: 2026-06-13 14:47:24
"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">문제가 발생했습니다</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {error.message || "예기치 않은 오류가 발생했습니다. 다시 시도해 주세요."}
      </p>
      <Button onClick={reset} className="mt-6">
        다시 시도
      </Button>
    </Container>
  )
}
