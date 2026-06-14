// Created: 2026-06-13 14:46:41
import { siteConfig } from "@/lib/site"
import { Container } from "@/components/layout/container"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <Container className="flex h-14 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          © 2026{" "}
          <span className="font-medium text-foreground">'{siteConfig.name}'</span>
          {" "}· 문의처{" "}
          <a
            href="mailto:woohyun.noh@gmail.com"
            className="transition-colors hover:text-foreground"
          >
            woohyun.noh@gmail.com
          </a>
        </p>
      </Container>
    </footer>
  )
}
