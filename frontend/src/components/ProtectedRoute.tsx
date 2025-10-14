'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // More accurate authentication check
  const isAuthenticated = !!user;

  console.log('ProtectedRoute - requireAuth:', requireAuth, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', !!user);

  useEffect(() => {
    if (!isLoading) {
      console.log('ProtectedRoute useEffect - requireAuth:', requireAuth, 'isAuthenticated:', isAuthenticated);
      
      if (requireAuth && !isAuthenticated) {
        console.log('ProtectedRoute: Redirecting to', redirectTo, 'because auth required but not authenticated');
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        // If user is authenticated but trying to access auth page, redirect to dashboard
        console.log('ProtectedRoute: Redirecting to dashboard because user is authenticated');
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, user]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Don't render protected content until auth is verified
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // For auth pages, don't render if user is already authenticated
  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}