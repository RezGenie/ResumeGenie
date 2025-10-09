// API Configuration and Base Client

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if backend is available, fall back to mock data if not
    const useMockData = false; // Disabled for Sprint 2 - using real backend
    
    if (useMockData) {
      console.log('Using mock data for endpoint:', endpoint);
      return this.getMockData(endpoint) as T;
    }

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
      }
    }

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Handle unauthorized - clear tokens and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth';
        }
        throw new Error('Unauthorized');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed, using fallback data:', error);
      
      // Return mock data as fallback when API is unavailable
      return this.getMockData(endpoint) as T;
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

  private getMockData(endpoint: string): unknown {
    // Mock data fallbacks for when API is unavailable
    if (endpoint.includes('/jobs')) {
      return {
        jobs: [
          {
            id: '1',
            title: 'Senior Software Engineer',
            company: 'TechCorp',
            location: 'San Francisco, CA',
            type: 'Full-time',
            salary: '$120,000 - $160,000',
            description: 'Join our team as a Senior Software Engineer...',
            requirements: ['5+ years experience', 'React', 'Node.js'],
            postedDate: '2025-09-20',
            saved: false
          },
          {
            id: '2',
            title: 'Frontend Developer',
            company: 'StartupXYZ',
            location: 'Remote',
            type: 'Full-time',
            salary: '$80,000 - $110,000',
            description: 'We are looking for a talented Frontend Developer...',
            requirements: ['3+ years experience', 'React', 'TypeScript'],
            postedDate: '2025-09-19',
            saved: false
          }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };
    }

    if (endpoint.includes('/user/profile')) {
      return {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        profileCompleted: 85,
        resumeUploaded: true,
        subscription: 'Free'
      };
    }

    if (endpoint.includes('/user/stats')) {
      return {
        applicationsSubmitted: 12,
        interviewsScheduled: 3,
        offersReceived: 1,
        profileViews: 45
      };
    }

    if (endpoint.includes('/user/activities')) {
      return [
        {
          id: '1',
          type: 'application',
          title: 'Applied to Senior Developer position',
          company: 'TechCorp',
          date: '2025-09-25',
          status: 'pending'
        },
        {
          id: '2',
          type: 'interview',
          title: 'Interview scheduled',
          company: 'StartupXYZ',
          date: '2025-09-24',
          status: 'scheduled'
        }
      ];
    }

    if (endpoint.includes('/jobs/recommended')) {
      return [
        {
          id: '3',
          title: 'Full Stack Developer',
          company: 'InnovateTech',
          location: 'New York, NY',
          type: 'Full-time',
          matchScore: 92
        },
        {
          id: '4',
          title: 'React Developer',
          company: 'WebSolutions',
          location: 'Remote',
          type: 'Contract',
          matchScore: 88
        }
      ];
    }

    // Default empty response
    return {};
  }
}

export const apiClient = new APIClient();