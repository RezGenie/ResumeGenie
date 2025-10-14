"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Search,
  MapPin,
  DollarSign,
  Building2,
  Clock,
  Star,
  Target,
  ChevronDown,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Job, jobService } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

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

export default function JobDiscoveryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs on component mount and when filters change
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build filters object
        const filters = {
          search: searchTerm,
          location: locationFilter === "all" ? "" : locationFilter,
          salary: salaryFilter === "all" ? "" : salaryFilter,
        };

        const response = await jobService.getJobs(filters, 1, 50);
        
        if (response.success) {
          setJobs(response.data);
        } else {
          setError(response.message || "Failed to fetch jobs");
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setError("Unable to load jobs. Please check your connection and try again.");
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [searchTerm, locationFilter, salaryFilter]);

  // Filter and sort jobs based on search criteria
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (job.skills || []).some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesLocation = locationFilter === "all" || 
                             (locationFilter === "remote" && job.location.toLowerCase().includes("remote")) ||
                             (locationFilter === "hybrid" && job.location.toLowerCase().includes("hybrid")) ||
                             (locationFilter === "onsite" && !job.location.toLowerCase().includes("remote") && !job.location.toLowerCase().includes("hybrid"));

      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "match":
          return b.matchScore - a.matchScore;
        case "salary":
          // Simple salary comparison (would need more sophisticated parsing in real app)
          return b.salary.localeCompare(a.salary);
        case "recent":
          return a.postedDate.localeCompare(b.postedDate);
        default:
          return 0;
      }
    });

  // Handle job save/unsave
  const handleToggleSaveJob = async (jobId: string) => {
    try {
      await jobService.toggleSaveJob(jobId);
      // Update local state
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, saved: !job.saved } : job
      ));
    } catch (err) {
      console.error('Failed to toggle job save status:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-muted-foreground">Finding the best opportunities for you...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h2 className="text-xl font-semibold">Unable to Load Jobs</h2>
              <p className="text-muted-foreground max-w-md">
                {error}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="whitespace-nowrap"
              >
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              Discover Your Next Opportunity
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find jobs that match your skills and experience. See compatibility scores and get personalized recommendations.
            </p>
          </motion.div>

          {/* Under Development Notice */}
          <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
            <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-600">
                    Job Discovery Under Development
                  </h3>
                  <div className="mt-2 text-sm text-amber-600">
                    <p>
                      We&apos;re currently building job scraping and real-time job data integration. The jobs shown below are demo data to showcase the interface and functionality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Search and Filters */}
          <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 border-purple-200/50 dark:border-purple-700/50 shadow-lg">
              <div className="flex flex-col md:flex-row gap-4 p-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400 h-5 w-5" />
                    <Input
                      placeholder="Search jobs by title, skills, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-700 hover:border-purple-400 focus:border-purple-500 dark:hover:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 shadow-sm focus:shadow-md placeholder:text-purple-400 dark:placeholder:text-purple-500 h-12 text-base"
                    />
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[180px] justify-between">
                      {locationFilter === "all" ? "All Locations" :
                       locationFilter === "remote" ? "Remote" :
                       locationFilter === "hybrid" ? "Hybrid" : "On-site"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setLocationFilter("all")}>
                      All Locations
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocationFilter("remote")}>
                      Remote
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocationFilter("hybrid")}>
                      Hybrid
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocationFilter("onsite")}>
                      On-site
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[180px] justify-between">
                      {salaryFilter === "all" ? "Any Salary" :
                       salaryFilter === "0-50k" ? "Under $50k" :
                       salaryFilter === "50k-100k" ? "$50k - $100k" :
                       salaryFilter === "100k-150k" ? "$100k - $150k" : "$150k+"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSalaryFilter("all")}>
                      Any Salary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSalaryFilter("0-50k")}>
                      Under $50k
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSalaryFilter("50k-100k")}>
                      $50k - $100k
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSalaryFilter("100k-150k")}>
                      $100k - $150k
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSalaryFilter("150k+")}>
                      $150k+
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          </motion.div>

          {/* Job Results */}
          <motion.div variants={itemVariants} className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {filteredJobs.length} Job{filteredJobs.length !== 1 ? 's' : ''} Found
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-between">
                    {sortBy === "match" ? "Best Match" :
                     sortBy === "salary" ? "Highest Salary" : "Most Recent"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("match")}>
                    Best Match
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("salary")}>
                    Highest Salary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("recent")}>
                    Most Recent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                            {job.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            {job.company}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {job.salary}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4 text-purple-600" />
                            <span className="font-bold text-purple-600">{job.matchScore}%</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {job.type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">Required Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(job.skills || []).slice(0, 4).map((skill, skillIndex) => (
                            <Badge key={skillIndex} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {(job.skills || []).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{(job.skills || []).length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {job.postedDate}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleToggleSaveJob(job.id)}
                            className={job.saved ? "bg-purple-50 border-purple-200 text-purple-700" : ""}
                          >
                            {job.saved ? "Saved" : "Save"}
                          </Button>
                          <Button size="sm" className="whitespace-nowrap">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <motion.div
                variants={itemVariants}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl">🔍</div>
                  <h3 className="text-xl font-semibold">No jobs found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters to find more opportunities.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
    </ProtectedRoute>
  );
}