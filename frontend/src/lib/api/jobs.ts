// Job Discovery API Service
// Uses the new job discovery endpoints: /api/v1/jobs/discovery, /api/v1/jobs/discovery/stats, /api/v1/jobs/discovery/search

import { apiClient } from './client';
import { Job, JobDisplay, JobStats, JobFilters, APIResponse } from './types';
import { userPreferencesService } from './userPreferences';

export class JobService {
  /**
   * Fetch jobs feed with optional filters and pagination
   */
  async getJobs(
    filters: Partial<JobFilters> = {},
    skip: number = 0,
    limit: number = 20
  ): Promise<APIResponse<JobDisplay[]>> {
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      // Add location filter if provided
      if (filters.location && filters.location !== 'all') {
        if (filters.location === 'remote') {
          params.append('remote_only', 'true');
        } else if (filters.location !== 'all') {
          params.append('location', filters.location);
        }
      }

      let endpoint = '/jobs/discovery';
      
      // Use search endpoint if search term provided
      if (filters.search && filters.search.trim()) {
        endpoint = '/jobs/discovery/search';
        params.append('q', filters.search.trim());
      }

      const jobs = await apiClient.get<Job[]>(`${endpoint}?${params}`);
      
      // Transform to JobDisplay format for UI
      let jobsDisplay: JobDisplay[] = jobs.map(this.transformJobToDisplay);
      
      // Apply smart filtering based on user preferences
      if (userPreferencesService.hasCompletedProfile()) {
        console.log('Applying smart job filtering...');
        const originalCount = jobsDisplay.length;
        
        // Filter jobs based on user preferences
        jobsDisplay = userPreferencesService.filterJobs(jobsDisplay);
        
        // Sort by preference match score (highest first)
        jobsDisplay = jobsDisplay.sort((a, b) => {
          const scoreA = userPreferencesService.scoreJob(a);
          const scoreB = userPreferencesService.scoreJob(b);
          return scoreB - scoreA;
        });
        
        // Update match scores based on preferences
        jobsDisplay = jobsDisplay.map(job => ({
          ...job,
          matchScore: Math.round(userPreferencesService.scoreJob(job))
        }));
        
        console.log(`Smart filtering: ${originalCount} → ${jobsDisplay.length} jobs (${originalCount - jobsDisplay.length} filtered out)`);
      } else {
        console.log('Profile incomplete, showing all jobs without filtering');
      }
      
      return {
        success: true,
        data: jobsDisplay,
        message: userPreferencesService.hasCompletedProfile() 
          ? `Found ${jobsDisplay.length} personalized job matches`
          : `Found ${jobsDisplay.length} jobs`
      };
    } catch (error) {
      console.error('Jobs API: Failed to fetch jobs:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Failed to fetch jobs'
      };
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<APIResponse<JobStats>> {
    try {
      const stats = await apiClient.get<JobStats>('/jobs/discovery/stats');
      return {
        success: true,
        data: stats,
        message: 'Job statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Jobs API: Failed to fetch job statistics:', error);
      return {
        success: false,
        data: {
          total_jobs: 0,
          jobs_with_embeddings: 0,
          jobs_by_provider: {},
          recent_jobs_count: 0
        },
        message: error instanceof Error ? error.message : 'Failed to fetch job statistics'
      };
    }
  }

  /**
   * Transform backend Job to frontend JobDisplay
   */
  private transformJobToDisplay(job: Job): JobDisplay {
    return {
      ...job,
      salaryText: JobService.formatSalary(job.salary_min, job.salary_max, job.currency),
      skills: job.tags || [],
      type: job.remote ? 'Remote' : 'Full-time',
      saved: false, // Will be updated based on user's saved jobs
    };
  }

  /**
   * Format salary information
   */
  private static formatSalary(min?: number, max?: number, currency = 'USD'): string {
    if (!min && !max) return 'Salary not specified';
    
    const symbol = currency === 'USD' ? '$' : currency;
    
    if (min && max) {
      return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
    } else if (min) {
      return `${symbol}${min.toLocaleString()}+`;
    } else if (max) {
      return `Up to ${symbol}${max.toLocaleString()}`;
    }
    
    return 'Salary not specified';
  }

  /**
   * Get a specific job by ID (for future implementation)
   */
  async getJobById(id: string): Promise<APIResponse<JobDisplay>> {
    try {
      // This endpoint doesn't exist yet in the backend, but we can return from the feed
      const jobsResponse = await this.getJobs({}, 0, 100);
      if (jobsResponse.success) {
        const job = jobsResponse.data.find(j => j.id === id);
        if (job) {
          return {
            success: true,
            data: job,
            message: 'Job found successfully'
          };
        }
      }
      
      return {
        success: false,
        data: {} as JobDisplay,
        message: 'Job not found'
      };
    } catch (error) {
      return {
        success: false,
        data: {} as JobDisplay,
        message: error instanceof Error ? error.message : 'Failed to get job'
      };
    }
  }

  /**
   * Get recommended jobs for the current user (future endpoint)
   */
  async getRecommendedJobs(limit: number = 5): Promise<APIResponse<JobDisplay[]>> {
    try {
      // Use the existing discovery feed for now
      const response = await this.getJobs({}, 0, limit);
      return response;
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Failed to get recommended jobs'
      };
    }
  }

  /**
   * Save/unsave a job (future implementation)
   */
  async toggleSaveJob(jobId: string): Promise<APIResponse<{ saved: boolean }>> {
    try {
      // TODO: Implement actual save/unsave when backend endpoint is ready
      console.log(`Toggle save for job ${jobId}`);
      return {
        success: true,
        data: { saved: Math.random() > 0.5 },
        message: 'Job save status updated (placeholder)'
      };
    } catch (error) {
      return {
        success: false,
        data: { saved: false },
        message: error instanceof Error ? error.message : 'Failed to save job'
      };
    }
  }

  /**
   * Get saved jobs (future implementation)
   */
  async getSavedJobs(): Promise<APIResponse<JobDisplay[]>> {
    try {
      // TODO: Implement when /api/v1/me/saved-jobs is ready
      return {
        success: true,
        data: [],
        message: 'Saved jobs endpoint not implemented yet'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Failed to get saved jobs'
      };
    }
  }

  /**
   * Apply to a job (opens external link)
   */
  async applyToJob(jobId: string): Promise<APIResponse<{ applied: boolean }>> {
    try {
      const jobResponse = await this.getJobById(jobId);
      if (jobResponse.success && jobResponse.data.redirect_url) {
        // Open the job application in a new window
        window.open(jobResponse.data.redirect_url, '_blank');
        return {
          success: true,
          data: { applied: true },
          message: 'Redirected to job application'
        };
      }
      
      return {
        success: false,
        data: { applied: false },
        message: 'Job application URL not available'
      };
    } catch (error) {
      return {
        success: false,
        data: { applied: false },
        message: error instanceof Error ? error.message : 'Failed to apply to job'
      };
    }
  }
}

export const jobService = new JobService();