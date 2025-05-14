"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

export default function EnhancedConfetti() {
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
    const confettiCount = 200
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
      shape: "circle" | "square" | "triangle" | "star"
      opacity: number
    }[] = []

    // Create confetti particles
    for (let i = 0; i < confettiCount; i++) {
      const shape = ["circle", "square", "triangle", "star"][Math.floor(Math.random() * 4)] as
        | "circle"
        | "square"
        | "triangle"
        | "star"

      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * 2 * Math.PI,
        rotation: Math.random() * 2 * Math.PI,
        rotationSpeed: Math.random() * 0.2 - 0.1,
        shape,
        opacity: Math.random() * 0.5 + 0.5,
      })
    }

    // Draw different shapes
    const drawShape = (ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, size: number) => {
      switch (shape) {
        case "circle":
          ctx.beginPath()
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
          ctx.fill()
          break
        case "square":
          ctx.fillRect(-size / 2, -size / 2, size, size)
          break
        case "triangle":
          ctx.beginPath()
          ctx.moveTo(0, -size / 2)
          ctx.lineTo(-size / 2, size / 2)
          ctx.lineTo(size / 2, size / 2)
          ctx.closePath()
          ctx.fill()
          break
        case "star":
          const spikes = 5
          const outerRadius = size / 2
          const innerRadius = size / 4

          ctx.beginPath()
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const angle = (Math.PI * 2 * i) / (spikes * 2)
            const x = radius * Math.sin(angle)
            const y = -radius * Math.cos(angle)

            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.closePath()
          ctx.fill()
          break
      }
    }

    // Animation function
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const particle of confetti) {
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)
        ctx.globalAlpha = particle.opacity

        ctx.fillStyle = particle.color
        drawShape(ctx, particle.shape, 0, 0, particle.size)

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

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    />
  )
}
