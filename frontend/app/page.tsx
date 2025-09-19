import Link from 'next/link'
import { Sparkles, FileText, Target, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-800">RezGenie</span>
          </div>
          
          <div className="space-x-4">
            <Link href="/login" className="btn btn-secondary">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-primary-900 mb-6">
            Your AI-Powered Resume Genie
          </h1>
          <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
            Upload your resume, get AI-powered job fit scores, daily career wishes, 
            and unlock the magic of smarter job applications.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link href="/register" className="btn btn-primary text-lg px-8 py-3">
              Start Your Journey
            </Link>
            <Link href="/demo" className="btn btn-secondary text-lg px-8 py-3">
              See Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="card p-8 text-center">
            <FileText className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Smart Resume Analysis</h3>
            <p className="text-secondary-600">
              Upload your resume and get AI-powered parsing with skill extraction 
              and ATS optimization tips.
            </p>
          </div>

          <div className="card p-8 text-center">
            <Target className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Job Fit Scoring</h3>
            <p className="text-secondary-600">
              Compare your resume against job descriptions and get detailed 
              fit scores with missing skills analysis.
            </p>
          </div>

          <div className="card p-8 text-center">
            <Zap className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Daily Genie Wishes</h3>
            <p className="text-secondary-600">
              Get 3 daily AI-powered career tips, ATS advice, and personalized 
              skill development recommendations.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <div className="card p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-primary-900 mb-4">
              Ready to Transform Your Job Search?
            </h2>
            <p className="text-lg text-secondary-600 mb-8">
              Join thousands of professionals who've improved their resume game with RezGenie
            </p>
            <Link href="/register" className="btn btn-primary text-lg px-12 py-4">
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}