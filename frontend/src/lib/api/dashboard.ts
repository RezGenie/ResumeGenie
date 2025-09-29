// Dashboard API Service

import { apiClient } from './client';
import { User, DashboardStats, RecentActivity, Application, Interview, APIResponse } from './types';

export class DashboardService {
  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<APIResponse<User>> {
    return apiClient.get<APIResponse<User>>('/user/profile');
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<APIResponse<DashboardStats>> {
    return apiClient.get<APIResponse<DashboardStats>>('/dashboard/stats');
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit: number = 10): Promise<APIResponse<RecentActivity[]>> {
    return apiClient.get<APIResponse<RecentActivity[]>>(`/dashboard/activities?limit=${limit}`);
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<User>): Promise<APIResponse<User>> {
    return apiClient.put<APIResponse<User>>('/user/profile', profileData);
  }

  /**
   * Upload resume
   */
  async uploadResume(file: File): Promise<APIResponse<{ resumeUrl: string }>> {
    const formData = new FormData();
    formData.append('resume', file);

    // Get auth token safely (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Special handling for file upload - don't use JSON content type
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/user/resume`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user's applications
   */
  async getUserApplications(): Promise<APIResponse<Application[]>> {
    return apiClient.get<APIResponse<Application[]>>('/user/applications');
  }

  /**
   * Get user's interviews
   */
  async getUserInterviews(): Promise<APIResponse<Interview[]>> {
    return apiClient.get<APIResponse<Interview[]>>('/user/interviews');
  }
}

export const dashboardService = new DashboardService();