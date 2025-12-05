"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  DollarSign,
  Building2,
  Clock,
  Bookmark,
  Star,
  Target,
  ChevronDown,
  Loader2,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookmarkCheck,
  Filter,
  X,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { JobDisplay, JobStats, jobService } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JobSwipeDeck } from "@/components/jobs/JobSwipeDeck";
import { JobDetailsModal } from "@/components/jobs/JobDetailsModal";
import { savedJobsService } from "@/lib/api/savedJobs";

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
  const [geoLocationFilter, setGeoLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");
  const [datePostedFilter, setDatePostedFilter] = useState("all");
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [companySizeFilter, setCompanySizeFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [jobs, setJobs] = useState<JobDisplay[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingFromPreferences, setIsRefreshingFromPreferences] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 12;

  // Mobile swipe state
  const [selectedJob, setSelectedJob] = useState<JobDisplay | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  // Filter UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load user preferences from backend on mount (one-time)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { userPreferencesService } = await import('@/lib/api/userPreferences');
        await userPreferencesService.loadPreferencesFromBackend();
        console.log('✅ Loaded user preferences from backend');
      } catch (error) {
        console.warn('Could not load preferences from backend:', error);
      }
    };

    loadPreferences();
  }, []); // Run once on mount

  // Fetch jobs on component mount and when filters change
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setError(null);
        setIsSearching(true);

        // Sync saved jobs from backend first
        await savedJobsService.syncSavedJobsFromBackend();

        // Build filters object
        const filters = {
          search: searchTerm,
          location: locationFilter === "all" ? "" : locationFilter,
          salary: salaryFilter === "all" ? "" : salaryFilter,
        };

        const response = await jobService.getJobs(filters, 0, 50);

        if (response.success) {
          // Mark jobs as saved if they exist in saved jobs
          const jobsWithSavedStatus = response.data.map(job => ({
            ...job,
            saved: savedJobsService.isJobSaved(job.id)
          }));
          setJobs(jobsWithSavedStatus);
        } else {
          setError(response.message || "Failed to fetch jobs");
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setError("Unable to load jobs. Please check your connection and try again.");
        setJobs([]);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    };

    // Also fetch job stats
    const fetchJobStats = async () => {
      try {
        const statsResponse = await jobService.getJobStats();
        if (statsResponse.success) {
          setJobStats(statsResponse.data);
        }
      } catch (err) {
        console.error('Failed to fetch job stats:', err);
      }
    };

    fetchJobs();
    fetchJobStats();
  }, [searchTerm, locationFilter, salaryFilter]);

  // Listen for preference changes and refresh jobs
  useEffect(() => {
    const handlePreferencesUpdate = () => {
      setIsRefreshingFromPreferences(true);

      // Trigger a re-fetch by updating a state that's in the dependency array
      // We'll just re-run the fetch by calling it directly
      const fetchJobs = async () => {
        try {
          setError(null);

          const filters = {
            search: searchTerm,
            location: locationFilter === "all" ? "" : locationFilter,
            salary: salaryFilter === "all" ? "" : salaryFilter,
          };

          const response = await jobService.getJobs(filters, 0, 50);

          if (response.success) {
            const jobsWithSavedStatus = response.data.map(job => ({
              ...job,
              saved: savedJobsService.isJobSaved(job.id)
            }));
            setJobs(jobsWithSavedStatus);
          } else {
            setError(response.message || "Failed to fetch jobs");
          }
        } catch (err) {
          console.error('Failed to fetch jobs:', err);
          setError("Unable to load jobs. Please check your connection and try again.");
          setJobs([]);
        } finally {
          setIsRefreshingFromPreferences(false);
        }
      };

      fetchJobs();
    };

    window.addEventListener('userPreferencesUpdated', handlePreferencesUpdate);

    return () => {
      window.removeEventListener('userPreferencesUpdated', handlePreferencesUpdate);
    };
  }, [searchTerm, locationFilter, salaryFilter]);

  // Filter and sort jobs based on search criteria
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.skills || []).some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesLocation = locationFilter === "all" ||
        (locationFilter === "remote" && (job.remote || job.location.toLowerCase().includes("remote"))) ||
        (locationFilter === "hybrid" && job.location.toLowerCase().includes("hybrid")) ||
        (locationFilter === "onsite" && !job.remote && !job.location.toLowerCase().includes("remote") && !job.location.toLowerCase().includes("hybrid"));

      const matchesGeoLocation = geoLocationFilter === "" ||
        job.location.toLowerCase().includes(geoLocationFilter.toLowerCase());

      const matchesExperience = experienceFilter === "all" ||
        (experienceFilter === "entry" && (job.title.toLowerCase().includes("entry") || job.title.toLowerCase().includes("junior"))) ||
        (experienceFilter === "mid" && (job.title.toLowerCase().includes("mid") || (!job.title.toLowerCase().includes("senior") && !job.title.toLowerCase().includes("junior") && !job.title.toLowerCase().includes("entry")))) ||
        (experienceFilter === "senior" && (job.title.toLowerCase().includes("senior") || job.title.toLowerCase().includes("sr."))) ||
        (experienceFilter === "lead" && (job.title.toLowerCase().includes("lead") || job.title.toLowerCase().includes("principal") || job.title.toLowerCase().includes("staff")));

      const matchesEmploymentType = employmentTypeFilter === "all" ||
        (job.type && (
          (employmentTypeFilter === "full-time" && (job.type.toLowerCase().includes("full") || job.type.toLowerCase().includes("full-time"))) ||
          (employmentTypeFilter === "part-time" && (job.type.toLowerCase().includes("part") || job.type.toLowerCase().includes("part-time"))) ||
          (employmentTypeFilter === "contract" && job.type.toLowerCase().includes("contract")) ||
          (employmentTypeFilter === "internship" && job.type.toLowerCase().includes("intern")) ||
          (employmentTypeFilter === "temporary" && job.type.toLowerCase().includes("temp"))
        ));

      const matchesDatePosted = datePostedFilter === "all" ||
        (datePostedFilter === "24h" && (new Date().getTime() - new Date(job.posted_at).getTime()) <= 24 * 60 * 60 * 1000) ||
        (datePostedFilter === "week" && (new Date().getTime() - new Date(job.posted_at).getTime()) <= 7 * 24 * 60 * 60 * 1000) ||
        (datePostedFilter === "month" && (new Date().getTime() - new Date(job.posted_at).getTime()) <= 30 * 24 * 60 * 60 * 1000);

      const matchesMinScore = (job.matchScore || 0) >= minMatchScore;

      // Note: Company size and industry filters would require additional data from the backend
      // For now, these are placeholders that always return true
      const matchesCompanySize = companySizeFilter === "all";
      const matchesIndustry = industryFilter === "all";

      return matchesSearch && matchesLocation && matchesGeoLocation &&
        matchesExperience && matchesEmploymentType && matchesDatePosted &&
        matchesMinScore && matchesCompanySize && matchesIndustry;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "match":
          return (b.matchScore || 0) - (a.matchScore || 0);
        case "salary":
          // Simple salary comparison using salaryText
          return (b.salaryText || '').localeCompare(a.salaryText || '');
        case "recent":
          return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
        default:
          return 0;
      }
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, locationFilter, salaryFilter, geoLocationFilter, experienceFilter,
    employmentTypeFilter, datePostedFilter, minMatchScore, companySizeFilter,
    industryFilter, sortBy]);

  // Handle job save/unsave with optimistic updates and user feedback
  const handleToggleSaveJob = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      const wasCurrentlySaved = savedJobsService.isJobSaved(jobId);

      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, saved: !wasCurrentlySaved } : j
      ));

      // Show immediate feedback
      if (!wasCurrentlySaved) {
        toast.success('Job saved!', {
          description: `${job.title} has been saved to your jobs`,
          icon: <BookmarkCheck className="h-4 w-4" />,
        });
      } else {
        toast.info('Job removed', {
          description: `${job.title} has been removed from your saved jobs`,
        });
      }

      try {
        if (wasCurrentlySaved) {
          // Remove from saved jobs (both locally and backend)
          await savedJobsService.removeSavedJob(jobId);

          // Emit event for dashboard update
          window.dispatchEvent(new CustomEvent('jobUnsaved', { detail: { jobId } }));
        } else {
          // Save the job via backend swipe endpoint
          const response = await jobService.swipeJob(jobId, 'like');

          if (response.success && response.data.saved) {
            // Also save locally for immediate access
            savedJobsService.saveJob({
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              salary: job.salaryText,
              description: job.snippet,
              skills: job.skills || [],
              jobUrl: job.redirect_url
            });

            // Emit event for dashboard update
            window.dispatchEvent(new CustomEvent('jobSaved', {
              detail: {
                job: {
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  matchScore: job.matchScore
                }
              }
            }));
          } else {
            // ROLLBACK on failure
            console.error('Failed to save job:', response.message);
            setJobs(prev => prev.map(j =>
              j.id === jobId ? { ...j, saved: wasCurrentlySaved } : j
            ));
          }
        }
      } catch (backendError) {
        // ROLLBACK on error
        console.error('Backend error toggling save:', backendError);
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, saved: wasCurrentlySaved } : j
        ));
      }
    } catch (err) {
      console.error('Failed to toggle job save status:', err);
      toast.error('An error occurred', {
        description: 'Please try again',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-4 pb-8 md:py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-muted-foreground">Loading your opportunities...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-4 pb-8 md:py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="text-6xl">🧞‍♂️💨</div>
              <h2 className="text-xl font-semibold">Oops! The genie&apos;s lamp seems to be offline</h2>
              <p className="text-muted-foreground max-w-md">
                {error.includes('fetch') || error.includes('network')
                  ? "Our job genie is having trouble connecting to the job realm. Please check your internet connection and try again!"
                  : error.includes('authentication') || error.includes('credentials')
                    ? "The genie needs to verify your identity first. Please sign in and try again!"
                    : `The genie encountered an unexpected challenge: ${error}`
                }
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  className="whitespace-nowrap"
                >
                  ✨ Rub the Lamp Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setError(null)}
                  className="whitespace-nowrap"
                >
                  Try Different Magic
                </Button>
              </div>
            </div>
          </div>
        </main>
        {/* Hide footer on mobile during error */}
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />

        {/* Mobile: Full-screen Tinder-style swipe view */}
        {!loading && (
          <div className="lg:hidden fixed inset-0 top-20 bottom-24 bg-background px-4 pt-4">
            <div className="h-full w-full max-w-md mx-auto">
              <JobSwipeDeck onJobDetailsAction={(job) => {
                setSelectedJob(job);
                setIsJobModalOpen(true);
              }} />
            </div>
          </div>
        )}

        {/* Desktop: Traditional view with filters and grid */}
        <main className="hidden lg:block container mx-auto px-4 pt-4 pb-8 md:py-8 max-w-6xl">
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

            {/* Search and Filters */}
            <motion.div variants={itemVariants} className="max-w-6xl mx-auto space-y-4">
              {/* Main Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400 h-5 w-5 z-10" />
                {isSearching && jobs.length > 0 && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400 h-5 w-5 animate-spin z-10" />
                )}
                <Input
                  placeholder="Search by job title, skills, or company name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-12 h-14 text-lg bg-white dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 focus:border-purple-500 dark:hover:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 shadow-md focus:shadow-lg placeholder:text-muted-foreground rounded-xl"
                />
              </div>

              {/* Primary Filters & Advanced Toggle */}
              <div className="flex flex-wrap gap-3 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 border-2 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {locationFilter === "all" ? "Work Type" :
                        locationFilter === "remote" ? "Remote" :
                          locationFilter === "hybrid" ? "Hybrid" : "On-site"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setLocationFilter("all")}>
                      All Work Types
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
                    <Button
                      variant="outline"
                      className="h-10 border-2 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      {salaryFilter === "all" ? "Salary" :
                        salaryFilter === "0-50k" ? "$0-50k" :
                          salaryFilter === "50k-100k" ? "$50k-100k" :
                            salaryFilter === "100k-150k" ? "$100k-150k" : "$150k+"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
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

                <Button
                  variant={showAdvancedFilters ? "default" : "outline"}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-10 border-2 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                  {showAdvancedFilters ?
                    <ChevronUp className="h-4 w-4 ml-2" /> :
                    <ChevronDown className="h-4 w-4 ml-2" />
                  }
                </Button>

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setLocationFilter("all");
                    setSalaryFilter("all");
                    setGeoLocationFilter("");
                    setExperienceFilter("all");
                    setEmploymentTypeFilter("all");
                    setDatePostedFilter("all");
                    setMinMatchScore(0);
                    setCompanySizeFilter("all");
                    setIndustryFilter("all");
                  }}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>

              {/* Active Filter Pills */}
              {(geoLocationFilter || experienceFilter !== "all" || employmentTypeFilter !== "all" ||
                datePostedFilter !== "all" || minMatchScore > 0 || companySizeFilter !== "all" ||
                industryFilter !== "all") && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-muted-foreground">Active Filters:</span>

                    {geoLocationFilter && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        <MapPin className="h-3 w-3" />
                        {geoLocationFilter}
                        <button
                          onClick={() => setGeoLocationFilter("")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}

                    {experienceFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        {experienceFilter === "entry" ? "Entry Level" :
                          experienceFilter === "mid" ? "Mid Level" :
                            experienceFilter === "senior" ? "Senior" : "Lead/Principal"}
                        <button
                          onClick={() => setExperienceFilter("all")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}

                    {employmentTypeFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        {employmentTypeFilter === "full-time" ? "Full-time" :
                          employmentTypeFilter === "part-time" ? "Part-time" :
                            employmentTypeFilter === "contract" ? "Contract" :
                              employmentTypeFilter === "internship" ? "Internship" : "Temporary"}
                        <button
                          onClick={() => setEmploymentTypeFilter("all")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}

                    {datePostedFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        <Clock className="h-3 w-3" />
                        {datePostedFilter === "24h" ? "Last 24h" :
                          datePostedFilter === "week" ? "Last Week" : "Last Month"}
                        <button
                          onClick={() => setDatePostedFilter("all")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}

                    {minMatchScore > 0 && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        <Target className="h-3 w-3" />
                        {minMatchScore}%+ Match
                        <button
                          onClick={() => setMinMatchScore(0)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}

                    {companySizeFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        <Building2 className="h-3 w-3" />
                        {companySizeFilter === "startup" ? "Startup" :
                          companySizeFilter === "small" ? "Small" :
                            companySizeFilter === "medium" ? "Medium" : "Large"}
                        <button
                          onClick={() => setCompanySizeFilter("all")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}

                    {industryFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        {industryFilter === "tech" ? "Technology" :
                          industryFilter === "finance" ? "Finance" :
                            industryFilter === "healthcare" ? "Healthcare" : "Other"}
                        <button
                          onClick={() => setIndustryFilter("all")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}

              {/* Advanced Filters - Collapsible */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <Card className="border-2 border-purple-100 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-pink-950/20">
                      <div className="p-6 space-y-4">
                        {/* Row 1: Location & Experience */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Location
                            </label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <Input
                                placeholder="e.g., San Francisco, CA"
                                value={geoLocationFilter}
                                onChange={(e) => setGeoLocationFilter(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Experience Level
                            </label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {experienceFilter === "all" ? "All Levels" :
                                    experienceFilter === "entry" ? "Entry Level" :
                                      experienceFilter === "mid" ? "Mid Level" :
                                        experienceFilter === "senior" ? "Senior" : "Lead/Principal"}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => setExperienceFilter("all")}>
                                  All Levels
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExperienceFilter("entry")}>
                                  Entry Level
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExperienceFilter("mid")}>
                                  Mid Level
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExperienceFilter("senior")}>
                                  Senior
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExperienceFilter("lead")}>
                                  Lead/Principal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Employment Type
                            </label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {employmentTypeFilter === "all" ? "All Types" :
                                    employmentTypeFilter === "full-time" ? "Full-time" :
                                      employmentTypeFilter === "part-time" ? "Part-time" :
                                        employmentTypeFilter === "contract" ? "Contract" :
                                          employmentTypeFilter === "internship" ? "Internship" : "Temporary"}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => setEmploymentTypeFilter("all")}>
                                  All Types
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEmploymentTypeFilter("full-time")}>
                                  Full-time
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEmploymentTypeFilter("part-time")}>
                                  Part-time
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEmploymentTypeFilter("contract")}>
                                  Contract
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEmploymentTypeFilter("internship")}>
                                  Internship
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEmploymentTypeFilter("temporary")}>
                                  Temporary
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Row 2: Date, Match Score, Company Size */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Date Posted
                            </label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {datePostedFilter === "all" ? "Any Time" :
                                    datePostedFilter === "24h" ? "Last 24h" :
                                      datePostedFilter === "week" ? "Last Week" : "Last Month"}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => setDatePostedFilter("all")}>
                                  Any Time
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDatePostedFilter("24h")}>
                                  Last 24 Hours
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDatePostedFilter("week")}>
                                  Last Week
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDatePostedFilter("month")}>
                                  Last Month
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Match Score
                            </label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {minMatchScore === 0 ? "Any Match" : `${minMatchScore}%+ Match`}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => setMinMatchScore(0)}>
                                  Any Match
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMinMatchScore(50)}>
                                  50%+ Match
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMinMatchScore(70)}>
                                  70%+ Match
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMinMatchScore(80)}>
                                  80%+ Match
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMinMatchScore(90)}>
                                  90%+ Match
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Company Size
                            </label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {companySizeFilter === "all" ? "All Sizes" :
                                    companySizeFilter === "startup" ? "Startup" :
                                      companySizeFilter === "small" ? "Small" :
                                        companySizeFilter === "medium" ? "Medium" : "Large"}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => setCompanySizeFilter("all")}>
                                  All Sizes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCompanySizeFilter("startup")}>
                                  Startup (1-50)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCompanySizeFilter("small")}>
                                  Small (51-200)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCompanySizeFilter("medium")}>
                                  Medium (201-1000)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCompanySizeFilter("large")}>
                                  Large (1000+)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Row 3: Industry */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Industry
                            </label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {industryFilter === "all" ? "All Industries" :
                                    industryFilter === "tech" ? "Technology" :
                                      industryFilter === "finance" ? "Finance" :
                                        industryFilter === "healthcare" ? "Healthcare" : "Other"}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => setIndustryFilter("all")}>
                                  All Industries
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIndustryFilter("tech")}>
                                  Technology
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIndustryFilter("finance")}>
                                  Finance
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIndustryFilter("healthcare")}>
                                  Healthcare
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIndustryFilter("other")}>
                                  Other
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Job Results */}
            <motion.div variants={itemVariants} className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">
                    {filteredJobs.length} Job{filteredJobs.length !== 1 ? 's' : ''} Found
                  </h2>
                  {isRefreshingFromPreferences && (
                    <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Applying preferences...</span>
                    </div>
                  )}
                </div>
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

              {filteredJobs.length === 0 ? (
                <div className="text-center py-16 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">No matching opportunities found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The genie searched far and wide but couldn&apos;t find jobs matching your current filters.
                      Try adjusting your search criteria or clearing some filters!
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setLocationFilter("all");
                        setSalaryFilter("all");
                        setGeoLocationFilter("");
                        setExperienceFilter("all");
                        setEmploymentTypeFilter("all");
                        setDatePostedFilter("all");
                        setMinMatchScore(0);
                        setCompanySizeFilter("all");
                        setIndustryFilter("all");
                      }}
                    >
                      🧹 Clear All Filters
                    </Button>
                    <Button onClick={() => setSearchTerm("")}>
                      🔍 Try Different Keywords
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop: Grid View */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {paginatedJobs.map((job) => (
                      <motion.div
                        key={`job-${job.id}-${job.saved ? 'saved' : 'unsaved'}`}
                        variants={itemVariants}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="group"
                      >
                        <Card
                          className="h-full hover:shadow-lg hover:border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 transition-all duration-200 cursor-pointer"
                          onClick={() => {
                            setSelectedJob(job);
                            setIsJobModalOpen(true);
                          }}
                        >
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
                                    {job.salaryText || 'Salary not specified'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <div className="flex items-center gap-1">
                                  <Target className="h-4 w-4 text-purple-600" />
                                  <span className="font-bold text-purple-600">{job.matchScore || 0}%</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {job.type}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {job.snippet || 'No description available'}
                            </p>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium">Required Skills</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(job.skills || []).slice(0, 4).map((skill: string, skillIndex: number) => (
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
                                {new Date(job.posted_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSaveJob(job.id);
                                  }}
                                  className={job.saved
                                    ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                                    : "border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700"}
                                >
                                  {job.saved ? (
                                    <>
                                      <BookmarkCheck className="w-4 h-4 mr-1 fill-current" />
                                      Saved
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-4 h-4 mr-1" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  className="whitespace-nowrap gap-1 bg-purple-600 hover:bg-purple-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(job.redirect_url, '_blank');
                                  }}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Apply Now
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-400 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={currentPage === page
                                  ? "bg-purple-600 hover:bg-purple-700 min-w-[40px]"
                                  : "border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-400 min-w-[40px]"
                                }
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return <span key={page} className="px-2 text-muted-foreground">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-400 disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        </main>

        {/* Footer - hidden on mobile for Tinder-style experience */}
        <div className="hidden lg:block">
          <Footer />
        </div>

        {/* Job Details Modal for Mobile & Desktop */}
        <AnimatePresence mode="wait">
          {isJobModalOpen && selectedJob && (
            <JobDetailsModal
              job={selectedJob}
              isOpen={isJobModalOpen}
              onCloseAction={() => {
                setIsJobModalOpen(false);
                setSelectedJob(null);
              }}
              onLikeAction={(jobId) => {
                // TODO: Implement like functionality
                setIsJobModalOpen(false);
                setSelectedJob(null);
              }}
              onPassAction={(jobId) => {
                // TODO: Implement pass functionality
                setIsJobModalOpen(false);
                setSelectedJob(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}