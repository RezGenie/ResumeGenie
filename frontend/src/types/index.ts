export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface Resume {
  id: string
  filename: string
  content: string
  parsed_data?: any
  created_at: string
}

export interface JobDescription {
  id: string
  title: string
  company: string
  content: string
  requirements?: string
  created_at: string
}

export interface JobApplication {
  id: string
  fit_score?: number
  missing_skills?: string[]
  matching_skills?: string[]
  ai_feedback?: string
  status: string
  created_at: string
  resume: Resume
  job_description: JobDescription
}

export interface DailyWish {
  id: string
  wish_type: string
  content: string
  date: string
  created_at: string
}

export interface WishUsage {
  wishes_used: number
  daily_limit: number
  remaining: number
  date: string
}