"use client"

import { useEffect, useRef } from "react"

export default function AudioWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Animation variables
    let animationId: number
    const waveWidth = canvas.width
    const waveHeight = canvas.height / 2
    const barCount = 50
    const barWidth = 4
    const barGap = 2
    const barColor = "#092de5" // Updated to theme blue

    // Function to draw the waveform
    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap) + (canvas.width - barCount * (barWidth + barGap)) / 2
        const height = Math.abs(Math.sin(i * 0.2 + Date.now() * 0.005) * canvas.height * 0.4) + 5
        const y = waveHeight - height / 2

        ctx.fillStyle = barColor
        ctx.fillRect(x, y, barWidth, height)
      }

      animationId = requestAnimationFrame(drawWave)
    }

    // Start animation
    drawWave()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="w-full h-32 bg-secondary rounded-lg overflow-hidden border border-secondary">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
