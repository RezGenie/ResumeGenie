"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, X, Star, Bot, Target, TrendingUp, Lightbulb, Sparkles, Clock, Trophy, Zap } from "lucide-react"

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

const ACCEPTED_FILE_TYPES = ['.pdf', '.doc', '.docx']
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

interface AnalysisResults {
  resumeScore: number
  matchScore: number
  skillGaps: string[]
  insights: string[]
  recommendations: string[]
}

export default function StudioPage() {
  const { isAuthenticated } = useAuth()
  const [resumeFile, setResumeFile] = useState<UploadedFile | null>(null)
  const [jobPosting, setJobPosting] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dailyWishes, setDailyWishes] = useState(0)
  const [wishes, setWishes] = useState<Wish[]>([])
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const maxWishes = 3
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
      alert(error)
      return
    }

    // Create a temporary file object for UI feedback
    const tempFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      isUploaded: false
    }

    setResumeFile(tempFile)
    setIsLoading(true)

    try {
      // Upload the file to backend
      const resumeData = await resumeService.uploadResume(file)
      
      // Update with successful upload data
      const uploadedFile: UploadedFile = {
        ...tempFile,
        id: resumeData.id,
        isUploaded: true,
        resumeData
      }

      setResumeFile(uploadedFile)
      console.log('Resume uploaded successfully:', resumeData)
    } catch (error) {
      console.error('Resume upload failed:', error)
      // Note: Error handling and fallback are now handled in the ResumeService
      // If we get here, it means a real error that couldn't be recovered
      setResumeFile(null)
    } finally {
      setIsLoading(false)
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
      alert('Please upload a resume and enter a job posting.')
      return
    }
    
    if (dailyWishes >= maxWishes) {
      alert('You have used all your daily wishes! Come back tomorrow for more.')
      return
    }
    
    setIsAnalyzing(true)
    
    // Create a new wish entry
    const newWish: Wish = {
      id: crypto.randomUUID(),
      type: 'resume_analysis',
      title: 'Resume & Job Match Analysis',
      description: `Analysis of ${resumeFile.name} against job posting`,
      timestamp: new Date(),
      status: 'processing'
    }
    
    // Add wish to history immediately
    setWishes(prev => [newWish, ...prev])
    
    // Simulate API call - replace with real backend integration
    setTimeout(() => {
      const mockResults: AnalysisResults = {
        resumeScore: 85,
        matchScore: 78,
        skillGaps: ['React', 'TypeScript', 'AWS', 'Docker'],
        insights: [
          'Strong technical background with relevant programming experience',
          'Good project portfolio demonstrates practical skills',
          'Leadership experience shows growth potential'
        ],
        recommendations: [
          'Add more specific project descriptions with quantifiable results',
          'Include cloud technologies mentioned in the job posting',
          'Highlight any certifications or continuous learning efforts',
          'Consider adding a technical skills section with proficiency levels'
        ]
      }
      
      // Update the wish with results
      setWishes(prev => prev.map(wish => 
        wish.id === newWish.id 
          ? { 
              ...wish, 
              status: 'completed' as const, 
              results: {
                score: mockResults.resumeScore,
                insights: mockResults.insights,
                recommendations: mockResults.recommendations
              }
            }
          : wish
      ))
      
      setAnalysisResults(mockResults)
      setIsAnalyzing(false)
      setDailyWishes(prev => prev + 1)
      
      // Here you would typically send the data to your backend
      console.log('Submitted:', { resumeFile, jobPosting })
    }, 3000)
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
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  🧞‍♂️ AI Genie Under Development
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
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
            <Card className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Daily Wishes
                </CardTitle>
                <CardDescription>
                  {remainingWishes > 0 
                    ? `You have ${remainingWishes} wish${remainingWishes > 1 ? 'es' : ''} remaining today`
                    : 'No wishes remaining today. Come back tomorrow!'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: maxWishes }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-8 w-8 transition-colors ${
                        i < dailyWishes 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {dailyWishes}/{maxWishes}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Wishes used today
                  </p>
                </div>

                {remainingWishes === 0 && (
                  <div className="text-center pt-2 border-t">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Resets at midnight UTC
                    </div>
                  </div>
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
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium">Drop your resume here</p>
                        <p className="text-sm text-muted-foreground">
                          or{" "}
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-primary"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            browse files
                          </Button>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports: {ACCEPTED_FILE_TYPES.join(', ')} • Max size: {formatFileSize(MAX_FILE_SIZE)}
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_FILE_TYPES.join(',')}
                        onChange={handleFileInputChange}
                      />
                    </div>
                  ) : (
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
          <motion.div variants={itemVariants} className="flex justify-center">
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
                '🧞‍♂️ Grant My Wish'
              )}
            </Button>
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Skill Gap Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Skills mentioned in the job posting that could strengthen your profile
                  </p>
                  {analysisResults ? (
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.skillGaps.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <span className="text-sm">Awaiting analysis...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations - Full Width */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisResults ? (
                  <ul className="space-y-2">
                    {analysisResults.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-600 mt-1">💡</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Make your wish to receive personalized recommendations!</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  Track your past requests and their magical results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wishes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No wishes yet! Make your first wish above.</p>
                    </div>
                  ) : (
                    wishes.map((wish) => (
                      <motion.div
                        key={wish.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg text-white ${getWishColor(wish.type)}`}>
                              {getWishIcon(wish.type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{wish.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {wish.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(wish.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <Badge 
                            variant={
                              wish.status === 'completed' ? 'default' :
                              wish.status === 'processing' ? 'secondary' : 'outline'
                            }
                            className={
                              wish.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              wish.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }
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
                          <div className="mt-4 space-y-3">
                            {wish.results.score && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">Score:</span>
                                <div className="flex items-center gap-2 flex-1">
                                  <Progress value={wish.results.score} className="flex-1" />
                                  <span className="text-sm font-bold text-purple-600">
                                    {wish.results.score}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {wish.results.insights && wish.results.insights.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Key Insights:</h5>
                                <ul className="space-y-1">
                                  {wish.results.insights.map((insight, index) => (
                                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-purple-600 mt-1">•</span>
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {wish.results.recommendations && wish.results.recommendations.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                                <ul className="space-y-1">
                                  {wish.results.recommendations.map((rec, index) => (
                                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-green-600 mt-1">✨</span>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}