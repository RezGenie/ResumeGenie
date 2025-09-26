"use client";

import { useState, useEffect } from "react";
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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Footer } from "@/components/footer";
import { User as UserType, DashboardStats, RecentActivity, Job } from "@/lib/api";

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
  const [user, setUser] = useState<UserType | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Import services inside the component to ensure they're only used client-side
        const { dashboardService } = await import('@/lib/api/dashboard');
        const { jobService } = await import('@/lib/api/jobs');
        
        // Make API calls in parallel
        const results = await Promise.allSettled([
          dashboardService.getUserProfile(),
          dashboardService.getDashboardStats(),
          dashboardService.getRecentActivities(8),
          jobService.getRecommendedJobs(4)
        ]);

        // Handle user profile
        if (results[0].status === 'fulfilled' && results[0].value.success) {
          setUser(results[0].value.data);
        }

        // Handle dashboard stats
        if (results[1].status === 'fulfilled' && results[1].value.success) {
          setStats(results[1].value.data);
        }

        // Handle recent activities
        if (results[2].status === 'fulfilled' && results[2].value.success) {
          setActivities(results[2].value.data);
        }

        // Handle recommended jobs
        if (results[3].status === 'fulfilled' && results[3].value.success) {
          setRecommendedJobs(results[3].value.data);
        }

        // Check if all API calls failed
        const allFailed = results.every(result => result.status === 'rejected');
        if (allFailed) {
          console.warn('All API calls failed - dashboard will show empty state');
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Bot className="h-8 w-8 animate-pulse mx-auto text-purple-600" />
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <ProtectedRoute>
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
                <AvatarImage src={user?.profilePicture} alt={user?.name} />
                <AvatarFallback className="bg-purple-100 text-purple-700 text-lg font-semibold">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'}!
                </h1>
                <p className="text-muted-foreground">
                  Member since {user?.memberSince} • Profile {user?.profileCompleteness}% complete
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

          {/* Profile Progress */}
          {user && user.profileCompleteness < 100 && (
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
                      {user.profileCompleteness}%
                    </Badge>
                  </div>
                  <Progress value={user.profileCompleteness} className="mb-4" />
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your latest job search activities and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Start applying to jobs to see your activity here
                        </p>
                      </div>
                    ) : (
                      activities.map((activity) => (
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
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Recommended Jobs */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recommended Jobs
                    </CardTitle>
                    <CardDescription>
                      Perfect matches for your profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recommendedJobs.length === 0 ? (
                        <div className="text-center py-8">
                          <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">No job recommendations</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Complete your profile to get personalized recommendations
                          </p>
                        </div>
                      ) : (
                        recommendedJobs.map((job) => (
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
                        ))
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
    </ProtectedRoute>
  );
}