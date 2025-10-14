import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 48, className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="RezGenie Logo"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  )
}