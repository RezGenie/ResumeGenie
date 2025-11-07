import { cn } from "@/lib/utils"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 48, className }: LogoProps) {
  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      🧞‍♂️
    </div>
  )
}