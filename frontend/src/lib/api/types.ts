// API Types and Interfaces

// Backend Job Discovery Response Type (matches JobDiscoveryResponse)
export interface Job {
  id: string;
  provider: string;
  provider_job_id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  snippet: string;
  tags?: string[];
  redirect_url: string;
  posted_at: string;
  created_at: string;
  updated_at: string;
}

// Frontend-enriched Job type for UI display
export interface JobDisplay extends Job {
  saved?: boolean;
  matchScore?: number;
  salaryText?: string;
  skills?: string[];
  type?: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  experience?: string;
  requirements?: string[];
  benefits?: string[];
}

// Job Statistics Response Type (matches JobStatsResponse)
export interface JobStats {
  total_jobs: number;
  jobs_with_embeddings: number;
  jobs_by_provider: Record<string, number>;
  recent_jobs_count: number;
}

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

// Extended user interface for dashboard display
export interface DashboardUser extends User {
  name?: string;
  profilePicture?: string;
  resumeUploaded?: boolean;
  memberSince: string;
  profileCompleteness: number;
  title?: string;
  company?: string;
  location?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  experience?: unknown[];
  education?: unknown[];
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  interviewsScheduled: number;
  profileViews: number;
  matchScore: number;
  recommendedJobs: number;
}

export interface RecentActivity {
  id: string;
  type: 'application' | 'interview' | 'profile_view' | 'job_match';
  title: string;
  description: string;
  timestamp: string;
  status?: 'pending' | 'completed' | 'scheduled';
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'pending' | 'reviewed' | 'interview' | 'offered' | 'rejected';
  appliedDate: string;
  coverLetter?: string;
  customResume?: boolean;
}

export interface Interview {
  id: string;
  applicationId: string;
  jobTitle: string;
  company: string;
  scheduledDate: string;
  type: 'phone' | 'video' | 'in-person';
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface JobFilters {
  search: string;
  location: string;
  salary: string;
  type: string;
  experience: string;
}

export interface APIResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 
Genie Wish Types
export interface ScoreComponent {
  score: number;
  feedback: string;
  weight: number;
}

export interface ScoreBreakdown {
  style_formatting: ScoreComponent;
  grammar_spelling: ScoreComponent;
  job_match: ScoreComponent;
  ats_compatibility: ScoreComponent;
  content_quality: ScoreComponent;
}

export interface GenieWish {
  id: string;
  wish_type: string;
  wish_text: string;
  context_data?: Record<string, unknown>;
  is_processed: boolean;
  processing_status: string;
  processing_error?: string;
  created_at: string;
  processed_at?: string;
  ai_response?: string;
  recommendations?: string[];
  action_items?: string[];
  resources?: Array<{ title: string; url: string; description: string }>;
  confidence_score?: number;
  job_match_score?: number;
  overall_score?: number;
  score_breakdown?: ScoreBreakdown;
  company_name?: string;
  position_title?: string;
}
