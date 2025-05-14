"use client"

import { useEffect, useRef } from "react"

interface PlottingAnimationProps {
  isComplete: boolean
}

export default function PlottingAnimation({ isComplete }: PlottingAnimationProps) {
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
    let progress = 0
    const plotterSize = 40
    const paperWidth = canvas.width * 0.8
    const paperHeight = canvas.height * 0.6
    const paperX = (canvas.width - paperWidth) / 2
    const paperY = (canvas.height - paperHeight) / 2

    // Function to draw the plotter animation
    const drawPlotter = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw paper
      ctx.fillStyle = "#ffffff"
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 2
      ctx.fillRect(paperX, paperY, paperWidth, paperHeight)
      ctx.strokeRect(paperX, paperY, paperWidth, paperHeight)

      if (isComplete) {
        // Draw completed text
        ctx.font = "16px sans-serif"
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("Hello, world!", canvas.width / 2, canvas.height / 2)
      } else {
        // Calculate plotter position
        progress = (progress + 0.005) % 1

        // Create a path for the plotter to follow (a simple sine wave)
        const pathPoints = []
        const numPoints = 100

        for (let i = 0; i < numPoints; i++) {
          const t = i / (numPoints - 1)
          const x = paperX + t * paperWidth
          const y = paperY + paperHeight / 2 + Math.sin(t * Math.PI * 4) * (paperHeight / 4)
          pathPoints.push({ x, y })
        }

        // Draw the path (already drawn part)
        const currentPointIndex = Math.floor(progress * pathPoints.length)

        if (currentPointIndex > 0) {
          ctx.beginPath()
          ctx.moveTo(pathPoints[0].x, pathPoints[0].y)

          for (let i = 1; i <= currentPointIndex; i++) {
            ctx.lineTo(pathPoints[i].x, pathPoints[i].y)
          }

          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Draw the plotter
        const currentPoint = pathPoints[currentPointIndex]
        ctx.fillStyle = "#14b8a6" // Teal color
        ctx.fillRect(currentPoint.x - plotterSize / 2, currentPoint.y - plotterSize / 2, plotterSize, plotterSize)
      }

      if (!isComplete) {
        animationId = requestAnimationFrame(drawPlotter)
      }
    }

    // Start animation
    drawPlotter()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isComplete])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
