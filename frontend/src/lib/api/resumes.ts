import { APIClient } from './client';

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

export class ResumeService {
  private client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async uploadResume(file: File): Promise<ResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

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
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Resume upload failed');
    }

    return response.json();
  }

  async getResumes(): Promise<ResumeResponse[]> {
    return this.client.get<ResumeResponse[]>('/resumes');
  }

  async getResume(id: string): Promise<ResumeResponse> {
    return this.client.get<ResumeResponse>(`/resumes/${id}`);
  }

  async deleteResume(id: string): Promise<void> {
    await this.client.delete(`/resumes/${id}`);
  }
}

// Create and export a default instance
const apiClient = new APIClient();
export const resumeService = new ResumeService(apiClient);