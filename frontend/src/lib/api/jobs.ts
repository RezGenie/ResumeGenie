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
      // IMPORTANT: Load preferences from backend first to ensure we have latest data
      try {
        await userPreferencesService.loadPreferencesFromBackend();
      } catch (error) {
        console.warn('Could not load preferences from backend:', error);
      }

      // Use personalized recommendations if user has completed profile and no search/filters
      const hasProfile = userPreferencesService.hasCompletedProfile();
      const hasFilters = filters.search || (filters.location && filters.location !== 'all');

      console.log('🔍 Job Service - hasProfile:', hasProfile, 'hasFilters:', hasFilters);

      if (hasProfile && !hasFilters) {
        console.log('✅ Using personalized recommendations endpoint');
        return await this.getRecommendedJobs(limit);
      }

      console.log('⚠️ Using discovery feed (not personalized)');

      // Otherwise use discovery feed with filters
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
      if (hasProfile) {
        const originalCount = jobsDisplay.length;

        // Filter jobs based on user preferences
        jobsDisplay = userPreferencesService.filterJobs(jobsDisplay);

        console.log(`📊 Filtered ${originalCount} jobs to ${jobsDisplay.length} relevant jobs`);

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
      }

      return {
        success: true,
        data: jobsDisplay,
        message: hasProfile
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
   * Get recommended jobs for the current user using personalized matching
   */
  async getRecommendedJobs(limit: number = 20): Promise<APIResponse<JobDisplay[]>> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      // Use the personalized recommendations endpoint
      const response = await apiClient.get<any>(`/jobs/recommendations?${params}`);

      // Check if response is an array
      if (!Array.isArray(response)) {
        console.warn('Recommendations response is not an array, falling back to discovery feed');
        throw new Error('Invalid recommendations response format');
      }

      // Transform recommendations to JobDisplay format
      const jobsDisplay: JobDisplay[] = response.map(rec => ({
        id: rec.job_id.toString(),
        provider: rec.provider,
        provider_job_id: rec.provider_job_id,
        title: rec.title,
        company: rec.company,
        location: rec.location || '',
        remote: rec.remote,
        salary_min: rec.salary_min,
        salary_max: rec.salary_max,
        currency: rec.currency,
        snippet: rec.snippet || '',
        tags: rec.tags || [],
        redirect_url: rec.redirect_url,
        posted_at: rec.posted_at,
        created_at: rec.posted_at, // Use posted_at as created_at
        updated_at: rec.posted_at, // Use posted_at as updated_at
        salaryText: JobService.formatSalary(rec.salary_min, rec.salary_max, rec.currency),
        skills: rec.tags || [],
        type: rec.remote ? 'Remote' : 'Full-time',
        saved: false,
        matchScore: Math.round(rec.score * 100), // Convert 0-1 score to percentage
      }));

      return {
        success: true,
        data: jobsDisplay,
        message: `Found ${jobsDisplay.length} personalized job recommendations`
      };
    } catch (error) {
      console.error('Jobs API: Failed to get recommended jobs:', error);
      // Fallback to discovery feed if recommendations fail
      try {
        const params = new URLSearchParams({
          skip: '0',
          limit: limit.toString(),
        });
        const jobs = await apiClient.get<Job[]>(`/jobs/discovery?${params}`);
        const jobsDisplay = jobs.map(this.transformJobToDisplay);

        return {
          success: true,
          data: jobsDisplay,
          message: `Showing ${jobsDisplay.length} jobs (recommendations unavailable)`
        };
      } catch (fallbackError) {
        console.error('Fallback to discovery feed also failed:', fallbackError);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch jobs'
        };
      }
    }
  }

  /**
   * Record a swipe action (like or pass) on a job
   */
  async swipeJob(jobId: string, action: 'like' | 'pass', device?: string): Promise<APIResponse<{ saved?: boolean }>> {
    try {
      const response = await apiClient.post<{
        message: string;
        job_id: number;
        action: string;
        saved?: boolean;
        saved_job_id?: number;
      }>('/jobs/swipe', {
        job_id: parseInt(jobId),
        action,
        device: device || (typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop')
      });

      console.log('Swipe API response:', response);

      return {
        success: true,
        data: {
          saved: response.saved || false
        },
        message: response.message
      };
    } catch (error) {
      console.error('Error recording swipe:', error);
      return {
        success: false,
        data: { saved: false },
        message: error instanceof Error ? error.message : 'Failed to record swipe'
      };
    }
  }

  /**
   * Save/unsave a job (future implementation)
   */
  async toggleSaveJob(jobId: string): Promise<APIResponse<{ saved: boolean }>> {
    try {
      // TODO: Implement actual save/unsave when backend endpoint is ready
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