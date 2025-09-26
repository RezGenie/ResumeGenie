'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Define refreshToken first
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.access_token);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout on refresh failure
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      router.push('/auth');
    }
  }, [router]);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken();
      }, 25 * 60 * 1000); // Refresh every 25 minutes
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshToken]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear tokens on error
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', email); // Backend expects 'username' field
      formData.append('password', password);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/v1/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Set cookie for middleware
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=${24 * 60 * 60}; SameSite=strict`;
      
      // Set user data
      setUser(data.user);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Set cookie for middleware
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=${24 * 60 * 60}; SameSite=strict`;
      
      // Set user data
      setUser(data.user);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Call logout endpoint
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state and tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      // Clear cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=strict';
      
      setUser(null);
      router.push('/auth');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}