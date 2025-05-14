"use client"

import { useEffect, useRef } from "react"

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Confetti settings
    const confettiCount = 150
    const colors = ["#092de5", "#eef4ff", "#ffffff", "#4361ee", "#3f37c9", "#4895ef", "#4cc9f0"]
    const confetti: {
      x: number
      y: number
      size: number
      color: string
      speed: number
      angle: number
      rotation: number
      rotationSpeed: number
    }[] = []

    // Create confetti particles
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * 2 * Math.PI,
        rotation: Math.random() * 2 * Math.PI,
        rotationSpeed: Math.random() * 0.2 - 0.1,
      })
    }

    // Animation function
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const particle of confetti) {
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)

        ctx.fillStyle = particle.color
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size / 2)

        ctx.restore()

        // Update position
        particle.y += particle.speed
        particle.x += Math.sin(particle.angle) * 2
        particle.rotation += particle.rotationSpeed

        // Reset if out of screen
        if (particle.y > canvas.height) {
          particle.y = -particle.size
          particle.x = Math.random() * canvas.width
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-50" />
}
