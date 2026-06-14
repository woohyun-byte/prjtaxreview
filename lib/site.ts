// Created: 2026-06-13 16:37:18
import type { NavItem } from "@/types"

export const siteConfig = {
  name: "조선산업 R&D 세액공제 적격성 판정 Agent",
  description:
    "조세특례제한법 제10조 조선산업 대기업 R&D 세액공제 대상기술·연구개발활동 1차 적격성 판정 도구",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { title: "판정", href: "/" },
  ] satisfies NavItem[],
} as const

export type SiteConfig = typeof siteConfig
