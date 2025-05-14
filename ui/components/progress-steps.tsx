interface ProgressStepProps {
  progress: number
  status: string
  steps?: {
    label: string
    completed: boolean
    current: boolean
  }[]
}

export default function ProgressSteps({ progress, status, steps }: ProgressStepProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-albert">{status}</span>
        <span className="font-albert">{progress}%</span>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {steps && (
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full mb-1 ${
                  step.completed ? "bg-primary" : step.current ? "border-2 border-primary bg-white" : "bg-secondary"
                }`}
              ></div>
              <span className={`text-xs font-albert ${step.current ? "font-medium" : ""}`}>{step.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
