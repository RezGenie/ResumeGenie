'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

  // Helper function to clear all auth state
  const clearAuthState = useCallback(() => {
    console.log('Clearing all auth state...');
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=strict';
  }, []);

  // Define refreshToken first
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/refresh`, {
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
      clearAuthState();
      router.push('/auth');
    }
  }, [router, clearAuthState]);

  // Check if user is authenticated on mount
  useEffect(() => {
    console.log('AuthProvider: Checking auth on mount...');
    checkAuth();
  }, []);

  // Add immediate clear function for debugging
  useEffect(() => {
    // Force clear if there's any inconsistent state
    const clearStaleAuth = () => {
      const token = localStorage.getItem('auth_token');
      if (!token && user) {
        console.log('AuthProvider: Found user without token, clearing state');
        setUser(null);
        setIsLoading(false);
      }
    };

    clearStaleAuth();
  }, [user]);

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
      console.log('CheckAuth: Starting auth check...');
      const token = localStorage.getItem('auth_token');
      console.log('CheckAuth: Token found:', !!token, token ? token.substring(0, 20) + '...' : 'none');
      
      if (!token) {
        console.log('CheckAuth: No token found, setting loading to false');
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('CheckAuth: Verifying token with backend...');
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        // Verify token with backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('CheckAuth: Backend response status:', response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log('CheckAuth: User data received:', userData);
          setUser(userData);
        } else {
          console.log('CheckAuth: Token invalid, clearing storage');
          // Token is invalid, remove it
          clearAuthState();
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.log('CheckAuth: Request timed out, clearing auth state');
        } else {
          console.error('CheckAuth: Network error:', fetchError);
        }
        // Clear tokens on timeout or error
        clearAuthState();
      }
    } catch (error) {
      console.error('CheckAuth: Auth check failed:', error);
      // Clear tokens on error
      clearAuthState();
    } finally {
      console.log('CheckAuth: Setting loading to false');
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', email); // Backend expects 'username' field
      formData.append('password', password);

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login`;
      console.log('Login: Attempting login to:', apiUrl);
      console.log('Login: Environment API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('Login: Form data:', { username: email, password: '***' });

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Login: Response status:', response.status);
      console.log('Login: Response URL:', response.url);

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.log('Login: Error response data:', errorData);
        } catch {
          console.log('Login: Could not parse error response as JSON');
          const textError = await response.text();
          console.log('Login: Error response text:', textError);
          errorMessage = textError || errorMessage;
        }
        
        // Show user-friendly toast messages
        if (response.status === 401) {
          toast.error("Invalid email or password", {
            description: "Please check your credentials and try again."
          });
        } else if (response.status === 429) {
          toast.error("Too many attempts", {
            description: "Please wait a few minutes before trying again."
          });
        } else {
          toast.error("Login failed", {
            description: errorMessage
          });
        }
        return; // Don't throw error, just return
      }

      const data = await response.json();
      console.log('Login: Response data:', data);
      
      // Store tokens
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      console.log('Login: Tokens stored');
      
      // Set cookie for middleware
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=${24 * 60 * 60}; SameSite=strict`;
      
      // Set user data
      console.log('Login: Setting user data:', data.user);
      setUser(data.user);
      
      // Show success message
      toast.success("Welcome back!", {
        description: `Logged in as ${data.user.email}`
      });
      
      // Redirect to dashboard
      console.log('Login: Redirecting to dashboard');
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      // Show generic error toast if network error or other issue
      toast.error("Connection error", {
        description: "Please check your internet connection and try again."
      });
    }
  };

  const register = async (email: string, password: string) => {
    try {
      console.log('Register: Starting registration process...');
      console.log('Register: Email:', email);
      
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/register`;
      console.log('Register: API URL:', apiUrl);
      
      const requestBody = { email, password };
      console.log('Register: Request body:', { email, password: '***' });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Register: Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        let errorDetails: unknown = null;
        
        try {
          const errorData = await response.json();
          console.log('Register: Error response:', errorData);
          console.log('Register: Error response type:', typeof errorData);
          console.log('Register: Error detail type:', typeof errorData?.detail);
          errorDetails = errorData;
          // Handle both string and array detail formats
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
            errorMessage = errorData.detail[0].msg || 'Validation error';
          } else {
            errorMessage = 'Registration failed';
          }
        } catch {
          console.log('Register: Could not parse error response');
        }
        
        // Show user-friendly toast messages based on error type
        if (response.status === 400) {
          if (errorDetails && typeof errorDetails === 'object' && 'detail' in errorDetails && Array.isArray(errorDetails.detail)) {
            // Validation errors from FastAPI/Pydantic
            const validationError = errorDetails.detail[0];
            const errorType = validationError?.type;
            const errorMsg = typeof validationError?.msg === 'string' ? validationError.msg : 'Please check your input.';
            
            if (errorType === 'string_too_short') {
              toast.error("Password too short", {
                description: "Password must be at least 8 characters long."
              });
            } else if (errorType === 'value_error') {
              toast.error("Invalid input", {
                description: errorMsg
              });
            } else if (errorType === 'string_pattern_mismatch') {
              toast.error("Password requirements not met", {
                description: "Password must meet all security requirements."
              });
            } else {
              toast.error("Validation error", {
                description: errorMsg
              });
            }
          } else if (typeof errorMessage === 'string' && errorMessage.includes('uppercase')) {
            toast.error("Password requirements not met", {
              description: "Password must contain at least one uppercase letter."
            });
          } else if (typeof errorMessage === 'string' && errorMessage.includes('special character')) {
            toast.error("Password requirements not met", {
              description: "Password must contain at least one special character."
            });
          } else if (typeof errorMessage === 'string' && errorMessage.includes('number')) {
            toast.error("Password requirements not met", {
              description: "Password must contain at least one number."
            });
          } else if (typeof errorMessage === 'string' && errorMessage.includes('already registered')) {
            toast.error("Email already exists", {
              description: "This email is already registered. Try logging in instead."
            });
          } else {
            toast.error("Registration failed", {
              description: typeof errorMessage === 'string' ? errorMessage : "Please check your input and try again."
            });
          }
        } else if (response.status === 429) {
          toast.error("Too many attempts", {
            description: "Please wait a few minutes before trying again."
          });
        } else {
          toast.error("Registration failed", {
            description: errorMessage
          });
        }
        return; // Don't throw error, just return
      }

      const data = await response.json();
      console.log('Register: Success response:', data);
      
      // Store tokens
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Set cookie for middleware
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=${24 * 60 * 60}; SameSite=strict`;
      
      // Set user data
      console.log('Register: Setting user data:', data.user);
      setUser(data.user);
      
      // Show success message
      toast.success("Account created successfully!", {
        description: `Welcome to RezGenie, ${data.user.email}!`
      });
      
      // Redirect to dashboard
      console.log('Register: Redirecting to dashboard');
      router.push('/dashboard');
    } catch (error) {
      console.error('Register: Registration error:', error);
      // Show generic error toast if network error or other issue
      toast.error("Connection error", {
        description: "Please check your internet connection and try again."
      });
    }
  };

  const logout = async () => {
    try {
      console.log('Logout: Starting logout process...');
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Logout: Calling backend logout...');
        // Call logout endpoint
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/logout`, {
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
      console.log('Logout: Clearing all auth data...');
      // Always clear local state and tokens
      clearAuthState();
      setIsLoading(false);
      
      // Show logout success message
      toast.success("Logged out successfully", {
        description: "See you next time!"
      });
      
      console.log('Logout: Redirecting to auth...');
      router.push('/auth');
    }
  };

  // Add force reset function for debugging stuck states
  const forceReset = useCallback(() => {
    console.log('ForceReset: Clearing all authentication state...');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setIsLoading(false);
    console.log('ForceReset: Auth state cleared, reloading page...');
    window.location.href = '/';
  }, []);

  // Make forceReset available globally for debugging
  useEffect(() => {
    const globalObj = globalThis as typeof globalThis & { forceAuthReset?: () => void };
    globalObj.forceAuthReset = forceReset;
    return () => {
      delete globalObj.forceAuthReset;
    };
  }, [forceReset]);

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