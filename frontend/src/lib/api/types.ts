// API Types and Interfaces

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  experience: string;
  postedDate: string;
  matchScore: number;
  skills: string[];
  description: string;
  saved: boolean;
  requirements?: string[];
  benefits?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  resumeUploaded: boolean;
  memberSince: string;
  profileCompleteness: number;
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