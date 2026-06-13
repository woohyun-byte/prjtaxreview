// Created: 2026-06-13 14:47:20
import { Skeleton } from "@/components/ui/skeleton"
import { Container } from "@/components/layout/container"

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-full max-w-lg" />
        <Skeleton className="h-5 w-full max-w-md" />
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </Container>
  )
}
