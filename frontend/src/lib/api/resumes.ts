import { APIClient } from './client';
import { toast } from 'sonner';

export interface ResumeResponse {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  is_processed: boolean;
  processing_status: string;
  processing_error?: string;
  created_at: string;
  processed_at?: string;
  word_count?: number;
}

// Mock resume response for fallback
const createMockResumeResponse = (file: File): ResumeResponse => ({
  id: `mock-${Date.now()}`,
  filename: file.name,
  original_filename: file.name,
  file_size: file.size,
  mime_type: file.type,
  is_processed: false,
  processing_status: 'pending',
  created_at: new Date().toISOString(),
  word_count: Math.floor(Math.random() * 500) + 100
});

export class ResumeService {
  private client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async uploadResume(file: File): Promise<ResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Get the base URL from the client
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      
      const response = await fetch(`${baseURL}/resumes/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - browser will set it with boundary
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        // If it's a 404, the endpoint doesn't exist yet
        if (response.status === 404) {
          console.warn('Resume upload endpoint not available, using fallback');
          toast.info('Resume upload is under development. Your file has been processed locally.');
          return this.createFallbackResponse(file);
        }

        const errorData = await response.json().catch(() => ({ detail: 'Resume upload failed' }));
        throw new Error(errorData.detail || 'Resume upload failed');
      }

      const result = await response.json();
      toast.success('Resume uploaded successfully!');
      return result;

    } catch (error) {
      console.error('Resume upload error:', error);
      
      // Network error or other issues - provide fallback
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Backend unavailable, using fallback for resume upload');
        toast.info('Resume upload is under development. Your file has been processed locally.');
        return this.createFallbackResponse(file);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  private createFallbackResponse(file: File): ResumeResponse {
    const mockResponse = createMockResumeResponse(file);
    
    // Store in localStorage for demo purposes
    try {
      const existingResumes = JSON.parse(localStorage.getItem('demo_resumes') || '[]');
      existingResumes.push(mockResponse);
      localStorage.setItem('demo_resumes', JSON.stringify(existingResumes));
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
    }
    
    // Simulate processing delay
    setTimeout(() => {
      toast.info('Resume processing completed (simulated)');
    }, 2000);
    
    return mockResponse;
  }

  async getResumes(): Promise<ResumeResponse[]> {
    try {
      return await this.client.get<ResumeResponse[]>('/resumes');
    } catch (error) {
      console.warn('Failed to fetch resumes, returning demo data:', error);
      
      // Return demo data from localStorage
      try {
        const demoResumes = JSON.parse(localStorage.getItem('demo_resumes') || '[]');
        if (demoResumes.length > 0) {
          toast.info(`Showing ${demoResumes.length} resume(s) from demo storage`);
          return demoResumes;
        }
      } catch (error) {
        console.warn('Could not load demo resumes:', error);
      }
      
      toast.info('Resume history is under development');
      return [];
    }
  }

  async getResume(id: string): Promise<ResumeResponse> {
    return this.client.get<ResumeResponse>(`/resumes/${id}`);
  }

  async deleteResume(id: string): Promise<void> {
    await this.client.delete(`/resumes/${id}`);
  }

  // Development utility methods
  clearDemoData(): void {
    try {
      localStorage.removeItem('demo_resumes');
      toast.success('Demo resume data cleared');
    } catch (error) {
      console.warn('Could not clear demo data:', error);
    }
  }

  getDemoDataCount(): number {
    try {
      const demoResumes = JSON.parse(localStorage.getItem('demo_resumes') || '[]');
      return demoResumes.length;
    } catch {
      return 0;
    }
  }
}

// Create and export a default instance
const apiClient = new APIClient();
export const resumeService = new ResumeService(apiClient);