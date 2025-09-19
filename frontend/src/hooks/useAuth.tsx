'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Cookies from 'js-cookie'
import { toast } from 'react-toastify'
import { authService } from '../services/auth'
import { User, LoginCredentials, RegisterData } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const queryClient = useQueryClient()

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = Cookies.get('access_token')
    setIsAuthenticated(!!token)
  }, [])

  // Get current user
  const { data: user, isLoading } = useQuery(
    'currentUser',
    authService.getCurrentUser,
    {
      enabled: isAuthenticated,
      retry: false,
      onError: () => {
        setIsAuthenticated(false)
        Cookies.remove('access_token')
      },
    }
  )

  // Login mutation
  const loginMutation = useMutation(authService.login, {
    onSuccess: (data) => {
      Cookies.set('access_token', data.access_token, { expires: 7 })
      setIsAuthenticated(true)
      queryClient.invalidateQueries('currentUser')
      toast.success('Login successful!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Login failed')
    },
  })

  // Register mutation
  const registerMutation = useMutation(authService.register, {
    onSuccess: () => {
      toast.success('Registration successful! Please log in.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Registration failed')
    },
  })

  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials)
  }

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data)
  }

  const logout = () => {
    Cookies.remove('access_token')
    setIsAuthenticated(false)
    queryClient.clear()
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isLoading || loginMutation.isLoading || registerMutation.isLoading,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}