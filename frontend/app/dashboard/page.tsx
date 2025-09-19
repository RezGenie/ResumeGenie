'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/hooks/useAuth'
import { Sparkles, Upload, Target, Star, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <p className="text-secondary-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Navigation */}
      <nav className="p-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-800">RezGenie</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-secondary-600">Welcome, {user.full_name}</span>
            <button onClick={logout} className="btn btn-secondary flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">
            Welcome back, {user.full_name.split(' ')[0]}! ✨
          </h1>
          <p className="text-secondary-600">
            Ready to enhance your job search with AI-powered insights?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <Upload className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Resume</h3>
            <p className="text-secondary-600 mb-4">
              Upload your resume to get started with AI-powered analysis
            </p>
            <button className="btn btn-primary w-full">Upload Now</button>
          </div>

          <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <Target className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analyze Job Fit</h3>
            <p className="text-secondary-600 mb-4">
              Compare your resume against job descriptions
            </p>
            <button className="btn btn-primary w-full">Start Analysis</button>
          </div>

          <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <Star className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Daily Wishes</h3>
            <p className="text-secondary-600 mb-4">
              Get your daily AI-powered career insights
            </p>
            <button className="btn btn-primary w-full">View Wishes</button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-bold text-primary-900 mb-6">Your Stats</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">0</div>
              <div className="text-secondary-600">Resumes Uploaded</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">0</div>
              <div className="text-secondary-600">Jobs Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">3</div>
              <div className="text-secondary-600">Wishes Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">0</div>
              <div className="text-secondary-600">Applications Tracked</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-primary-900 mb-6">Recent Activity</h2>
          <div className="text-center py-12">
            <div className="text-secondary-400 mb-4">
              <Target className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-secondary-600">No activity yet. Upload your first resume to get started!</p>
          </div>
        </div>
      </div>
    </div>
  )
}