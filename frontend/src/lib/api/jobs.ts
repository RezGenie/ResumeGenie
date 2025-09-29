// Job API Service

import { apiClient } from './client';
import { Job, JobFilters, PaginatedResponse, APIResponse } from './types';

export class JobService {
  /**
   * Fetch jobs with optional filters and pagination
   */
  async getJobs(
    filters: Partial<JobFilters> = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Job>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>)
    });

    return apiClient.get<PaginatedResponse<Job>>(`/jobs?${params}`);
  }

  /**
   * Get a specific job by ID
   */
  async getJobById(id: string): Promise<APIResponse<Job>> {
    return apiClient.get<APIResponse<Job>>(`/jobs/${id}`);
  }

  /**
   * Get recommended jobs for the current user
   */
  async getRecommendedJobs(limit: number = 5): Promise<APIResponse<Job[]>> {
    return apiClient.get<APIResponse<Job[]>>(`/jobs/recommended?limit=${limit}`);
  }

  /**
   * Save/unsave a job
   */
  async toggleSaveJob(jobId: string): Promise<APIResponse<{ saved: boolean }>> {
    return apiClient.post<APIResponse<{ saved: boolean }>>(`/jobs/${jobId}/save`);
  }

  /**
   * Get saved jobs
   */
  async getSavedJobs(): Promise<APIResponse<Job[]>> {
    return apiClient.get<APIResponse<Job[]>>('/jobs/saved');
  }

  /**
   * Apply to a job
   */
  async applyToJob(jobId: string, applicationData: {
    coverLetter?: string;
    customResume?: boolean;
  }): Promise<APIResponse<{ applicationId: string }>> {
    return apiClient.post<APIResponse<{ applicationId: string }>>(
      `/jobs/${jobId}/apply`,
      applicationData
    );
  }

  /**
   * Search jobs by query
   */
  async searchJobs(
    query: string,
    filters: Partial<JobFilters> = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Job>> {
    return this.getJobs({ ...filters, search: query }, page, limit);
  }
}

export const jobService = new JobService();