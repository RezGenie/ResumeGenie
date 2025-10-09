// Job API Service
// 
// NOTE: The backend currently has job comparison endpoints (/api/v1/jobs/) for analyzing 
// resumes against job postings, but not job listing endpoints for browsing opportunities.
// This service provides mock data as fallback until job listing APIs are implemented.

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
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await apiClient.get<PaginatedResponse<Job>>(`/jobs?${params}`);
      
      // Check if response has the expected paginated format
      if (!response || !response.data || 
          (Array.isArray(response) && response.length === 0) ||
          (Array.isArray(response.data) && response.data.length === 0)) {
        console.log('Jobs API: Backend returned empty or invalid data format, using mock data');
        return this.getMockJobs(filters, page, limit);
      }
      
      return response;
    } catch (error) {
      console.log('Jobs API: Backend request failed, using mock data:', error);
      return this.getMockJobs(filters, page, limit);
    }
  }

  /**
   * Generate mock job data for development/fallback
   */
  private getMockJobs(
    filters: Partial<JobFilters> = {},
    page: number = 1,
    limit: number = 10
  ): PaginatedResponse<Job> {
    const mockJobs: Job[] = [
      {
        id: '1',
        title: 'Senior Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        type: 'Full-time',
        salary: '$120,000 - $160,000',
        experience: '5+ years',
        postedDate: '2025-10-05',
        matchScore: 85,
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB'],
        description: 'Join our team as a Senior Software Engineer and help build the next generation of applications. You will work with cutting-edge technologies and collaborate with a talented team.',
        requirements: ['5+ years experience', 'React', 'Node.js', 'TypeScript', 'AWS'],
        saved: false
      },
      {
        id: '2',
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        location: 'Remote',
        type: 'Full-time',
        salary: '$80,000 - $110,000',
        experience: '3+ years',
        postedDate: '2025-10-04',
        matchScore: 72,
        skills: ['React', 'TypeScript', 'CSS', 'JavaScript', 'Figma'],
        description: 'We are looking for a talented Frontend Developer to join our growing team. You will be responsible for creating beautiful and intuitive user interfaces.',
        requirements: ['3+ years experience', 'React', 'TypeScript', 'CSS/SCSS'],
        saved: false
      },
      {
        id: '3',
        title: 'Full Stack Developer',
        company: 'InnovateTech',
        location: 'New York, NY',
        type: 'Full-time',
        salary: '$90,000 - $130,000',
        experience: '4+ years',
        postedDate: '2025-10-03',
        matchScore: 78,
        skills: ['React', 'Python', 'PostgreSQL', 'Docker', 'FastAPI'],
        description: 'Join our innovative team as a Full Stack Developer. Work on both frontend and backend technologies to deliver amazing user experiences.',
        requirements: ['4+ years experience', 'React', 'Python', 'PostgreSQL', 'Docker'],
        saved: false
      },
      {
        id: '4',
        title: 'DevOps Engineer',
        company: 'CloudFirst',
        location: 'Austin, TX',
        type: 'Full-time',
        salary: '$100,000 - $140,000',
        experience: '3+ years',
        postedDate: '2025-10-02',
        matchScore: 65,
        skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins'],
        description: 'Help us build and maintain scalable cloud infrastructure. You will work with modern DevOps tools and practices.',
        requirements: ['3+ years experience', 'AWS', 'Docker', 'Kubernetes', 'Terraform'],
        saved: false
      },
      {
        id: '5',
        title: 'Product Manager',
        company: 'GrowthCo',
        location: 'Seattle, WA',
        type: 'Full-time',
        salary: '$110,000 - $150,000',
        experience: '5+ years',
        postedDate: '2025-10-01',
        matchScore: 60,
        skills: ['Product Strategy', 'Agile', 'Analytics', 'Leadership', 'Roadmapping'],
        description: 'Lead product development and strategy for our core platforms. Work closely with engineering and design teams.',
        requirements: ['5+ years experience', 'Product Management', 'Agile', 'Data Analysis'],
        saved: false
      }
    ];

    // Apply basic filtering
    let filteredJobs = mockJobs;
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.company.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.location && filters.location !== 'all') {
      filteredJobs = filteredJobs.filter(job => 
        job.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedJobs,
      pagination: {
        page,
        limit,
        total: filteredJobs.length,
        totalPages: Math.ceil(filteredJobs.length / limit)
      },
      message: 'Jobs fetched successfully (mock data)'
    };
  }

  /**
   * Get a specific job by ID
   */
  async getJobById(id: string): Promise<APIResponse<Job>> {
    try {
      return await apiClient.get<APIResponse<Job>>(`/jobs/${id}`);
    } catch (error) {
      console.log('Jobs API: Failed to get job by ID, using mock data:', error);
      // Return mock job data
      const mockJob: Job = {
        id,
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        type: 'Full-time',
        salary: '$100,000 - $140,000',
        experience: '3+ years',
        postedDate: '2025-10-05',
        matchScore: 75,
        skills: ['React', 'Node.js', 'TypeScript', 'JavaScript', 'Git'],
        description: 'Join our team as a Software Engineer and work on exciting projects.',
        requirements: ['3+ years experience', 'React', 'Node.js'],
        saved: false
      };
      return {
        success: true,
        data: mockJob,
        message: 'Job fetched successfully (mock data)'
      };
    }
  }

  /**
   * Get recommended jobs for the current user
   */
  async getRecommendedJobs(limit: number = 5): Promise<APIResponse<Job[]>> {
    try {
      return await apiClient.get<APIResponse<Job[]>>(`/jobs/recommended?limit=${limit}`);
    } catch (error) {
      console.log('Jobs API: Failed to get recommended jobs, using mock data:', error);
      // Return subset of mock jobs as recommendations
      const mockJobs = this.getMockJobs({}, 1, limit);
      return {
        success: true,
        data: mockJobs.data,
        message: 'Recommended jobs fetched successfully (mock data)'
      };
    }
  }

  /**
   * Save/unsave a job
   */
  async toggleSaveJob(jobId: string): Promise<APIResponse<{ saved: boolean }>> {
    try {
      return await apiClient.post<APIResponse<{ saved: boolean }>>(`/jobs/${jobId}/save`);
    } catch (error) {
      console.log('Jobs API: Failed to toggle save job, using mock response:', error);
      // Mock successful save/unsave
      return {
        success: true,
        data: { saved: Math.random() > 0.5 }, // Random saved state for demo
        message: 'Job save status updated successfully (mock data)'
      };
    }
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