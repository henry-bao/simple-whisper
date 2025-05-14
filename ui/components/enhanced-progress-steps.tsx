"use client"

import { motion } from "framer-motion"

interface EnhancedProgressStepsProps {
  progress: number
  status: string
  steps?: {
    label: string
    completed: boolean
    current: boolean
  }[]
}

export default function EnhancedProgressSteps({ progress, status, steps }: EnhancedProgressStepsProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <motion.span
          className="font-albert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={status} // Re-animate when status changes
        >
          {status}
        </motion.span>
        <motion.span
          className="font-albert font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={progress} // Re-animate when progress changes
        >
          {progress}%
        </motion.span>
      </div>

      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {steps && (
        <div className="flex justify-between mt-6">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center relative">
              <motion.div
                className={`w-5 h-5 rounded-full mb-2 flex items-center justify-center ${
                  step.completed ? "bg-primary" : step.current ? "border-2 border-primary bg-white" : "bg-secondary"
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {step.completed && (
                  <motion.svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </motion.svg>
                )}
              </motion.div>

              {/* Connecting line between steps */}
              {index < steps.length - 1 && (
                <div className="absolute top-2.5 w-full h-0.5 bg-secondary -right-1/2 -z-10" />
              )}

              <motion.span
                className={`text-xs font-albert ${step.current ? "font-medium text-primary" : ""}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {step.label}
              </motion.span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
