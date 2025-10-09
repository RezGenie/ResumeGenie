"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  FileText, 
  Bot, 
  Upload,
  Briefcase,
  Calendar,
  Eye,
  Target,
  TrendingUp,
  Clock,
  MapPin,
  Building2,
  User,
  Settings,
  Bell,
  Search,
  Bookmark,
  Users
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DashboardUser, DashboardStats, RecentActivity, Job } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('Dashboard - Auth state:', { authUser, authLoading, isAuthenticated });

  // Immediate redirect if not authenticated and not loading
  useEffect(() => {
    if (!authLoading && !authUser) {
      console.log('No user and not loading - redirecting immediately to login');
      router.replace('/auth');
      return;
    }
  }, [authUser, authLoading, router]);

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
        
        // Create display name from email (until we add profile fields)
        const displayName = authUser.email.split('@')[0].charAt(0).toUpperCase() + 
                           authUser.email.split('@')[0].slice(1);
        
        setDashboardUser({
          ...authUser,
          name: displayName,
          memberSince,
          profileCompleteness: authUser.is_verified ? 75 : 25, // Basic completion based on verification
          title: 'Job Seeker',
          location: 'Getting Started',
          bio: 'Welcome to RezGenie! Complete your profile to get better job matches.',
          skills: [],
          experience: [],
          education: []
        });

        // Set basic stats with WIP message
        setStats({
          totalApplications: 0,
          pendingApplications: 0,
          interviewsScheduled: 0,
          profileViews: 0,
          matchScore: 0,
          recommendedJobs: 0
        });

        setActivities([
          {
            id: '1',
            type: 'profile_view',
            title: 'Welcome to RezGenie!',
            description: 'Dashboard features are being connected to the backend',
            timestamp: new Date().toISOString()
          }
        ]);

        setRecommendedJobs([]);
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
              <Bot className="h-8 w-8 animate-pulse mx-auto text-purple-600" />
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
              <Bot className="h-8 w-8 animate-pulse mx-auto text-purple-600" />
              <p className="text-muted-foreground">Redirecting to login...</p>
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
      <Header />
    
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
              <Avatar className="h-16 w-16">
                <AvatarImage src={dashboardUser?.profilePicture} alt={dashboardUser?.name} />
                <AvatarFallback className="bg-purple-100 text-purple-700 text-lg font-semibold">
                  {dashboardUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  Welcome back, {dashboardUser?.name?.split(' ')[0] || 'User'}!
                </h1>
                <p className="text-muted-foreground">
                  Member since {dashboardUser?.memberSince} • Profile {dashboardUser?.profileCompleteness}% complete
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </div>
          </motion.div>

          {/* WIP Notice */}
          <motion.div 
            variants={itemVariants}
            className="mb-8"
          >
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Dashboard Under Development
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      We&apos;re actively building your personalized dashboard. Some features are still being developed and will be available soon!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profile Progress */}
          {dashboardUser && dashboardUser.profileCompleteness < 100 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                        Complete Your Profile
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        A complete profile gets 3x more visibility
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {dashboardUser.profileCompleteness}%
                    </Badge>
                  </div>
                  <Progress value={dashboardUser.profileCompleteness} className="mb-4" />
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <User className="h-4 w-4 mr-2" />
                    Complete Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Applications</p>
                      <p className="text-2xl font-bold">{stats?.totalApplications || 0}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats?.pendingApplications || 0} pending responses
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Interviews</p>
                      <p className="text-2xl font-bold">{stats?.interviewsScheduled || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Scheduled this month
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                      <p className="text-2xl font-bold">{stats?.profileViews || 0}</p>
                    </div>
                    <Eye className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    +12% from last week
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Match Score</p>
                      <p className="text-2xl font-bold">{stats?.matchScore || 0}%</p>
                    </div>
                    <Target className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Average compatibility
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
                    Your latest job search activities and updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 flex-1 flex flex-col justify-center">
                        <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Start applying to jobs to see your activity here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 flex-1">
                        {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-shrink-0">
                            {activity.type === 'application' && (
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            {activity.type === 'interview' && (
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                            {activity.type === 'profile_view' && (
                              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                <Eye className="h-4 w-4 text-purple-600" />
                              </div>
                            )}
                            {activity.type === 'job_match' && (
                              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                                <Target className="h-4 w-4 text-amber-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                          </div>
                          {activity.status && (
                            <Badge 
                              variant={activity.status === 'completed' ? 'default' : 
                                     activity.status === 'pending' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {activity.status}
                            </Badge>
                          )}
                        </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Add a "View All Activity" button at the bottom */}
                  <div className="mt-6 pt-4 border-t">
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/activity">
                        <Clock className="h-4 w-4 mr-2" />
                        View All Activity
                      </a>
                    </Button>
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
                              <span className="text-xs text-muted-foreground">{job.postedDate}</span>
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
                    <Button variant="outline" className="w-full mt-4" asChild>
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
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="/genie">
                        <Upload className="h-4 w-4 mr-2" />
                        Update Resume
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Network Connections
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Application History
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Interview Schedule
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}