"use client"
import { motion } from "framer-motion"

export default function AnimatedLogo() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <motion.div
        className="absolute inset-0 bg-secondary rounded-full flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d="M32 12C28.5 12 25.5 14.2 24.1 17.4C23.7 18.4 22.6 19 21.5 19H13C11.3 19 10 20.3 10 22V46C10 47.7 11.3 49 13 49H51C52.7 49 54 47.7 54 46V22C54 20.3 52.7 19 51 19H42.5C41.4 19 40.3 18.4 39.9 17.4C38.5 14.2 35.5 12 32 12Z"
              stroke="#092de5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.path
              d="M32 12V32"
              stroke="#092de5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 1.5 }}
            />
            <motion.path
              d="M22 22L32 32L42 22"
              stroke="#092de5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            />
            <motion.path
              d="M18 36C20.2091 36 22 34.2091 22 32C22 29.7909 20.2091 28 18 28C15.7909 28 14 29.7909 14 32C14 34.2091 15.7909 36 18 36Z"
              fill="#092de5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 2.2 }}
            />
            <motion.path
              d="M46 36C48.2091 36 50 34.2091 50 32C50 29.7909 48.2091 28 46 28C43.7909 28 42 29.7909 42 32C42 34.2091 43.7909 36 46 36Z"
              fill="#092de5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 2.4 }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  )
}
