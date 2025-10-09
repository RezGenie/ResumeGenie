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

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (response: ResumeResponse) => void;
  onError?: (error: Error) => void;
  isGuest?: boolean;
}

export class ResumeService {
  private client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async uploadResume(file: File, options?: UploadOptions): Promise<ResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Get auth token (optional for guest users)
      const token = localStorage.getItem('auth_token');
      
      // Validate file before upload
      this.validateFile(file);

      // Get the base URL from the client
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      
      // Determine if we should use guest upload
      const isGuest = options?.isGuest || !token;
      const uploadURL = isGuest 
        ? `${baseURL}/resumes/upload/guest`
        : `${baseURL}/resumes/upload`;
      
      // Create XMLHttpRequest for progress tracking
      return new Promise<ResumeResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            options?.onProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              const message = token 
                ? `Resume "${result.original_filename}" uploaded successfully!`
                : `Resume "${result.original_filename}" uploaded! Use your magic wishes to analyze it.`;
              
              toast.success(message, {
                description: token 
                  ? 'Your resume is being processed in the background.'
                  : 'Your resume is ready for analysis. No account required!'
              });
              options?.onComplete?.(result);
              resolve(result);
            } catch {
              const error = new Error('Failed to parse server response');
              options?.onError?.(error);
              reject(error);
            }
          } else {
            // Handle authentication errors by retrying as guest
            if (xhr.status === 401 && !isGuest && token) {
              console.log('Authentication failed, retrying as guest...');
              // Retry the upload as guest
              this.retryAsGuest(file, options, resolve, reject);
              return;
            }
            
            const statusVal = typeof xhr.status === 'number' ? xhr.status : 0
            const responseVal = xhr.responseText || xhr.statusText || ''
            const error = this.handleUploadError(statusVal, responseVal, isGuest);
            options?.onError?.(error);
            reject(error);
          }
        });

        // Network error - show toast after a short delay to avoid flash on transient glitches
        const showNetworkError = () => {
          const error = new Error('Network connection failed');
          toast.error('Unable to connect to server', {
            description: 'Please check your connection and try again.'
          });
          options?.onError?.(error);
          reject(error);
        }

        xhr.addEventListener('error', () => {
          // wait briefly before reporting to give transient network glitches a chance to resolve
          setTimeout(showNetworkError, 800);
        });

        // Also handle request timeouts explicitly
        xhr.timeout = 20000; // 20s
        xhr.addEventListener('timeout', () => {
          setTimeout(() => {
            const error = new Error('Request timed out');
            toast.error('Request timed out', {
              description: 'The server is taking too long to respond. Try again later.'
            });
            options?.onError?.(error);
            reject(error);
          }, 200);
        });

        xhr.open('POST', uploadURL);
        
        // Set headers
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        } else {
          // For guest uploads, include session ID if available
          const guestSessionId = localStorage.getItem('guest_session_id');
          if (guestSessionId) {
            xhr.setRequestHeader('X-Guest-Session-ID', guestSessionId);
          }
        }
        
        xhr.send(formData);
      });

    } catch (error) {
      console.error('Resume upload error:', error);
      
      const errorObj = error instanceof Error ? error : new Error('Upload failed');
      
      // Show user-friendly error message
      toast.error('Upload failed', {
        description: errorObj.message
      });
      
      options?.onError?.(errorObj);
      throw errorObj;
    }
  }

  private validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > maxSize) {
      throw new Error('File is too large. Please choose a file smaller than 10MB.');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file format. Please upload a PDF or DOCX file.');
    }
  }

  private handleUploadError(status: number, responseText: string, isGuest: boolean = false): Error {
    let errorMessage = 'Resume upload failed';
    
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If the server returned plain text, use a truncated version for visibility
      if (responseText && responseText.trim().length > 0) {
        const plain = responseText.trim()
        errorMessage = plain.length > 200 ? plain.slice(0, 200) + '...' : plain
      }
    }

    switch (status) {
      case 401:
        errorMessage = isGuest 
          ? 'Session expired. Please refresh the page and try again.'
          : 'Authentication expired. Please log in again.';
        break;
      case 404:
        errorMessage = 'Upload endpoint not found. Please contact support.';
        break;
      case 413:
        errorMessage = 'File is too large. Please choose a file smaller than 10MB.';
        break;
      case 400:
        // Keep the server's validation message if available
        break;
      case 429:
        errorMessage = isGuest 
          ? 'Daily upload limit reached (3 files per day). Sign up for unlimited uploads!'
          : 'Upload limit reached. Please try again later.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
    }

    // Append status code to help with debugging
    const toastMessage = `${errorMessage}${status ? ` (status ${status})` : ''}`

    // If this looks like an S3/MinIO related error, give a hint
    const lower = (responseText || '').toLowerCase()
    if (lower.includes('minio') || lower.includes('s3') || lower.includes('bucket')) {
      toast.error('Upload failed (storage error)', {
        description: `${toastMessage} — storage service may be down.`
      })
    } else {
      toast.error('Upload failed', {
        description: toastMessage
      })
    }

    console.error('[ResumeService] upload error details:', { status, responseText })

    return new Error(errorMessage);
  }

  private getGuestUploadCount(): number {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('guest_uploads');
    
    if (!savedData) return 0;
    
    try {
      const data = JSON.parse(savedData);
      return data.date === today ? data.count : 0;
    } catch {
      return 0;
    }
  }

  private incrementGuestUploadCount(): void {
    const today = new Date().toDateString();
    const currentCount = this.getGuestUploadCount();
    
    localStorage.setItem('guest_uploads', JSON.stringify({
      date: today,
      count: currentCount + 1
    }));
  }

  private retryAsGuest(
    file: File, 
    options: UploadOptions | undefined, 
    resolve: (value: ResumeResponse) => void, 
    reject: (reason: Error) => void
  ): void {
    // Retry the upload as guest
    const guestOptions = { ...options, isGuest: true };
    this.uploadResume(file, guestOptions)
      .then(resolve)
      .catch(reject);
  }

  async getResumes(): Promise<ResumeResponse[]> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      return await this.client.get<ResumeResponse[]>('/resumes');
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      
      if (error instanceof Error && error.message.includes('Authentication')) {
        toast.error('Please log in to view your resumes');
        return [];
      }
      
      toast.error('Failed to load resumes', {
        description: 'There was an issue loading your resume history.'
      });
      return [];
    }
  }

  async getResume(id: string): Promise<ResumeResponse> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return this.client.get<ResumeResponse>(`/resumes/${id}`);
  }

  async deleteResume(id: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    await this.client.delete(`/resumes/${id}`);
    toast.success('Resume deleted successfully');
  }

  async getResumeProcessingStatus(id: string): Promise<{ status: string; progress?: number }> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return this.client.get<{ status: string; progress?: number }>(`/resumes/${id}/status`);
  }
}

// Create and export a default instance
const apiClient = new APIClient();
export const resumeService = new ResumeService(apiClient);