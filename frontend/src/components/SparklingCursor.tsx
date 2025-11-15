"use client"

import { useEffect, useRef, useState } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

export function SparklingCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Detect touch device
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      )
    }
    
    setIsTouchDevice(checkTouchDevice())
  }, [])

  useEffect(() => {
    // Don't render cursor trail on touch devices
    if (isTouchDevice) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }

      // Occasionally create a sparkle
      if (Math.random() > 0.85) {
        const angle = Math.random() * Math.PI * 2
        const velocity = 0.3 + Math.random() * 0.5

        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 1,
          maxLife: 0.4 + Math.random() * 0.2,
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0)

      particlesRef.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02

        const alpha = p.life / p.maxLife
        // Create gradient for particles
        const particleGradient = ctx.createLinearGradient(p.x - 5, p.y, p.x + 5, p.y)
        particleGradient.addColorStop(0, `rgba(168, 85, 247, ${alpha * 0.3})`) // purple
        particleGradient.addColorStop(0.5, `rgba(147, 51, 234, ${alpha * 0.3})`) // deeper purple
        particleGradient.addColorStop(1, `rgba(236, 72, 153, ${alpha * 0.3})`) // pink
        ctx.fillStyle = particleGradient
        ctx.font = '9px Arial'
        ctx.fillText('✦', p.x - 4, p.y + 3)
      })

      // Draw cursor - star with gradient and subtle glow
      const twinkle = Math.sin(Date.now() * 0.01) * 0.1 + 0.35
      // Create gradient for main cursor
      const cursorGradient = ctx.createLinearGradient(
        mouseRef.current.x - 6, 
        mouseRef.current.y, 
        mouseRef.current.x + 6, 
        mouseRef.current.y
      )
      cursorGradient.addColorStop(0, `rgba(168, 85, 247, ${twinkle})`) // purple
      cursorGradient.addColorStop(0.5, `rgba(147, 51, 234, ${twinkle})`) // deeper purple
      cursorGradient.addColorStop(1, `rgba(236, 72, 153, ${twinkle})`) // pink
      ctx.fillStyle = cursorGradient
      ctx.shadowColor = `rgba(168, 85, 247, 0.15)`
      ctx.shadowBlur = 4
      ctx.font = '12px Arial'
      ctx.fillText('✦', mouseRef.current.x - 6, mouseRef.current.y + 4)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isTouchDevice])

  // Don't render anything on touch devices
  if (isTouchDevice) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 pointer-events-none z-[99999]"
      style={{ cursor: "none" }}
    />
  )
}

