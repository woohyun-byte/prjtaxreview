// Created: 2026-06-13 14:46:41
import Link from "next/link"

import { siteConfig } from "@/lib/site"
import { Container } from "@/components/layout/container"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <Container className="flex h-14 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()}{" "}
          <span className="font-medium text-foreground">{siteConfig.name}</span>
          . All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </Link>
        </div>
      </Container>
    </footer>
  )
}
