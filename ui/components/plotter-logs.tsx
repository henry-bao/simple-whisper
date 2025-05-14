"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export default function PlotterLogs() {
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const initialLogs = ["[13:56:19] Initializing plotter..."]
    setLogs(initialLogs)

    const logMessages = [
      "[13:56:21] Connected to AxiDraw plotter",
      "[13:56:23] Loading SVG file...",
      "[13:56:25] SVG loaded successfully",
      "[13:56:27] Optimizing paths for plotting...",
      "[13:56:30] Starting plot job...",
      "[13:56:35] Plotting line 1/12...",
      "[13:56:42] Plotting line 2/12...",
      "[13:56:50] Plotting line 3/12...",
      "[13:57:02] Plotting line 4/12...",
    ]

    let index = 0
    const interval = setInterval(() => {
      if (index < logMessages.length) {
        setLogs((prev) => [...prev, logMessages[index]])
        index++
      } else {
        clearInterval(interval)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-40 overflow-y-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {logs.map((log, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          {log}
        </motion.div>
      ))}
      {logs.length > 0 && (
        <motion.div
          className="inline-block"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
        >
          _
        </motion.div>
      )}
    </motion.div>
  )
}
