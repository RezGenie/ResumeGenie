"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, X, Star, Bot, Target, TrendingUp, Lightbulb, Sparkles, Clock, Trophy, Zap, Maximize2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/contexts/AuthContext"
import { resumeService, ResumeResponse } from "@/lib/api/resumes"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  isUploaded?: boolean
  resumeData?: ResumeResponse
}

interface Wish {
  id: string
  type: 'resume_analysis' | 'job_match' | 'skill_gap' | 'career_advice'
  title: string
  description: string
  timestamp: Date
  status: 'pending' | 'processing' | 'completed'
  results?: {
    score?: number
    insights?: string[]
    recommendations?: string[]
  }
}

const ACCEPTED_FILE_TYPES = ['.pdf', '.docx']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
} as const

const wishTypes = [
  {
    type: 'resume_analysis' as const,
    icon: <Bot className="h-5 w-5" />,
    title: 'Resume Analysis',
    description: 'Get comprehensive feedback on your resume structure, content, and ATS compatibility',
    color: 'bg-blue-500'
  },
  {
    type: 'job_match' as const,
    icon: <Target className="h-5 w-5" />,
    title: 'Job Match Score',
    description: 'Analyze your resume against job opportunities and get a compatibility score',
    color: 'bg-green-500'
  },
  {
    type: 'skill_gap' as const,
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Skill Gap Analysis',
    description: 'Identify missing skills and get recommendations for career advancement',
    color: 'bg-purple-500'
  },
  {
    type: 'career_advice' as const,
    icon: <Lightbulb className="h-5 w-5" />,
    title: 'Career Guidance',
    description: 'Get personalized advice on career paths and next steps based on your profile',
    color: 'bg-amber-500'
  }
]

// Deterministic sparkle positions (server/client consistent)
const SPARKLE_POSITIONS = [
  { left: '46.39701473670041%', top: '30.191348745094707%' },
  { left: '77.72333153258018%', top: '71.98678973108386%' },
  { left: '30.31433841724377%', top: '61.77677344382561%' },
  { left: '47.912740068827475%', top: '30.470628111023373%' },
  { left: '78.98035735099025%', top: '44.82286986585663%' },
  { left: '44.33383674203081%', top: '35.98387209792393%' }
]

const modalVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.85,
    y: 30
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 30,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
} as const

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    transition: { 
      duration: 0.2,
      ease: "easeIn"
    }
  }
} as const

interface AnalysisResults {
  resumeScore: number
  matchScore: number
  skillGaps: string[]
  insights: string[]
  recommendations: string[]
}

export default function StudioPage() {

  const { isAuthenticated } = useAuth()
  const [isRecModalOpen, setIsRecModalOpen] = useState(false)
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null)
  const [isWishDetailModalOpen, setIsWishDetailModalOpen] = useState(false)
  const modalCloseRef = useRef<HTMLButtonElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const [resumeFile, setResumeFile] = useState<UploadedFile | null>(null)
  const [jobPosting, setJobPosting] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dailyWishes, setDailyWishes] = useState(0)
  const [maxWishes, setMaxWishes] = useState(3)
  const [wishes, setWishes] = useState<Wish[]>([])
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch real daily wish usage from backend (only when authenticated)
  useEffect(() => {
    const fetchDailyUsage = async () => {
      try {
        if (!isAuthenticated) {
          setDailyWishes(0)
          setMaxWishes(3)
          return
        }
        const { apiClient } = await import('@/lib/api/client')
        const data = await apiClient.get<{ wishes_used: number; daily_limit: number }>("/genie/usage/daily")
        if (data && typeof (data as any).wishes_used === 'number' && typeof (data as any).daily_limit === 'number') {
          setDailyWishes((data as any).wishes_used)
          setMaxWishes((data as any).daily_limit)
        } else {
          setDailyWishes(0)
          setMaxWishes(3)
        }
      } catch (err) {
        setDailyWishes(0)
        setMaxWishes(3)
      }
    }
    fetchDailyUsage()
  }, [isAuthenticated])

  // Fetch historical wishes when user is authenticated
  useEffect(() => {
    const fetchWishHistory = async () => {
      try {
        if (!isAuthenticated) {
          setWishes([])
          return
        }
        const { apiClient } = await import('@/lib/api/client')
        const historicalWishes = await apiClient.get<any[]>("/genie")
        
        if (Array.isArray(historicalWishes)) {
          // Fetch detailed data for completed wishes
          const detailedWishes = await Promise.all(
            historicalWishes.map(async (wish) => {
              let detailedData = null
              if (wish.is_processed) {
                try {
                  detailedData = await apiClient.get<any>(`/genie/${wish.id}`)
                } catch (err) {
                  console.warn(`Failed to fetch details for wish ${wish.id}:`, err)
                }
              }

              return {
                id: wish.id,
                type: 'resume_analysis' as const,
                title: 'Resume & Job Match Analysis',
                description: `Analysis of resume against job posting`,
                timestamp: new Date(wish.created_at),
                status: wish.is_processed ? 'completed' : (wish.processing_status === 'processing' ? 'processing' : 'pending'),
                results: detailedData ? {
                  score: Math.round((detailedData.confidence_score || 0) * 100),
                  insights: detailedData.recommendations || [],
                  recommendations: detailedData.action_items || []
                } : undefined
              } as Wish
            })
          )
          setWishes(detailedWishes)
        }
      } catch (err) {
        console.warn('Failed to fetch wish history:', err)
        // Don't clear wishes on error - keep any current session wishes
      }
    }
    fetchWishHistory()
  }, [isAuthenticated])

  // Modal focus trap and scroll lock
  useEffect(() => {
    if (!isRecModalOpen) return
    const prevActive = document.activeElement as HTMLElement | null
    setTimeout(() => modalCloseRef.current?.focus(), 0)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsRecModalOpen(false)
      if (e.key === 'Tab') {
        const container = modalRef.current
        if (!container) return
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        ))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
      prevActive?.focus()
    }
  }, [isRecModalOpen])

  const remainingWishes = maxWishes - dailyWishes

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!ACCEPTED_FILE_TYPES.includes(fileExtension)) {
      return `File type not supported. Please upload ${ACCEPTED_FILE_TYPES.join(', ')} files.`
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
    }
    
    return null
  }

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error('Invalid file', {
        description: error
      })
      return
    }

    // Reset progress and set loading
    setUploadProgress(0)
    setIsLoading(true)

    // Create a temporary file object for UI feedback
    const tempFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      isUploaded: false
    }

    setResumeFile(tempFile)

    try {
      // Upload the file to backend with progress tracking
      await resumeService.uploadResume(file, {
        isGuest: !isAuthenticated,
        onProgress: (progress) => {
          setUploadProgress(progress)
        },
        onComplete: (response) => {
          // Update with successful upload data
          const uploadedFile: UploadedFile = {
            ...tempFile,
            id: response.id,
            isUploaded: true,
            resumeData: response
          }
          setResumeFile(uploadedFile)
          console.log('Resume uploaded successfully:', response)
        },
        onError: (error) => {
          console.error('Resume upload failed:', error)
          setResumeFile(null)
        }
      })

      // This will be called if the promise resolves successfully
      // (onComplete callback handles the UI update)
      
    } catch (error) {
      console.error('Resume upload failed:', error)
      // Error is already handled by the onError callback and ResumeService
      setResumeFile(null)
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const removeFile = () => {
    setResumeFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!resumeFile || !jobPosting.trim()) {
      toast.error('Missing requirements! 📝', {
        description: 'Please upload your resume and enter a job posting to make a wish.'
      })
      return
    }
    if (dailyWishes >= maxWishes) {
      toast.error('Daily wish limit reached!', {
        description: 'You\'ve used all your daily wishes. Come back tomorrow for more.'
      })
      return
    }
    setIsAnalyzing(true)
    
    try {
      if (!isAuthenticated) {
        toast.error('Please log in to grant a wish', { description: 'Sign in to use AI Genie features.' })
        return
      }
      const { apiClient } = await import('@/lib/api/client')
      
      // Call backend to create a wish
      const data = await apiClient.post<{ id: string }>(
        '/genie',
        {
          wish_type: 'improvement',
          wish_text: jobPosting,
          context_data: { resume_id: resumeFile.id }
        }
      )

      // Add wish to history immediately with real backend ID
      const newWish: Wish = {
        id: data.id,
        type: 'resume_analysis',
        title: 'Resume & Job Match Analysis',
        description: `Analysis of ${resumeFile.name} against job posting`,
        timestamp: new Date(),
        status: 'processing'
      }
      setWishes(prev => [newWish, ...prev])

      // Poll for wish completion (simplified)
      let wishDetails = null
      for (let i = 0; i < 30; i++) { // up to 30s
        try {
          wishDetails = await apiClient.get<any>(`/genie/${data.id}`)
          if (wishDetails && wishDetails.processing_status === 'completed') break
        } catch {}
        await new Promise(r => setTimeout(r, 1000))
      }
      if (!wishDetails || wishDetails.processing_status !== 'completed') {
        throw new Error('Wish processing timed out')
      }
      
      // Update the wish with real results
      setWishes(prev => prev.map(wish =>
        wish.id === data.id
          ? {
              ...wish,
              status: 'completed' as const,
              results: {
                score: Math.round((wishDetails.confidence_score || 0) * 100),
                insights: wishDetails.recommendations || [],
                recommendations: wishDetails.action_items || []
              }
            }
          : wish
      ))
      setAnalysisResults({
        resumeScore: Math.round((wishDetails.confidence_score || 0) * 100),
        matchScore: 0,
        skillGaps: wishDetails.action_items || [],
        insights: wishDetails.recommendations || [],
        recommendations: wishDetails.action_items || []
      })
      setDailyWishes(prev => prev + 1)
    } catch (error) {
      // Remove the temporary wish if it failed
      setWishes(prev => prev.filter(wish => wish.status !== 'processing'))
      toast.error('Wish failed', { description: (error as Error).message })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getWishIcon = (type: Wish['type']) => {
    const wishType = wishTypes.find(w => w.type === type)
    return wishType?.icon || <Bot className="h-4 w-4" />
  }

  const getWishColor = (type: Wish['type']) => {
    const wishType = wishTypes.find(w => w.type === type)
    return wishType?.color || 'bg-gray-500'
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-20 max-w-4xl">

        {/* Header */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center space-y-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              Make Your Career Wish
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your resume and paste the job posting you&apos;re interested in. Your genie will grant you career insights!
            </p>
          </motion.div>
        </motion.div>

        {/* Under Development Notice */}
        <motion.div 
          variants={itemVariants}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 border border-purple-200/50 dark:border-purple-700/50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  AI Genie Under Development
                </h3>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    The AI Genie is currently being enhanced with new magical powers! Resume upload and analysis features are working in demo mode. Full backend integration coming soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Wish Counter */}
          <motion.div variants={itemVariants}>
            <Card className="max-w-3xl mx-auto bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-gray-900 dark:text-gray-100">
                  <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
                  {isAuthenticated ? 'Your Genie Powers' : 'Daily Genie Wishes'}
                </CardTitle>
                <CardDescription className="text-lg">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-muted-foreground">
                        As a member, you have unlimited access to all genie powers
                      </div>
                    </div>
                  ) : (
                    remainingWishes > 0 
                      ? `You have ${remainingWishes} wish${remainingWishes > 1 ? 'es' : ''} remaining today`
                      : 'No wishes remaining today. Come back tomorrow for more.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isAuthenticated ? (
                  // Enhanced display for authenticated users (left column)
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-card border border-primary/10 rounded-lg p-3">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm font-medium text-primary">Unlimited Uploads</div>
                      </div>
                      <div className="bg-card border border-primary/10 rounded-lg p-3">
                        <Bot className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm font-medium text-primary">AI Analysis</div>
                      </div>
                      <div className="bg-card border border-primary/10 rounded-lg p-3">
                        <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm font-medium text-primary">Job Matching</div>
                      </div>
                      <div className="bg-card border border-primary/10 rounded-lg p-3">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm font-medium text-primary">Premium AI</div>
                      </div>
                    </div>
                    
                    {/* AI Recommendations (now shown below for all users) */}
                    <div>
                      <div className="mt-3 bg-card rounded-md p-3 text-left max-h-40 md:max-h-56 overflow-auto border border-muted-foreground/10">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-gray-900 dark:text-gray-100" aria-label="Recommendations icon" />
                            Recommendations Preview
                          </h5>
                          <div>
                            <Button size="sm" variant="ghost" onClick={() => setIsRecModalOpen(true)} aria-label="Expand recommendations" title="View full recommendations">
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {(analysisResults?.recommendations && analysisResults.recommendations.length > 0)
                            ? analysisResults.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-500 mt-1">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))
                            : [
                                'Add quantifiable metrics to your project descriptions (e.g., improved performance by 30%)',
                                'Include relevant cloud technologies mentioned in the job posting',
                                'List certifications or ongoing coursework in a dedic                                docker-compose exec postgres bashated section',
                                'Use strong action verbs and concise bullet points for achievements'
                              ].map((mock, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-muted-foreground mt-1">•</span>
                                  <span>{mock}</span>
                                </li>
                              ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  ) : (
                  // Original design for guests (left column)
                  <>
                {/* Animated Wish Stars */}
                <div className="relative">
                  <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: maxWishes }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ 
                          scale: 1, 
                          rotate: 0,
                          transition: { delay: i * 0.1, type: "spring", stiffness: 200 }
                        }}
                        whileHover={{ scale: 1.2, rotate: 360, transition: { duration: 0.3 } }}
                      >
                        <Star
                          className={`h-10 w-10 transition-all duration-300 ${
                            i < dailyWishes 
                              ? 'fill-amber-400 text-amber-400 drop-shadow-lg animate-pulse' 
                              : i < remainingWishes + dailyWishes 
                                ? 'text-purple-300 dark:text-purple-600 hover:text-primary/80'
                                : 'text-gray-300 dark:text-gray-700'
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Magical sparkles around stars */}
                  {remainingWishes > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-purple-400 rounded-full"
                          style={{
                            left: SPARKLE_POSITIONS[i].left,
                            top: SPARKLE_POSITIONS[i].top,
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-primary">{dailyWishes}/{maxWishes}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(dailyWishes / maxWishes) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* AI Recommendations moved to the right column */}

                {/* Status Messages */}
                {remainingWishes === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center pt-4 border-t border-primary/20"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
                      <Clock className="h-4 w-4" />
                      Wishes reset at midnight UTC
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Bot className="h-3 w-3" />
                      Sign up for unlimited wishes with Pro!
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    {/* Scrollable recommendations panel (mock data until analysisResults available) */}
                    <div className="mt-3 bg-card rounded-md p-3 text-left max-h-40 md:max-h-56 overflow-auto border border-muted-foreground/10">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-gray-900 dark:text-gray-100" />
                          Recommendations Preview
                        </h5>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setIsRecModalOpen(true)}
                          aria-label="Expand recommendations"
                          title="View full recommendations"
                          className="h-6 w-6 p-0"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {(analysisResults?.recommendations && analysisResults.recommendations.length > 0)
                          ? analysisResults.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">•</span>
                                <span>{rec}</span>
                              </li>
                            ))
                          : [
                              'Add quantifiable metrics to your project descriptions (e.g., improved performance by 30%)',
                              'Include relevant cloud technologies mentioned in the job posting',
                              'List certifications or ongoing coursework in a dedicated section',
                              'Use strong action verbs and concise bullet points for achievements'
                            ].map((mock, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-muted-foreground mt-1">•</span>
                                <span>{mock}</span>
                              </li>
                            ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
                  </>
                )}

              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Grid - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Resume Upload */}
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Resume
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!resumeFile ? (
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer group ${
                        isDragOver 
                          ? 'border-primary bg-primary/10 scale-105' 
                          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <motion.div
                        animate={{ 
                          y: isDragOver ? -5 : 0,
                          scale: isDragOver ? 1.05 : 1
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <Upload className={`mx-auto h-16 w-16 mb-4 transition-colors ${
                          isDragOver 
                            ? 'text-primary' 
                            : 'text-muted-foreground group-hover:text-primary'
                        }`} />
                        <div className="space-y-3">
                          <div>
                            <p className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                              {isDragOver ? 'Drop it here!' : 'Drop your resume here'}
                            </p>
                            <p className="text-base text-muted-foreground mt-2">
                              or click anywhere to browse files
                            </p>
                          </div>
                          
                          <div className="pt-2 border-t border-dashed border-muted-foreground/20">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Accepted formats:</span> {ACCEPTED_FILE_TYPES.join(', ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Max size:</span> {formatFileSize(MAX_FILE_SIZE)}
                            </p>
                          </div>
                          
                          {/* Visual indicators */}
                          <div className="flex justify-center gap-2 pt-2">
                            {[1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 bg-primary/30 rounded-full"
                                animate={{
                                  scale: isDragOver ? [1, 1.5, 1] : 1,
                                  opacity: isDragOver ? [0.3, 1, 0.3] : 0.3,
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: isDragOver ? Infinity : 0,
                                  delay: i * 0.2,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_FILE_TYPES.join(',')}
                        onChange={handleFileInputChange}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">{resumeFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(resumeFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Upload Progress */}
                      {isLoading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      )}
                      
                      {/* Processing Status */}
                      {resumeFile.isUploaded && resumeFile.resumeData && (
                        <div className="text-sm text-muted-foreground">
                          Status: {resumeFile.resumeData.processing_status === 'completed' ? 
                            '✅ Ready for analysis' : 
                            '⏳ Processing...'}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>


            {/* Job Posting */}
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your dream job description here..."
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    className="min-h-[200px] max-h-[200px] resize-none overflow-y-auto"
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Submit Button */}

          <motion.div variants={itemVariants} className="flex flex-col items-center">
            <Button 
              size="lg" 
              onClick={handleSubmit}
              disabled={!resumeFile || !jobPosting.trim() || dailyWishes >= maxWishes || isAnalyzing}
              className="px-8"
            >
              {isAnalyzing ? (
                <>
                  <Zap className="h-5 w-5 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Grant My Wish
                </>
              )}
            </Button>
            {dailyWishes >= maxWishes && (
              <div className="mt-3 text-sm text-amber-600 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-4 py-2 border border-amber-200 dark:border-amber-800 max-w-md text-center">
                <span className="font-semibold">Daily wish limit reached!</span><br />
                You have used all your wishes for today. Come back tomorrow for more, or upgrade to Pro for unlimited wishes.
              </div>
            )}
          </motion.div>

          {/* Analysis Results Cards */}
          <motion.div variants={itemVariants} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Resume Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-blue-600" />
                  Resume Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Score</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {analysisResults ? `${analysisResults.resumeScore}%` : '---%'}
                    </Badge>
                  </div>
                  <Progress value={analysisResults?.resumeScore || 0} className="h-2" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Key Insights:</p>
                    {analysisResults ? (
                      <ul className="space-y-1">
                        {analysisResults.insights.slice(0, 2).map((insight, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Upload your resume and job description to get AI-powered analysis
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Match Score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-green-600" />
                  Job Match Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Match Score</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {analysisResults ? `${analysisResults.matchScore}%` : '---%'}
                    </Badge>
                  </div>
                  <Progress value={analysisResults?.matchScore || 0} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {analysisResults 
                      ? `Your resume matches ${analysisResults.matchScore}% of the job requirements`
                      : 'See how well your resume matches the job requirements'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skill Gap Analysis */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Skill Gap Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <div className="space-y-4 h-full flex flex-col">
                  <p className="text-sm text-muted-foreground">
                    Skills from the job posting that could strengthen your profile
                  </p>
                  {analysisResults && analysisResults.skillGaps.length > 0 ? (
                    <div className="space-y-3 flex-1 min-h-0">
                      <div className="grid gap-2 overflow-y-auto max-h-52 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent overflow-x-hidden">
                        {analysisResults.skillGaps.map((skill, index) => {
                          // Determine if it's likely a technical or soft skill for styling
                          const isTechnical = /^(Python|JavaScript|React|AWS|SQL|Excel|VBA|Tableau|PowerBI|Java|C\+\+|Docker|Kubernetes|Azure|GCP|Node\.js|API|Database|HTML|CSS|Git|Linux|Windows|Mac|Android|iOS|Machine Learning|AI|Data|Analytics|Cloud|DevOps|Agile|Scrum|\.NET|PHP|Ruby|Go|Rust|Swift|Kotlin|R|MATLAB|Salesforce|SAP|Oracle|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch|Hadoop|Spark|TensorFlow|PyTorch|Pandas|NumPy|Scipy|Jupyter|Anaconda|Visual Studio|IntelliJ|Eclipse|Xcode|Android Studio)/i.test(skill)
                          
                          return (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-muted">
                              <div className={`w-2 h-2 rounded-full ${isTechnical ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                              <span className="text-sm font-medium flex-1">{skill}</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${isTechnical ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}
                              >
                                {isTechnical ? 'Technical' : 'Soft Skill'}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>Technical Skills</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span>Soft Skills</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4 text-muted-foreground flex-1">
                      <span className="text-sm">Awaiting analysis...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations now located inside the Genie counter card */}
          </motion.div>

          {/* Wish History */}
          <motion.div variants={itemVariants}>
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Wish History
                </CardTitle>
                <CardDescription>
                  Click any analysis to view full results
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                <div className="h-full flex flex-col">
                  {wishes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col justify-center">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No wishes yet! Make your first wish above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                      {wishes.map((wish) => (
                        <motion.div
                          key={wish.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`border rounded-lg p-4 transition-all duration-200 ${
                            wish.status === 'completed' 
                              ? 'cursor-pointer hover:shadow-md hover:border-primary/50 hover:bg-primary/5' 
                              : 'cursor-default'
                          }`}
                          onClick={() => {
                            if (wish.status === 'completed') {
                              setSelectedWish(wish)
                              setIsWishDetailModalOpen(true)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg text-white ${getWishColor(wish.type)}`}>
                                {getWishIcon(wish.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium truncate">{wish.title}</h4>
                                  {wish.status === 'completed' && wish.results?.score && (
                                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                      {wish.results.score}%
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                  {wish.description}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(wish.timestamp).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  {wish.status === 'completed' && (
                                    <span className="text-xs text-primary font-medium">
                                      Click to view details →
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Badge 
                              variant={
                                wish.status === 'completed' ? 'default' :
                                wish.status === 'processing' ? 'secondary' : 'outline'
                              }
                              className={`ml-3 ${
                                wish.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                wish.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}
                            >
                              {wish.status === 'processing' && <Zap className="h-3 w-3 mr-1 animate-pulse" />}
                              {wish.status === 'completed' && <Trophy className="h-3 w-3 mr-1" />}
                              {wish.status.charAt(0).toUpperCase() + wish.status.slice(1)}
                            </Badge>
                          </div>

                          {wish.status === 'processing' && (
                            <div className="mt-3">
                              <Progress value={65} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                AI genie is working on your request...
                              </p>
                            </div>
                          )}

                          {wish.status === 'completed' && wish.results && (
                            <div className="mt-3 pt-3 border-t border-muted/50">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                {wish.results.score && (
                                  <div>
                                    <div className="text-lg font-bold text-primary">{wish.results.score}%</div>
                                    <div className="text-xs text-muted-foreground">Overall Score</div>
                                  </div>
                                )}
                                {wish.results.insights && (
                                  <div>
                                    <div className="text-lg font-bold text-blue-600">{wish.results.insights.length}</div>
                                    <div className="text-xs text-muted-foreground">Insights</div>
                                  </div>
                                )}
                                {wish.results.recommendations && (
                                  <div>
                                    <div className="text-lg font-bold text-purple-600">{wish.results.recommendations.length}</div>
                                    <div className="text-xs text-muted-foreground">Tips</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recommendations Modal */}
          <AnimatePresence>
            {isRecModalOpen && (
              <motion.div 
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div 
                  className="absolute inset-0 bg-black/50" 
                  onClick={() => setIsRecModalOpen(false)}
                />
                <motion.div 
                  className="relative w-full max-w-3xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm" ref={modalRef}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">AI Recommendations</h3>
                      <Button size="sm" variant="ghost" onClick={() => setIsRecModalOpen(false)} ref={modalCloseRef} aria-label="Close recommendations" title="Close recommendations modal">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-[60vh] overflow-auto text-sm text-muted-foreground">
                      {(analysisResults?.recommendations && analysisResults.recommendations.length > 0)
                        ? analysisResults.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="text-amber-500 mt-1">•</span>
                              <div>{rec}</div>
                            </div>
                          ))
                        : [
                            'Add quantifiable metrics to your project descriptions (e.g., improved performance by 30%)',
                            'Include relevant cloud technologies mentioned in the job posting',
                            'List certifications or ongoing coursework in a dedicated section',
                            'Use strong action verbs and concise bullet points for achievements'
                          ].map((mock, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="text-muted-foreground mt-1">•</span>
                              <div>{mock}</div>
                            </div>
                          ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wish Detail Modal */}
          <AnimatePresence>
            {isWishDetailModalOpen && selectedWish && (
              <motion.div 
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div 
                  className="absolute inset-0 bg-black/50" 
                  onClick={() => setIsWishDetailModalOpen(false)}
                />
                <motion.div 
                  className="relative w-full max-w-4xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg text-white ${getWishColor(selectedWish.type)}`}>
                          {getWishIcon(selectedWish.type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{selectedWish.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedWish.timestamp).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setIsWishDetailModalOpen(false)}
                        aria-label="Close wish details"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6">
                      {/* Overall Score */}
                      {selectedWish.results?.score && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4 text-blue-600" />
                            Overall Analysis Score
                          </h4>
                          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                            <div className="text-3xl font-bold text-primary">
                              {selectedWish.results.score}%
                            </div>
                            <div className="flex-1">
                              <Progress value={selectedWish.results.score} className="h-3" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Key Insights */}
                      {selectedWish.results?.insights && selectedWish.results.insights.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            Key Insights ({selectedWish.results.insights.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedWish.results.insights.map((insight, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-blue-600 mt-1 font-bold">•</span>
                                <span className="text-sm">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {selectedWish.results?.recommendations && selectedWish.results.recommendations.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            AI Recommendations ({selectedWish.results.recommendations.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedWish.results.recommendations.map((rec, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <span className="text-amber-600 mt-1">✨</span>
                                <span className="text-sm">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skill Gaps */}
                      {selectedWish.results?.skillGaps && selectedWish.results.skillGaps.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                            Skill Gap Analysis ({selectedWish.results.skillGaps.length} skills)
                          </h4>
                          <div className="grid gap-2">
                            {selectedWish.results.skillGaps.map((skill, index) => {
                              const isTechnical = /^(Python|JavaScript|React|AWS|SQL|Excel|VBA|Tableau|PowerBI|Java|C\+\+|Docker|Kubernetes|Azure|GCP|Node\.js|API|Database|HTML|CSS|Git|Linux|Windows|Mac|Android|iOS|Machine Learning|AI|Data|Analytics|Cloud|DevOps|Agile|Scrum|\.NET|PHP|Ruby|Go|Rust|Swift|Kotlin|R|MATLAB|Salesforce|SAP|Oracle|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch|Hadoop|Spark|TensorFlow|PyTorch|Pandas|NumPy|Scipy|Jupyter|Anaconda|Visual Studio|IntelliJ|Eclipse|Xcode|Android Studio)/i.test(skill)
                              
                              return (
                                <div key={index} className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                  <div className={`w-2 h-2 rounded-full ${isTechnical ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                  <span className="text-sm font-medium flex-1">{skill}</span>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${isTechnical ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}
                                  >
                                    {isTechnical ? 'Technical' : 'Soft Skill'}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}