// Created: 2026-06-13 14:46:30
import { cn } from "@/lib/utils"

interface ContainerProps extends React.ComponentProps<"div"> {
  as?: React.ElementType
}

export function Container({
  as: Comp = "div",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </Comp>
  )
}
