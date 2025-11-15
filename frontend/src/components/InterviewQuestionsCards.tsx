"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Zap, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Question {
  id: string
  question: string
  sampleResponse?: string
  difficulty?: "easy" | "medium" | "hard"
}

interface InterviewQuestionsCardsProps {
  questions: Question[]
  isLoading?: boolean
}

export function InterviewQuestionsCards({
  questions,
  isLoading = false,
}: InterviewQuestionsCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const dragRef = useRef<{ startX: number; currentX: number }>({ startX: 0, currentX: 0 })
  const [isDragging, setIsDragging] = useState(false)

  if (!questions || questions.length === 0) {
    return null
  }

  const currentQuestion = questions[currentIndex]
  const isExpanded = expandedCards.has(currentQuestion.id)

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % questions.length)
    setExpandedCards(new Set()) // Reset expanded state when navigating
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length)
    setExpandedCards(new Set()) // Reset expanded state when navigating
  }

  const toggleExpand = () => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(currentQuestion.id)) {
      newExpanded.delete(currentQuestion.id)
    } else {
      newExpanded.add(currentQuestion.id)
    }
    setExpandedCards(newExpanded)
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    dragRef.current = { startX: clientX, currentX: clientX }
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    dragRef.current.currentX = clientX
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    const diff = dragRef.current.startX - dragRef.current.currentX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
    dragRef.current = { startX: 0, currentX: 0 }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Only toggle expand if this wasn't a drag
    const dragDistance = Math.abs(dragRef.current.startX - dragRef.current.currentX)
    if (dragDistance < 10) {
      toggleExpand()
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/10 text-green-700 dark:text-green-300"
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
      case "hard":
        return "bg-red-500/10 text-red-700 dark:text-red-300"
      default:
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300"
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Question Counter */}
      <div className="flex justify-end">
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Stacked Cards Container */}
      <div className="relative h-96 perspective">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Card
              className="h-full flex flex-col bg-background/50 dark:bg-card border border-muted-foreground/25 hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 transition-all duration-300 shadow-none"
              onClick={handleCardClick}
            >
              <CardHeader className="pb-3">
                <div className="text-sm text-muted-foreground leading-tight text-gray-700 dark:text-gray-300">
                  {currentQuestion.question}
                </div>
              </CardHeader>

              {/* Sample Response Section */}
              <CardContent className="flex-1 flex flex-col overflow-hidden p-4 pt-2">
                <div className="border border-muted-foreground/25 rounded-lg p-4 py-6 transition-all duration-200 bg-background/50 backdrop-blur-sm dark:bg-card flex-1 flex flex-col overflow-hidden">
                  {isExpanded && currentQuestion.sampleResponse ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex-1 overflow-y-auto"
                    >
                      <p className="font-semibold text-purple-600 dark:text-purple-400 mb-2 text-sm">
                        Sample Response:
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{currentQuestion.sampleResponse}</p>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground text-center">
                        {isExpanded
                          ? "Loading response..."
                          : "Tap card to see sample response"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Background stacked effect */}
        {questions.length > 1 && (
          <>
            <div className="absolute inset-0 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-200/30 dark:border-purple-800/30 rounded-lg transform translate-x-2 translate-y-2 -z-10" />
            <div className="absolute inset-0 bg-purple-50/10 dark:bg-purple-950/5 border border-purple-200/20 dark:border-purple-800/20 rounded-lg transform translate-x-4 translate-y-4 -z-20" />
          </>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={questions.length <= 1}
          className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-1">
          {questions.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? "bg-purple-600 w-6"
                  : "bg-purple-200 dark:bg-purple-800 w-2 hover:bg-purple-400"
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={questions.length <= 1}
          className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
