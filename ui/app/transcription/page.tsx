"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Edit2, RotateCcw } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import PageTransition from "@/components/page-transition"
import EnhancedProgressSteps from "@/components/enhanced-progress-steps"

export default function TranscriptionPage() {
  const [transcription, setTranscription] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(25)
  const router = useRouter()

  // Simulate loading the transcription from the server
  useEffect(() => {
    const timer = setTimeout(() => {
      // This would normally come from an API call to your Flask server
      setTranscription(
        "Hello, this is a test message that has been transcribed from my voice recording. I hope you enjoy this demo of the SnailMailer application!",
      )
      setIsLoading(false)
    }, 2000)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 15
      })
    }, 500)

    return () => {
      clearTimeout(timer)
      clearInterval(progressInterval)
    }
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    setIsEditing(false)
  }

  const handleSubmit = () => {
    // In a real app, you would send the transcription to the server
    // For now, we'll just navigate to the next page
    router.push("/plotting")
  }

  const handleRerecord = () => {
    router.push("/record")
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen pb-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center mb-4">
            <Link href="/record" className="mr-4">
              <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
                <ArrowLeft className="h-6 w-6" />
              </motion.div>
            </Link>
            <h1 className="text-xl font-medium font-happy-monkey">Transcription Preview</h1>
          </div>

          <motion.div
            className="bg-white rounded-lg border border-secondary p-6 mb-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="flex items-center justify-center space-x-2 mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <svg
                      className="animate-spin h-5 w-5 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-center text-gray-600 font-medium">Transcribing audio...</p>
                  </motion.div>

                  <EnhancedProgressSteps
                    progress={progress}
                    status="Converting your audio to text..."
                    steps={[
                      { label: "Recording", completed: true, current: false },
                      { label: "Processing", completed: false, current: true },
                      { label: "Plotting", completed: false, current: false },
                      { label: "Complete", completed: false, current: false },
                    ]}
                  />

                  <motion.div
                    className="mt-6 bg-secondary/50 p-4 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-sm font-medium mb-2 font-happy-monkey">What's happening?</h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Your audio is being processed by our AI transcription service</li>
                      <li>• The system is converting speech to text with high accuracy</li>
                      <li>• We're preparing the text for handwriting conversion</li>
                    </ul>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="bg-secondary p-6 rounded-lg shadow-inner">
                    {isEditing ? (
                      <Textarea
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        className="min-h-[120px] font-albert"
                      />
                    ) : (
                      <motion.p
                        className="whitespace-pre-wrap font-albert"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        {transcription}
                      </motion.p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleRerecord} className="group">
                      <RotateCcw className="mr-2 h-4 w-4 group-hover:rotate-[-45deg] transition-transform" />
                      Re-record
                    </Button>

                    {isEditing ? (
                      <Button onClick={handleSave}>Save Changes</Button>
                    ) : (
                      <Button variant="outline" onClick={handleEdit} className="group">
                        <Edit2 className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                        Edit Text
                      </Button>
                    )}
                  </div>

                  <motion.div
                    className="bg-secondary/50 p-4 rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-sm font-medium mb-2 font-happy-monkey">Handwriting Preview</h3>
                    <div className="bg-white rounded-lg border border-secondary p-4">
                      <p className="text-center italic" style={{ fontFamily: "cursive", fontSize: "14px" }}>
                        {transcription.length > 100 ? transcription.substring(0, 100) + "..." : transcription}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="flex justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button variant="outline" onClick={() => router.push("/record")}>
              Back
            </Button>

            {!isLoading && !isEditing && (
              <Button onClick={handleSubmit} className="group">
                Approve & Plot
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
