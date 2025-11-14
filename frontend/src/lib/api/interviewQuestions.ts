import { apiClient } from "@/lib/api/client"

export interface Question {
  question: string
  difficulty: "easy" | "medium" | "hard"
  category: string
  sampleResponse: string
  followUp?: string
}

export interface InterviewQuestionsResponse {
  success: boolean
  questions: Question[]
  totalQuestions: number
  generatedAt?: string
  error?: string
}

export interface GenerateQuestionsRequest {
  resumeId?: string
  resumeText?: string
  jobDescription: string
  numQuestions?: number
  difficultyLevels?: string[]
}

export const interviewQuestionsService = {
  async generateQuestions(
    data: GenerateQuestionsRequest,
    isGuest: boolean = false
  ): Promise<InterviewQuestionsResponse> {
    const endpoint = isGuest
      ? "/genie/interview-questions/guest"
      : "/genie/interview-questions"

    const payload = {
      resume_id: data.resumeId,
      resume_text: data.resumeText,
      job_description: data.jobDescription,
      num_questions: data.numQuestions || 5,
      difficulty_levels: data.difficultyLevels || ["easy", "medium", "hard"],
    }

    try {
      const response = await apiClient.post<InterviewQuestionsResponse>(
        endpoint,
        payload
      )
      return response
    } catch (error) {
      console.error("Failed to generate interview questions:", error)
      throw error
    }
  },
}
