// API Configuration and Base Client

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getOrCreateGuestSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      // Generate a unique session ID based on browser fingerprint
      const userAgent = navigator.userAgent;
      const timestamp = Date.now();
      const random = Math.random().toString(36);
      sessionId = btoa(`${userAgent}_${timestamp}_${random}`).replace(/[+/=]/g, '').substring(0, 32);
      localStorage.setItem('guest_session_id', sessionId);
    }
    return sessionId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication token if available (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      } else {
        // For guest users, add session ID header
        const guestSessionId = this.getOrCreateGuestSessionId();
        config.headers = {
          ...config.headers,
          'X-Guest-Session-ID': guestSessionId,
        };
      }
    }

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Handle unauthorized - but only redirect if it's not a guest endpoint
        const isGuestEndpoint = endpoint.includes('/guest') || endpoint.includes('/genie/guest');
        if (!isGuestEndpoint && typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth';
        }
        throw new Error('Unauthorized');
      }
      
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${bodyText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();