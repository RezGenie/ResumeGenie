export interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  skills: string[];
  jobUrl?: string;
  savedAt: string;
  status: 'saved' | 'applied' | 'archived';
  notes?: string;
}

export interface SavedJobsFilters {
  status?: 'saved' | 'applied' | 'archived' | 'all';
  search?: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
  };
  skills?: string[];
}

// Backend API response types
interface BackendJobResponse {
  job_id: number;
  provider: string;
  provider_job_id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  snippet?: string;
  tags: string[];
  posted_at?: string;
  redirect_url?: string;
  score: number;
  why: string[];
  source: string;
}

interface BackendSavedJobResponse {
  job_id: number;
  status: string;
  saved_at: string;
  updated_at: string;
  job: BackendJobResponse;
}

class SavedJobsService {
  private readonly STORAGE_KEY_PREFIX = 'savedJobs_';

  // Get user-specific storage key
  private getUserStorageKey(): string {
    // Get current user ID from auth token or localStorage
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        // Decode JWT to get user ID (simple base64 decode of payload)
        const payload = authToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const userId = decoded.sub || decoded.user_id || decoded.id;
        return `${this.STORAGE_KEY_PREFIX}${userId}`;
      } catch (error) {
        console.warn('Failed to decode auth token:', error);
      }
    }
    
    // Fallback to guest session
    return `${this.STORAGE_KEY_PREFIX}guest`;
  }

  // Sync saved jobs from backend
  async syncSavedJobsFromBackend(): Promise<void> {
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.log('No auth token, skipping saved jobs sync');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/jobs/me/saved-jobs?limit=100`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to sync saved jobs from backend:', response.status);
        return;
      }

      const backendJobs: BackendSavedJobResponse[] = await response.json();
      
      // Convert backend format to local format
      const localJobs: SavedJob[] = backendJobs.map(item => ({
        id: item.job_id.toString(),
        title: item.job.title,
        company: item.job.company,
        location: item.job.location,
        salary: item.job.salary_min && item.job.salary_max 
          ? `${item.job.currency || '$'}${item.job.salary_min.toLocaleString()} - ${item.job.currency || '$'}${item.job.salary_max.toLocaleString()}`
          : undefined,
        description: item.job.snippet || '',
        skills: item.job.tags || [],
        jobUrl: item.job.redirect_url,
        savedAt: item.saved_at,
        status: item.status as 'saved' | 'applied' | 'archived',
        notes: undefined, // Notes not yet supported in backend
      }));

      // Save to localStorage
      const storageKey = this.getUserStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(localJobs));
      console.log(`Synced ${localJobs.length} saved jobs from backend`);
    } catch (error) {
      console.error('Error syncing saved jobs from backend:', error);
    }
  }

  // Save a job to backend
  async saveJobToBackend(jobId: string): Promise<boolean> {
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.log('No auth token, cannot save to backend');
        return false;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      
      // The backend saves jobs automatically when you swipe right/like
      // So we just need to ensure it's marked as saved
      // For now, we'll just rely on the swipe endpoint
      console.log('Job saving to backend is handled by the swipe endpoint');
      return true;
    } catch (error) {
      console.error('Error saving job to backend:', error);
      return false;
    }
  }

  // Update job status on backend
  async updateJobStatusOnBackend(jobId: string, status: 'saved' | 'applied' | 'archived'): Promise<boolean> {
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.log('No auth token, cannot update status on backend');
        return false;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/jobs/me/saved-jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(status),
      });

      if (!response.ok) {
        console.error('Failed to update job status on backend:', response.status);
        return false;
      }

      console.log(`Updated job ${jobId} status to ${status} on backend`);
      return true;
    } catch (error) {
      console.error('Error updating job status on backend:', error);
      return false;
    }
  }

  // Remove a saved job from backend
  async removeSavedJobFromBackend(jobId: string): Promise<boolean> {
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.log('No auth token, cannot remove from backend');
        return false;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/jobs/me/saved-jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to remove saved job from backend:', response.status);
        return false;
      }

      console.log(`Removed job ${jobId} from backend`);
      return true;
    } catch (error) {
      console.error('Error removing saved job from backend:', error);
      return false;
    }
  }

  // Get all saved jobs (user-scoped)
  getSavedJobs(): SavedJob[] {
    try {
      const storageKey = this.getUserStorageKey();
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error retrieving saved jobs:', error);
      return [];
    }
  }

  // Save a job (user-scoped)
  saveJob(job: Omit<SavedJob, 'savedAt' | 'status'>): boolean {
    try {
      const savedJobs = this.getSavedJobs();
      
      // Ensure ID is a string for consistency
      const jobWithStringId = {
        ...job,
        id: String(job.id)
      };
      
      // Check if job already exists
      if (savedJobs.some(savedJob => savedJob.id === jobWithStringId.id)) {
        return false; // Job already saved
      }

      const newSavedJob: SavedJob = {
        ...jobWithStringId,
        savedAt: new Date().toISOString(),
        status: 'saved'
      };

      savedJobs.push(newSavedJob);
      const storageKey = this.getUserStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(savedJobs));
      return true;
    } catch (error) {
      console.error('Error saving job:', error);
      return false;
    }
  }

  // Remove a saved job (user-scoped)
  async removeSavedJob(jobId: string): Promise<boolean> {
    try {
      const savedJobs = this.getSavedJobs();
      const filteredJobs = savedJobs.filter(job => job.id !== jobId);
      
      if (filteredJobs.length !== savedJobs.length) {
        const storageKey = this.getUserStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(filteredJobs));
        
        // Also remove from backend
        await this.removeSavedJobFromBackend(jobId);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing saved job:', error);
      return false;
    }
  }

  // Update job status
  async updateJobStatus(jobId: string, status: SavedJob['status']): Promise<boolean> {
    try {
      const savedJobs = this.getSavedJobs();
      const jobIndex = savedJobs.findIndex(job => job.id === jobId);
      
      if (jobIndex !== -1) {
        savedJobs[jobIndex].status = status;
        const storageKey = this.getUserStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(savedJobs));
        
        // Also update on backend
        await this.updateJobStatusOnBackend(jobId, status);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating job status:', error);
      return false;
    }
  }

  // Update job notes
  updateJobNotes(jobId: string, notes: string): boolean {
    try {
      const savedJobs = this.getSavedJobs();
      const jobIndex = savedJobs.findIndex(job => job.id === jobId);
      
      if (jobIndex !== -1) {
        savedJobs[jobIndex].notes = notes;
        const storageKey = this.getUserStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(savedJobs));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating job notes:', error);
      return false;
    }
  }

  // Check if a job is saved
  isJobSaved(jobId: string | number): boolean {
    const savedJobs = this.getSavedJobs();
    const jobIdStr = String(jobId);
    return savedJobs.some(job => job.id === jobIdStr);
  }

  // Get filtered jobs
  getFilteredJobs(filters: SavedJobsFilters = {}): SavedJob[] {
    let jobs = this.getSavedJobs();

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      jobs = jobs.filter(job => job.status === filters.status);
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      jobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.company.toLowerCase().includes(searchTerm) ||
        job.location.toLowerCase().includes(searchTerm) ||
        job.skills.some(skill => skill.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by location
    if (filters.location) {
      jobs = jobs.filter(job => 
        job.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    // Filter by skills
    if (filters.skills && filters.skills.length > 0) {
      jobs = jobs.filter(job => 
        filters.skills!.some(skill => 
          job.skills.some(jobSkill => 
            jobSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Filter by salary range
    if (filters.salary && (filters.salary.min || filters.salary.max)) {
      jobs = jobs.filter(job => {
        if (!job.salary) return false;
        
        // Extract salary numbers (basic parsing)
        const salaryMatch = job.salary.match(/[\d,]+/g);
        if (!salaryMatch) return false;
        
        const salaryValue = parseInt(salaryMatch[0].replace(/,/g, ''));
        
        if (filters.salary!.min && salaryValue < filters.salary!.min) return false;
        if (filters.salary!.max && salaryValue > filters.salary!.max) return false;
        
        return true;
      });
    }

    // Sort by most recently saved
    return jobs.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  // Get jobs statistics
  getJobsStats() {
    const jobs = this.getSavedJobs();
    return {
      total: jobs.length,
      saved: jobs.filter(job => job.status === 'saved').length,
      applied: jobs.filter(job => job.status === 'applied').length,
      archived: jobs.filter(job => job.status === 'archived').length
    };
  }

  // Export jobs data
  exportJobs(): string {
    const jobs = this.getSavedJobs();
    return JSON.stringify(jobs, null, 2);
  }

  // Import jobs data
  importJobs(jsonData: string): boolean {
    try {
      const jobs = JSON.parse(jsonData) as SavedJob[];
      
      // Validate the data structure
      if (!Array.isArray(jobs)) {
        throw new Error('Invalid data format');
      }

      // Merge with existing jobs, avoiding duplicates
      const existingJobs = this.getSavedJobs();
      const existingIds = new Set(existingJobs.map(job => job.id));
      
      const newJobs = jobs.filter(job => !existingIds.has(job.id));
      const mergedJobs = [...existingJobs, ...newJobs];
      
      const storageKey = this.getUserStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(mergedJobs));
      return true;
    } catch (error) {
      console.error('Error importing jobs:', error);
      return false;
    }
  }
}

export const savedJobsService = new SavedJobsService();