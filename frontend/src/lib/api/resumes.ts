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
      
      // Use fetch instead of XMLHttpRequest (XMLHttpRequest has CORS issues)
      console.log('[ResumeService] Starting upload with fetch:', {
        uploadURL,
        isGuest,
        hasToken: !!token,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type
      });

      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // For guest uploads, include session ID if available
        const guestSessionId = localStorage.getItem('guest_session_id');
        if (guestSessionId) {
          headers['X-Guest-Session-ID'] = guestSessionId;
        }
      }

      const response = await fetch(uploadURL, {
        method: 'POST',
        body: formData,
        headers,
        mode: 'cors'
      });

      console.log('[ResumeService] Upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.status === 401 && !isGuest && token) {
        console.log('Authentication failed, retrying as guest...');
        // Retry as guest
        return this.uploadResume(file, { ...options, isGuest: true });
      }

      if (!response.ok) {
        let errorText = '';
        let errorDetail = '';
        try {
          const responseText = await response.text();
          errorText = responseText;
          
          // Try to parse as JSON to get the detail field
          try {
            const errorJson = JSON.parse(responseText);
            errorDetail = errorJson.detail || errorJson.message || responseText;
          } catch {
            errorDetail = responseText;
          }
        } catch {
          errorText = `HTTP ${response.status} ${response.statusText}`;
          errorDetail = errorText;
        }
        
        console.error('[ResumeService] Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          errorDetail,
          fullResponse: errorText
        });
        
        const error = this.handleUploadError(response.status, errorDetail, isGuest);
        options?.onError?.(error);
        throw error;
      }

      const result = await response.json();
      
      const message = token 
        ? `Resume "${result.original_filename}" uploaded successfully!`
        : `Resume "${result.original_filename}" uploaded! Use your magic wishes to analyze it.`;
      
      toast.success(message, {
        description: token 
          ? 'Your resume is being processed in the background.'
          : 'Your resume is ready for analysis. No account required!'
      });
      
      options?.onComplete?.(result);
      return result;

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
    let showDefaultToast = true; // Flag to control default toast
    
    // Handle case where status is 0 (network/CORS issue)
    if (status === 0) {
      errorMessage = 'Network connection failed. Please check your internet connection.';
      console.error('[ResumeService] Network error - status 0 suggests CORS or connection issue');
      toast.error('Connection failed', {
        description: 'Unable to reach the server. Please check your connection and try again.'
      });
      return new Error(errorMessage);
    }
    
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
        // Check for specific file type errors
        if (responseText.toLowerCase().includes('unsupported file type') || 
            responseText.toLowerCase().includes('only pdf and docx')) {
          errorMessage = 'File type not supported. Please upload PDF or DOCX files only.';
        }
        // Otherwise keep the server's validation message if available
        break;
      case 429:
        showDefaultToast = false; // We'll show a custom toast
        // Parse the limit details from the error message
        if (responseText.includes('Daily upload limit exceeded') || responseText.includes('Daily wish limit exceeded')) {
          const countMatch = responseText.match(/Current count: (\d+)\/(\d+)/);
          const currentCount = countMatch ? countMatch[1] : '3';
          const maxCount = countMatch ? countMatch[2] : '3';
          
          errorMessage = `Daily limit reached (${currentCount}/${maxCount} wishes)`;
          
          toast.error(errorMessage, {
            description: isGuest 
              ? 'Sign up for a free account for unlimited wishes'
              : 'You can make more wishes tomorrow',
            duration: 6000
          });
        } else {
          errorMessage = isGuest 
            ? 'Daily limit reached (3 wishes per day). Sign up for unlimited wishes!'
            : 'Daily limit reached. Please try again later.';
          
          toast.error('Daily limit reached', {
            description: errorMessage,
            duration: 5000
          });
        }
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      case 502:
        errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
        break;
      case 503:
        errorMessage = 'Service maintenance in progress. Please try again later.';
        break;
      default:
        if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (status >= 400) {
          errorMessage = 'Request failed. Please check your input and try again.';
        } else if (status === 0) {
          errorMessage = 'Connection failed. Please check your network.';
        }
    }

    // Show default toast only if we haven't shown a custom one
    if (showDefaultToast) {
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