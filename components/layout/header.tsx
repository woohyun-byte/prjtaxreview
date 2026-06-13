// Created: 2026-06-13 14:46:45
import Link from "next/link"

import { siteConfig } from "@/lib/site"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Container } from "@/components/layout/container"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <Container className="flex h-14 items-center justify-between">
        {/* 로고 */}
        <Link
          href="/"
          className="text-sm font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          {siteConfig.name}
        </Link>

        {/* 데스크탑 네비 */}
        <MainNav />

        {/* 우측 액션 */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav />
        </div>
      </Container>
    </header>
  )
}
