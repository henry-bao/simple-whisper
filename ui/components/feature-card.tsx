"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  delay?: number
}

export default function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
    >
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 font-happy-monkey">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  )
}
