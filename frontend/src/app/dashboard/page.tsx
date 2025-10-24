"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Loader2,
  Briefcase,
  Calendar,
  Eye,
  Sparkles,
  TrendingUp,
  Clock,
  MapPin,
  Building2,
  User,
  Search,
  Bookmark
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DashboardUser, DashboardStats, JobDisplay } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { userPreferencesService } from '@/lib/api/userPreferences';
import { userProfileService } from '@/lib/api/userProfile';
import { savedJobsService } from '@/lib/api/savedJobs';
import { localResumeService } from '@/lib/api/localResumes';
import { ProfileOnboarding } from '@/components/onboarding/ProfileOnboarding';

// API response interfaces
interface WishApiResponse {
  id: string;
  wish_type: string;
  wish_text: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
  results?: {
    analysis?: string;
    recommendations?: string[];
    insights?: string[];
  };
}

interface ResumeApiResponse {
  id: string;
  filename: string;
  created_at: string;
  processing_status: 'uploading' | 'processing' | 'completed' | 'failed';
  file_size?: number;
}

interface JobApiResponse {
  id: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  match_score?: number;
  created_at: string;
  comparison_results?: {
    overall_match: number;
    skills_match: number;
    experience_match: number;
  };
}

interface DailyUsageApiResponse {
  wishes_used: number;
  daily_limit: number;
  remaining_wishes: number;
}

// Enhanced activity types to support real API data
interface RecentActivity {
  id: string;
  type: 'application' | 'interview' | 'profile_view' | 'job_match' | 'wish_granted' | 'resume_upload' | 'job_comparison';
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'processing';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100
    }
  }
} as const;

export default function Dashboard() {
  console.log('Dashboard component rendering...');
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [dashboardUser, setDashboardUser] = useState<DashboardUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobsStats, setSavedJobsStats] = useState({ total: 0, saved: 0, applied: 0, archived: 0 });
  const [resumeStats, setResumeStats] = useState({ total: 0, ready: 0, processing: 0, errors: 0, hasPrimary: false });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activityTab, setActivityTab] = useState<'all' | 'jobs' | 'resumes'>('all');

  console.log('Dashboard - Auth state:', { authUser, authLoading, isAuthenticated });

  // Add timeout for auth loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.log('Auth loading timed out, redirecting to auth');
        router.replace('/auth');
      }
    }, 8000); // 8 second timeout

    return () => clearTimeout(timeout);
  }, [authLoading, router]);

  // Immediate redirect if not authenticated and not loading
  useEffect(() => {
    console.log('Dashboard redirect check:', { authLoading, authUser, isAuthenticated });

    if (!authLoading && !authUser) {
      console.log('No user and not loading - redirecting immediately to login');
      router.replace('/auth');
      return;
    }

    // Add a timeout fallback in case auth check hangs
    const fallbackTimeout = setTimeout(() => {
      if (!authUser && !authLoading) {
        console.log('Fallback timeout: redirecting to auth');
        router.replace('/auth');
      }
    }, 10000); // 10 second fallback

    return () => clearTimeout(fallbackTimeout);
  }, [authUser, authLoading, router, isAuthenticated]);

  const fetchRealDashboardData = async () => {
    try {
      const { apiClient } = await import('@/lib/api/client');

      // Fetch all dashboard data in parallel
      const [wishesData, resumesData, , jobsData] = await Promise.allSettled([
        apiClient.get<WishApiResponse[]>('/genie/'),
        apiClient.get<ResumeApiResponse[]>('/resumes/'),
        apiClient.get<DailyUsageApiResponse>('/genie/usage/daily'),
        apiClient.get<JobApiResponse[]>('/jobs/')
      ]);

      // Process API responses
      const wishes: WishApiResponse[] = wishesData.status === 'fulfilled' ? wishesData.value : [];
      const resumes: ResumeApiResponse[] = resumesData.status === 'fulfilled' ? resumesData.value : [];
      const jobs: JobApiResponse[] = jobsData.status === 'fulfilled' ? jobsData.value : [];

      // Load saved jobs stats
      const jobsStats = savedJobsService.getJobsStats();
      setSavedJobsStats(jobsStats);

      // Load resume stats
      const resumesStats = localResumeService.getResumeStats();
      setResumeStats(resumesStats);
      const avgMatchScore = jobs.length > 0
        ? jobs.reduce((acc: number, job) => acc + (job.match_score || 0), 0) / jobs.length
        : 0;

      setStats({
        totalApplications: jobs.length,
        pendingApplications: wishes.filter((w) => w.status === 'processing').length,
        interviewsScheduled: 0, // This would need a separate API
        profileViews: resumes.length * 5, // Estimated views per resume
        matchScore: Math.round(avgMatchScore),
        recommendedJobs: Math.min(jobs.length + 3, 10) // Simulate recommendations
      });

      // Create recent activity from real data
      const newActivities: RecentActivity[] = [];

      // Add recent wishes
      wishes.slice(0, 3).forEach((wish) => {
        newActivities.push({
          id: wish.id,
          type: 'wish_granted',
          title: `${wish.wish_type.replace('_', ' ')} wish granted`,
          description: wish.wish_text.substring(0, 80) + (wish.wish_text.length > 80 ? '...' : ''),
          timestamp: wish.created_at
        });
      });

      // Add recent resume uploads
      resumes.slice(0, 2).forEach((resume) => {
        newActivities.push({
          id: resume.id,
          type: 'resume_upload',
          title: 'Resume uploaded',
          description: `Uploaded: ${resume.filename}`,
          timestamp: resume.created_at
        });
      });

      // Add recent job comparisons
      jobs.slice(0, 2).forEach((job) => {
        newActivities.push({
          id: job.id,
          type: 'job_comparison',
          title: 'Job comparison completed',
          description: `${job.job_title || 'Position'} - ${job.match_score || 0}% match`,
          timestamp: job.created_at
        });
      });

      // Sort by timestamp and take most recent
      newActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(newActivities.slice(0, 5));

      // Set recommended jobs (could be enhanced with actual recommendations API)
      const transformedJobs: JobDisplay[] = jobs.slice(0, 3).map((job) => ({
        // Base Job properties
        id: job.id,
        provider: 'internal',
        provider_job_id: job.id,
        title: job.job_title || 'Untitled Position',
        company: job.company_name || 'Unknown Company',
        location: job.location || 'Location TBD',
        remote: false,
        snippet: 'Job description not available',
        redirect_url: '#',
        posted_at: job.created_at,
        created_at: job.created_at,
        updated_at: job.created_at,
        // JobDisplay extended properties
        matchScore: job.match_score || 0,
        salaryText: '$50,000 - $80,000',
        type: 'Full-time' as const,
        experience: 'Mid-level',
        skills: [],
        requirements: [],
        saved: false
      }));
      setRecommendedJobs(transformedJobs);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set fallback data on API error
      setStats({
        totalApplications: 0,
        pendingApplications: 0,
        interviewsScheduled: 0,
        profileViews: 0,
        matchScore: 0,
        recommendedJobs: 0
      });
      setActivities([{
        id: '1',
        type: 'profile_view',
        title: 'Welcome to RezGenie!',
        description: 'Upload a resume or make a wish to get started.',
        timestamp: new Date().toISOString()
      }]);
      setRecommendedJobs([]);
    }
  };

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('Profile updated, refreshing dashboard user...');
      if (authUser) {
        const profile = userProfileService.getProfile();
        const displayName = profile.name ||
          (authUser.email.split('@')[0].charAt(0).toUpperCase() +
            authUser.email.split('@')[0].slice(1));

        const preferences = userPreferencesService.getPreferences();
        const profileCompleteness = userPreferencesService.getProfileCompleteness();

        setDashboardUser(prev => prev ? {
          ...prev,
          name: displayName,
          profileCompleteness,
          title: preferences.jobTitle || 'Job Seeker',
          location: preferences.location || 'Getting Started',
          bio: preferences.skills ?
            `Looking for ${preferences.jobTitle || 'new opportunities'} • ${preferences.experienceLevel} level` :
            'Welcome to RezGenie! Complete your profile to get better job matches.',
          skills: preferences.skills ? preferences.skills.split(',').map(s => s.trim()) : [],
        } : null);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('userPreferencesUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('userPreferencesUpdated', handleProfileUpdate);
    };
  }, [authUser]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('Dashboard useEffect - authUser:', authUser, 'authLoading:', authLoading);

        // Don't proceed if auth is still loading
        if (authLoading) {
          console.log('Auth still loading, waiting...');
          return;
        }

        // Don't proceed if no user (redirect is handled in separate useEffect)
        if (!authUser) {
          console.log('No authUser - skipping dashboard setup');
          return;
        }

        // If we have a user, set up the dashboard
        setLoading(true);

        // Convert real user data to dashboard user format
        console.log('Creating dashboard user from:', authUser);
        const memberSince = new Date(authUser.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        });

        // Get saved profile or create display name from email
        const profile = userProfileService.getProfile();
        const displayName = profile.name ||
          (authUser.email.split('@')[0].charAt(0).toUpperCase() +
            authUser.email.split('@')[0].slice(1));

        // Get real profile completeness from user preferences
        const profileCompleteness = userPreferencesService.getProfileCompleteness();
        const preferences = userPreferencesService.getPreferences();
        const resumes = localResumeService.getResumes();

        // Show onboarding only if profile is significantly incomplete
        // Check if user has NO job title AND NO skills (truly incomplete)
        const hasNoPreferences = !preferences.jobTitle && !preferences.skills;

        if (hasNoPreferences && resumes.length === 0) {
          setShowOnboarding(true);
        }

        setDashboardUser({
          ...authUser,
          name: displayName,
          memberSince,
          profileCompleteness, // Use real profile completeness
          title: preferences.jobTitle || 'Job Seeker',
          location: preferences.location || 'Getting Started',
          bio: preferences.skills ?
            `Looking for ${preferences.jobTitle || 'new opportunities'} • ${preferences.experienceLevel} level` :
            'Welcome to RezGenie! Complete your profile to get better job matches.',
          skills: preferences.skills ? preferences.skills.split(',').map(s => s.trim()) : [],
          experience: [],
          education: []
        });

        // Fetch real dashboard data from APIs
        await fetchRealDashboardData();
        setLoading(false);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [authUser, authLoading]);

  // Show loading while auth is loading OR dashboard is loading
  if (authLoading || loading) {
    console.log('Dashboard is in loading state - authLoading:', authLoading, 'loading:', loading);
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-muted-foreground">
                {authLoading ? 'Checking authentication...' : 'Loading your dashboard...'}
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // If not loading and no user, this should trigger a redirect (handled in useEffect)
  // But let's show a loading state while the redirect happens
  if (!authUser && !authLoading) {
    console.log('No user and not loading - should redirect to login');
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-muted-foreground">Preparing your dashboard...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  console.log('Dashboard rendering main content, dashboardUser:', dashboardUser, 'stats:', stats);

  // Add fallback check
  if (!dashboardUser || !stats) {
    console.log('Dashboard data not ready, showing temporary content');
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Welcome to RezGenie Dashboard!</h1>
            <p className="text-muted-foreground">Dashboard is being prepared...</p>
            <p className="text-sm text-muted-foreground">
              DashboardUser: {dashboardUser ? 'Ready' : 'Loading...'}
            </p>
            <p className="text-sm text-muted-foreground">
              Stats: {stats ? 'Ready' : 'Loading...'}
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={showOnboarding ? 'opacity-0 pointer-events-none' : ''}>
        <Header />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Header with User Info */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <Avatar
                className="h-16 w-16 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push('/profile')}
              >
                <AvatarFallback className="bg-purple-600 text-white text-lg font-semibold">
                  {dashboardUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  Welcome back, <span>{dashboardUser?.name?.split(' ')[0] || 'User'}</span>!
                </h1>
                <p className="text-muted-foreground">
                  Member since {dashboardUser?.memberSince} • Profile {dashboardUser?.profileCompleteness}% complete
                </p>
              </div>
            </div>
          </motion.div>

          {/* Profile Progress */}
          {dashboardUser && dashboardUser.profileCompleteness < 80 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                        Complete Your Profile
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Complete your profile to unlock smart job filtering and personalized recommendations
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {dashboardUser.profileCompleteness}%
                    </Badge>
                  </div>
                  <Progress value={dashboardUser.profileCompleteness} className="mb-4" />
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white"
                    onClick={() => setShowOnboarding(true)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Complete Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/dashboard/my-jobs'}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">My Jobs</p>
                      <p className="text-2xl font-bold">{savedJobsStats.total}</p>
                    </div>
                    <Bookmark className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {savedJobsStats.saved} saved • {savedJobsStats.applied} applied
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/dashboard/resumes'}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">My Resumes</p>
                      <p className="text-2xl font-bold">{resumeStats.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {resumeStats.ready} ready • {resumeStats.processing} processing
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/genie'}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">My Wishes</p>
                      <p className="text-2xl font-bold">{activities.filter(a => a.type === 'wish_granted').length}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Get personalized career guidance
                      </p>
                    </div>
                    <Sparkles className="h-10 w-10 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Recent Activity */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your saved jobs, resumes, and career insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Activity Tabs */}
                  <div className="flex gap-2 mb-4 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-none border-b-2 ${activityTab === 'all'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent'
                        }`}
                      onClick={() => setActivityTab('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-none border-b-2 ${activityTab === 'jobs'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent'
                        }`}
                      onClick={() => setActivityTab('jobs')}
                    >
                      <Bookmark className="h-3 w-3 mr-1" />
                      Saved Jobs ({savedJobsStats.total})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-none border-b-2 ${activityTab === 'resumes'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent'
                        }`}
                      onClick={() => setActivityTab('resumes')}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Resumes ({resumeStats.total})
                    </Button>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {activityTab === 'all' && activities.length === 0 && (
                      <div className="text-center py-12 flex flex-col items-center justify-center">
                        <Sparkles className="h-12 w-12 text-purple-400 mb-4" />
                        <p className="text-muted-foreground font-medium">Start Your Career Journey</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                          Upload a resume, save jobs, or ask the genie for career advice to see your activity here
                        </p>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/resumes')}>
                            <FileText className="h-4 w-4 mr-1" />
                            Upload Resume
                          </Button>
                          <Button size="sm" onClick={() => router.push('/opportunities')}>
                            <Search className="h-4 w-4 mr-1" />
                            Find Jobs
                          </Button>
                        </div>
                      </div>
                    )}

                    {activityTab === 'jobs' && savedJobsStats.total === 0 && (
                      <div className="text-center py-12">
                        <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No saved jobs yet</p>
                        <Button size="sm" className="mt-4" onClick={() => router.push('/opportunities')}>
                          <Search className="h-4 w-4 mr-1" />
                          Discover Jobs
                        </Button>
                      </div>
                    )}

                    {activityTab === 'resumes' && resumeStats.total === 0 && (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No resumes uploaded</p>
                        <Button size="sm" className="mt-4" onClick={() => router.push('/dashboard/resumes')}>
                          <FileText className="h-4 w-4 mr-1" />
                          Upload Resume
                        </Button>
                      </div>
                    )}

                    {(activityTab === 'all' || activityTab === 'jobs') && savedJobsStats.total > 0 && (
                      <>
                        {savedJobsService.getSavedJobs().slice(0, activityTab === 'jobs' ? 10 : 3).map((job) => (
                          <div
                            key={job.id}
                            className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-purple-300"
                            onClick={() => router.push('/dashboard/my-jobs')}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Bookmark className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                  <h4 className="font-medium text-sm truncate">{job.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  <span className="truncate">{job.company}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{job.location}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs ml-2">
                                Saved
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {(activityTab === 'all' || activityTab === 'resumes') && resumeStats.total > 0 && (
                      <>
                        {localResumeService.getResumes().slice(0, activityTab === 'resumes' ? 10 : 3).map((resume) => (
                          <div
                            key={resume.id}
                            className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-purple-300"
                            onClick={() => router.push('/dashboard/resumes')}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{resume.fileName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                                </p>
                                {resume.analysisData && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Score: {resume.analysisData.overallScore}%
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant={resume.status === 'ready' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {resume.status === 'ready' ? 'Ready' : resume.status === 'processing' ? 'Processing' : 'Error'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    {activityTab === 'jobs' && savedJobsStats.total > 0 && (
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20"
                        onClick={() => router.push('/dashboard/my-jobs')}
                      >
                        View All Jobs
                      </Button>
                    )}
                    {activityTab === 'resumes' && resumeStats.total > 0 && (
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20"
                        onClick={() => router.push('/dashboard/resumes')}
                      >
                        View All Resumes
                      </Button>
                    )}
                    {activityTab === 'all' && (
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20"
                        onClick={() => router.push('/genie')}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Ask Genie
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sidebar */}
            <div className="space-y-6 flex flex-col h-full">

              {/* Recommended Jobs */}
              <motion.div variants={itemVariants} className="flex-1">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recommended Jobs
                    </CardTitle>
                    <CardDescription>
                      Perfect matches for your profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      {recommendedJobs.length === 0 ? (
                        <div className="text-center py-8 flex-1 flex flex-col justify-center">
                          <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">No job recommendations</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Complete your profile to get personalized recommendations
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 flex-1 overflow-y-auto">
                          {recommendedJobs.map((job) => (
                            <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{job.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Building2 className="h-3 w-3" />
                                    {job.company}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {job.location}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {job.matchScore}% match
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-muted-foreground">{new Date(job.posted_at).toLocaleDateString()}</span>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                                    <Bookmark className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" className="h-6 px-2 text-xs">
                                    View
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" className="w-full mt-4 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300" asChild>
                      <a href="/opportunities">
                        <Search className="h-4 w-4 mr-2" />
                        Discover More Jobs
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300" asChild>
                      <a href="/dashboard/my-jobs">
                        <Bookmark className="h-4 w-4 mr-2" />
                        My Jobs ({savedJobsStats.total})
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300" asChild>
                      <a href="/opportunities">
                        <Search className="h-4 w-4 mr-2" />
                        Discover Jobs
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300" asChild>
                      <a href="/dashboard/resumes">
                        <FileText className="h-4 w-4 mr-2" />
                        My Resumes ({resumeStats.total})
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300" asChild>
                      <a href="/profile">
                        <User className="h-4 w-4 mr-2" />
                        Complete Profile
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
      <div className={showOnboarding ? 'opacity-0 pointer-events-none' : ''}>
        <Footer />
      </div>

      {/* Profile Onboarding Modal */}
      <AnimatePresence mode="wait">
        {showOnboarding && (
          <ProfileOnboarding
            onComplete={() => {
              setShowOnboarding(false);
              // Refresh dashboard data without full reload
              const fetchData = async () => {
                const preferences = userPreferencesService.getPreferences();
                const profileCompleteness = userPreferencesService.getProfileCompleteness();

                if (dashboardUser) {
                  setDashboardUser({
                    ...dashboardUser,
                    profileCompleteness,
                    title: preferences.jobTitle || 'Job Seeker',
                    location: preferences.location || 'Getting Started',
                    bio: preferences.skills ?
                      `Looking for ${preferences.jobTitle || 'new opportunities'} • ${preferences.experienceLevel} level` :
                      'Welcome to RezGenie! Complete your profile to get better job matches.',
                    skills: preferences.skills ? preferences.skills.split(',').map(s => s.trim()) : [],
                  });
                }
              };
              fetchData();
            }}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}