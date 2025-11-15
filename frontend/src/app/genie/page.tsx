"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  X,
  Star,
  Bot,
  Target,
  TrendingUp,
  Lightbulb,
  Sparkles,
  Clock,
  Trophy,
  Zap,
  Maximize2,
  Loader2,
  Copy,
  Search,
  Palette,
  CheckCircle2,
  Crosshair,
  Cpu,
  Award,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { UserStorage } from "@/lib/utils/userStorage";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/contexts/AuthContext";
import { resumeService, ResumeResponse } from "@/lib/api/resumes";
import { interviewQuestionsService } from "@/lib/api/interviewQuestions";
import { coverLetterService } from "@/lib/api/coverLetter";
import { InterviewQuestionsCards } from "@/components/InterviewQuestionsCards";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  isUploaded?: boolean;
  resumeData?: ResumeResponse;
  autoLoaded?: boolean; // Flag to indicate if this was auto-loaded from primary resume
}

interface Wish {
  id: string;
  type: "resume_analysis" | "job_match" | "skill_gap" | "career_advice";
  title: string;
  description: string;
  timestamp: Date;
  status: "pending" | "processing" | "completed";
  results?: {
    score?: number;
    insights?: string[];
    recommendations?: string[];
    skillGaps?: Array<
      | string
      | {
        skill: string;
        level?: string;
        importance?: string;
      }
    >;
  };
}

interface WishDetailsResponse {
  id: string;
  wish_type: string;
  wish_text: string;
  context_data?: Record<string, any>;
  is_processed?: boolean;
  processing_status?: string;
  processing_error?: string;
  created_at: string;
  processed_at?: string;
  ai_response?: string;
  recommendations?: string[];
  action_items?: string[];
  resources?: Array<{ title?: string; url?: string; description?: string }>;
  confidence_score?: number;
  job_match_score?: number;
  overall_score?: number;
  score_breakdown?: {
    style_formatting: { score: number; feedback: string; weight: number };
    grammar_spelling: { score: number; feedback: string; weight: number };
    job_match: { 
      score: number; 
      feedback: string; 
      weight: number;
      matches?: string[];
      gaps?: string[];
    };
    ats_compatibility: { score: number; feedback: string; weight: number };
    content_quality: { score: number; feedback: string; weight: number };
  };
  company_name?: string;
  position_title?: string;
}

interface HistoricalWish {
  id: string;
  status: string;
  wish_type: string;
  wish_text: string;
  created_at: string;
  updated_at: string;
  is_processed?: boolean;
  processing_status?: string;
}

interface DailyUsageResponse {
  wishes_used: number;
  daily_limit: number;
}

const ACCEPTED_FILE_TYPES = [".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
} as const;

const wishTypes = [
  {
    type: "resume_analysis" as const,
    icon: <Bot className="h-5 w-5" />,
    title: "Resume Analysis",
    description:
      "Get comprehensive feedback on your resume structure, content, and ATS compatibility",
    color: "bg-purple-500",
  },
  {
    type: "job_match" as const,
    icon: <Target className="h-5 w-5" />,
    title: "Job Match Score",
    description:
      "Analyze your resume against job opportunities and get a compatibility score",
    color: "bg-purple-600",
  },
  {
    type: "skill_gap" as const,
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Skill Gap Analysis",
    description:
      "Identify missing skills and get recommendations for career advancement",
    color: "bg-purple-700",
  },
  {
    type: "career_advice" as const,
    icon: <Lightbulb className="h-5 w-5" />,
    title: "Career Guidance",
    description:
      "Get personalized advice on career paths and next steps based on your profile",
    color: "bg-purple-800",
  },
];

// Deterministic sparkle positions (server/client consistent)
const SPARKLE_POSITIONS = [
  { left: "46.39701473670041%", top: "30.191348745094707%" },
  { left: "77.72333153258018%", top: "71.98678973108386%" },
  { left: "30.31433841724377%", top: "61.77677344382561%" },
  { left: "47.912740068827475%", top: "30.470628111023373%" },
  { left: "78.98035735099025%", top: "44.82286986585663%" },
  { left: "44.33383674203081%", top: "35.98387209792393%" },
];

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 30,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 30,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
} as const;

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
} as const;

interface AnalysisResults {
  resumeScore: number;
  matchScore: number;
  overallScore?: number;
  scoreBreakdown?: {
    style_formatting: { score: number; feedback: string; weight: number };
    grammar_spelling: { score: number; feedback: string; weight: number };
    job_match: { 
      score: number; 
      feedback: string; 
      weight: number;
      matches?: string[];
      gaps?: string[];
    };
    ats_compatibility: { score: number; feedback: string; weight: number };
    content_quality: { score: number; feedback: string; weight: number };
  };
  skillGaps: string[];
  insights: string[];
  recommendations: string[];
}

export default function StudioPage() {
  const { isAuthenticated, user } = useAuth();
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isSkillGapModalOpen, setIsSkillGapModalOpen] = useState(false);
  const [isInterviewQuestionsModalOpen, setIsInterviewQuestionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [isWishDetailModalOpen, setIsWishDetailModalOpen] = useState(false);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [resumeFile, setResumeFile] = useState<UploadedFile | null>(null);
  const [jobPosting, setJobPosting] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dailyWishes, setDailyWishes] = useState(0);
  const [maxWishes, setMaxWishes] = useState(3);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "processing">("all");
  const [analysisResults, setAnalysisResults] =
    useState<AnalysisResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedPrimaryResume = useRef(false); // Track if we've already loaded primary resume

  // Helper function to parse recommendations if they come as JSON string
  const parseRecommendations = useCallback((data: any): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
        // If it's an object with a recommendations field
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          return parsed.recommendations;
        }
      } catch {
        // If parsing fails, return the string as a single item
        return [data];
      }
    }
    return [];
  }, []);

  // Progressive highlighting states for user guidance
  const [showInitialHighlight, setShowInitialHighlight] = useState(true);
  const [isResumeUploading, setIsResumeUploading] = useState(false);
  const [showButtonHighlight, setShowButtonHighlight] = useState(false);
  const [showOutputHighlight, setShowOutputHighlight] = useState(false);

  // Fade-out states for smooth transitions
  const [initialHighlightFading, setInitialHighlightFading] = useState(false);
  const [outputHighlightFading, setOutputHighlightFading] = useState(false);

  // Auto-disable initial highlighting after 8 seconds with smooth fade-out
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialHighlightFading(true);
      // Complete fade-out after transition (increased to match CSS)
      setTimeout(() => {
        setShowInitialHighlight(false);
        setInitialHighlightFading(false);
      }, 1200); // Match CSS transition duration
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Suppress hydration mismatch warnings caused by browser extensions
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('hydrated but some attributes')
      ) {
        return; // Suppress hydration mismatch warnings
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Helper function to get consistent highlight classes
  const getHighlightClass = (isHighlighted: boolean, isFading: boolean = false) => {
    if (!isHighlighted) return "";
    if (isFading) return "animate-pulse-border-fadeout border-2";
    return "animate-pulse-border border-2 border-purple-500/50";
  };

  // Derived state to check if daily limit is reached
  const isDailyLimitReached = maxWishes < 999 && dailyWishes >= maxWishes;

  // Separate function to refresh daily usage (can be called after wish submission)
  const refreshDailyUsage = useCallback(async () => {
    try {
      const { apiClient } = await import("@/lib/api/client");

      if (!isAuthenticated) {
        // For guest users, fetch from guest endpoint
        const data = await apiClient.get<DailyUsageResponse>(
          "/genie/usage/daily/guest"
        );
        setDailyWishes(data.wishes_used);
        setMaxWishes(data.daily_limit);
        return;
      }

      // For authenticated users
      const data = await apiClient.get<DailyUsageResponse>(
        "/genie/usage/daily"
      );
      if (
        data &&
        typeof data.wishes_used === "number" &&
        typeof data.daily_limit === "number"
      ) {
        setDailyWishes(data.wishes_used);
        // Handle unlimited wishes (-1) by setting a high number for UI purposes
        const limit = data.daily_limit === -1 ? 999 : data.daily_limit;
        setMaxWishes(limit);
      } else {
        setDailyWishes(0);
        setMaxWishes(3);
      }
    } catch {
      setDailyWishes(0);
      setMaxWishes(3);
    }
  }, [isAuthenticated]);

  // Load primary resume for authenticated users (runs once on mount)
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    
    if (isAuthenticated && !resumeFile && !hasLoadedPrimaryResume.current) {
      hasLoadedPrimaryResume.current = true; // Set immediately to prevent race conditions
      
      const loadPrimaryResume = async () => {
        try {
          // Fetch resumes from backend instead of local storage
          const { apiClient } = await import('@/lib/api/client');
          const resumes = await apiClient.get<any[]>('/resumes');
          
          // Find the most recent completed resume
          const primaryResume = resumes
            .filter((r: any) => r.processing_status === 'completed')
            .sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
          
          if (primaryResume && isMounted) {
            // Use backend resume data - prefer original_filename over filename (UUID)
            const displayName = primaryResume.original_filename || primaryResume.filename || 'Resume.pdf';
            const uploadedFile: UploadedFile = {
              id: primaryResume.id,
              name: displayName,
              size: primaryResume.file_size || 0,
              type: primaryResume.file_type || 'application/pdf',
              isUploaded: true,
              autoLoaded: true, // Mark as auto-loaded
              resumeData: primaryResume, // Store the full backend data
            };
            
            setResumeFile(uploadedFile);
            setShowButtonHighlight(true);
            
            toast.success("Primary resume summoned!", {
              description: `Using "${displayName}" from your account`,
            });
          }
        } catch (error) {
          console.warn('Failed to load primary resume from backend:', error);
        }
      };
      
      loadPrimaryResume();
    }
    
    return () => {
      isMounted = false; // Cleanup: mark component as unmounted
      hasLoadedPrimaryResume.current = false; // Reset flag so it loads again on next mount
    };
  }, [isAuthenticated]); // Only depend on isAuthenticated, not resumeFile

  // Fetch real daily wish usage from backend (supports both authenticated and guest users)
  useEffect(() => {
    refreshDailyUsage();
  }, [isAuthenticated, refreshDailyUsage]);

  // Removed auto-population for daily limit - results should only show after clicking "Grant My Wish"

  // Clear analysis results on page reload/mount
  useEffect(() => {
    setAnalysisResults(null);
    setInterviewQuestions([]);
  }, []); // Empty deps = runs only once on mount

  // Clear analysis results when user changes to prevent cross-user contamination
  useEffect(() => {
    setAnalysisResults(null);
    setWishes([]);
  }, [user?.id, isAuthenticated]);

  // Fetch historical wishes when user is authenticated, or load from localStorage for guests
  useEffect(() => {
    const fetchWishHistory = async () => {
      // For authenticated users, fetch from backend
      if (isAuthenticated) {
        try {
          const { apiClient } = await import("@/lib/api/client");
          
          const historicalWishes = await apiClient.get<WishDetailsResponse[]>("/genie");

          if (Array.isArray(historicalWishes)) {
            // Convert historical wishes with full details included
            const detailedWishes = historicalWishes.map((wish) => {
              // Reconstruct title from company_name and position_title if available
              const title = wish.company_name || wish.position_title
                ? `${wish.company_name ? wish.company_name : ""}${wish.company_name && wish.position_title ? " - " : ""}${wish.position_title || ""}`
                : "Resume & Job Match Analysis";
              
              return {
                id: wish.id,
                type: "resume_analysis" as const,
                title: title,
                description: "",
                timestamp: new Date(wish.created_at),
                status: wish.is_processed
                  ? "completed"
                  : wish.processing_status === "processing"
                    ? "processing"
                    : "pending",
                results: wish.is_processed && wish.ai_response
                  ? {
                    score: wish.overall_score || Math.round((wish.confidence_score || 0) * 100),
                    insights: parseRecommendations(wish.recommendations),
                    recommendations: parseRecommendations(wish.action_items),
                  }
                  : undefined,
              } as Wish;
            });
            setWishes(detailedWishes);
          }
        } catch (err) {
          console.warn("Failed to fetch wish history for authenticated user:", err);
        }
      } else {
        // For guests, only use localStorage (no backend call)
        try {
          const savedWishes = UserStorage.getItem('genie_wishes');
          if (savedWishes) {
            const parsedWishes = JSON.parse(savedWishes);
            if (Array.isArray(parsedWishes)) {
              // Convert timestamps back to Date objects
              const wishesWithDates = parsedWishes.map(wish => ({
                ...wish,
                timestamp: new Date(wish.timestamp)
              }));
              setWishes(wishesWithDates);
            }
          }
        } catch (error) {
          console.warn('Failed to load wishes from localStorage:', error);
        }
      }
    };
    fetchWishHistory();
  }, [isAuthenticated]);

  // Modal focus trap and scroll lock
  useEffect(() => {
    if (!isRecModalOpen) return;
    const prevActive = document.activeElement as HTMLElement | null;
    setTimeout(() => modalCloseRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsRecModalOpen(false);
      if (e.key === "Tab") {
        const container = modalRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus();
    };
  }, [isRecModalOpen]);

  const remainingWishes = maxWishes >= 999 ? 999 : maxWishes - dailyWishes;

  // Filter wishes based on search query and status
  const filteredWishes = wishes.filter((wish) => {
    const matchesSearch =
      wish.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wish.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || wish.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Delete wish function with proper backend/localStorage handling
  const deleteWish = useCallback(async (wishId: string) => {
    try {
      // For authenticated users, try to delete from backend
      if (isAuthenticated) {
        try {
          const { apiClient } = await import("@/lib/api/client");
          await apiClient.delete(`/genie/${wishId}`);
          toast.success("Wish deleted successfully");
        } catch (error) {
          // If wish not found in backend (404), that's actually fine - it means it was already deleted
          // or it's a local-only wish. We'll still remove it from the UI.
          if (error instanceof Error && error.message.includes('404')) {
            toast.success("Wish deleted successfully");
          } else {
            // For other errors, re-throw to be handled by outer catch
            throw error;
          }
        }
      } else {
        // For guest users, just show success message (localStorage handled below)
        toast.success("Wish deleted successfully");
      }

      // Update local state for immediate UI feedback (always do this regardless of backend result)
      setWishes((prevWishes) => {
        const updatedWishes = prevWishes.filter((wish) => wish.id !== wishId);

        // For guest users, persist to localStorage
        if (!isAuthenticated) {
          try {
            UserStorage.setItem('genie_wishes', JSON.stringify(updatedWishes));
          } catch (error) {
            console.warn('Failed to save wishes to localStorage:', error);
          }
        }

        return updatedWishes;
      });
    } catch (error) {
      console.error('Failed to delete wish:', error);
      toast.error("The wish couldn't be erased from history! 🕰️✨", {
        description: "Please try again later"
      });
    }
  }, [isAuthenticated]);

  // Helper function to parse and handle API errors with genie personality
  const parseApiError = (error: Error): { title: string; description: string } => {
    // Check if it's a validation error (422)
    if (error.message && error.message.includes('422')) {
      try {
        // Extract the JSON error details
        const match = error.message.match(/{"detail":\[.*?\]}/);
        if (match) {
          const errorData = JSON.parse(match[0]);
          const detail = errorData.detail?.[0];

          if (detail?.type === 'string_too_short') {
            const minLength = detail.ctx?.min_length || 10;
            return {
              title: "Your wish needs more magic words! ✨",
              description: `Please write at least ${minLength} characters for the genie to understand your request.`
            };
          }

          if (detail?.type === 'string_too_long') {
            const maxLength = detail.ctx?.max_length || 5000;
            return {
              title: "Your wish scroll is too long! 📜",
              description: `Please keep your request under ${maxLength} characters.`
            };
          }

          if (detail?.loc?.includes('wish_text')) {
            return {
              title: "The genie couldn't read your wish! 🔮",
              description: "Please check your career question or job posting format."
            };
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse API error:', parseError);
      }
    }

    // Check for network/connection errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        title: "The genie's connection is weak! 📡✨",
        description: "Please check your internet connection and try again."
      };
    }

    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return {
        title: "The genie is taking too long to respond! ⏰",
        description: "The magical analysis is overloaded. Please try again in a moment."
      };
    }

    // Check for authentication errors
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return {
        title: "The genie doesn't recognize you!",
        description: "Please sign in again to continue using your magical powers."
      };
    }

    // Check for rate limiting
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return {
        title: "The genie needs a moment to recharge!",
        description: "Too many wishes at once. Please wait a moment before trying again."
      };
    }

    // Default fallback for unknown errors
    return {
      title: "The genie's lamp flickered!",
      description: "Something unexpected happened. Please try a different career question."
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!ACCEPTED_FILE_TYPES.includes(fileExtension)) {
      return `File type not supported. Please upload ${ACCEPTED_FILE_TYPES.join(
        ", "
      )} files.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${formatFileSize(
        MAX_FILE_SIZE
      )}.`;
    }

    return null;
  };

  const copySkillGapsToClipboard = async () => {
    if (!analysisResults?.skillGaps || analysisResults.skillGaps.length === 0) {
      toast.error("No skill gaps identified yet! 🎯");
      return;
    }

    const skillsText = analysisResults.skillGaps
      .map((skill, idx) => `${idx + 1}. ${skill}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(skillsText);
      toast.success("Skills copied to clipboard! 📋");
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = skillsText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success("Skills copied to clipboard! 📋");
      } catch {
        toast.error("Failed to copy skills");
      }
      document.body.removeChild(textArea);
    }
  };

  const copyRecommendationsToClipboard = async () => {
    if (!analysisResults?.recommendations || analysisResults.recommendations.length === 0) {
      toast.error("The cosmic wisdom hasn't materialized yet! 🔮", {
        description: "No magical recommendations to copy at this moment"
      });
      return;
    }

    const recommendationsText = analysisResults.recommendations
      .map((rec, idx) => `${idx + 1}. ${rec}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(recommendationsText);
      toast.success("Recommendations copied to clipboard");
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = recommendationsText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success("Recommendations copied to clipboard");
      } catch {
        toast.error("The mystical clipboard spell failed!", {
          description: "Unable to copy your divine recommendations"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error("That scroll isn't magical enough!", {
        description: error,
      });
      return;
    }

    // Reset progress and set loading
    setUploadProgress(0);
    setIsLoading(true);
    setIsResumeUploading(true);
    setShowInitialHighlight(false);

    // Create a temporary file object for UI feedback
    const tempFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      isUploaded: false,
    };

    setResumeFile(tempFile);

    try {
      // Upload the file to backend with progress tracking
      await resumeService.uploadResume(file, {
        isGuest: !isAuthenticated,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        onComplete: (response) => {
          // Update with successful upload data
          const uploadedFile: UploadedFile = {
            ...tempFile,
            id: response.id,
            isUploaded: true,
            resumeData: response,
          };
          setResumeFile(uploadedFile);
          setIsResumeUploading(false);
          setShowButtonHighlight(true);
        },
        onError: (error) => {
          console.error("Resume upload failed:", error);
          setResumeFile(null);
          setIsResumeUploading(false);
          setShowInitialHighlight(true);
        },
      });

      // This will be called if the promise resolves successfully
      // (onComplete callback handles the UI update)
    } catch (error) {
      console.error("Resume upload failed:", error);
      // Error is already handled by the onError callback and ResumeService
      setResumeFile(null);
      setIsResumeUploading(false);
      setShowInitialHighlight(true);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
      setIsResumeUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    // Check if resume is uploaded first
    if (!resumeFile) {
      toast.error("Resume required! 📄✨", {
        description: "Please upload your resume first to get personalized AI insights.",
      });
      return;
    }

    // Enhanced validation with better user guidance
    const trimmedWish = jobPosting.trim();

    if (!trimmedWish) {
      toast.error("Your genie needs more details! 🧞‍♂️📝", {
        description: "Please enter your career question, job posting, or wish text.",
      });
      return;
    }

    // Check minimum length (backend requires 10 characters)
    if (trimmedWish.length < 10) {
      toast.error("Your wish needs more magic words! ✨", {
        description: `Please write at least 10 characters. You have ${trimmedWish.length} characters.`,
      });
      return;
    }

    // Check for overly simple inputs
    const simpleInputs = ['hello', 'hi', 'test', 'testing', 'help me', 'please help'];
    if (simpleInputs.includes(trimmedWish.toLowerCase())) {
      toast.error("The genie needs more details! 🔮", {
        description: "Try pasting a job description or asking 'How can I improve my resume for [role]?'",
      });
      return;
    }

    // Check for very repetitive content
    if (/^(.)\1{9,}$/.test(trimmedWish) || /^(.{1,3})\1{4,}$/.test(trimmedWish)) {
      toast.error("The genie detected magical interference! 🌟", {
        description: "Please write a meaningful career question or job description.",
      });
      return;
    }

    if (maxWishes < 999 && dailyWishes >= maxWishes) {
      toast.error("The genie's magic is exhausted for today! 🧞‍♂️💤", {
        description:
          "You've used all your daily wishes. Come back tomorrow for more.",
      });
      return;
    }
    setIsAnalyzing(true);

    try {
      const { apiClient } = await import("@/lib/api/client");

      // Call backend to create a wish (supports both authenticated and guest users)
      const endpoint = isAuthenticated ? "/genie" : "/genie/guest";
      
      // For auto-loaded resumes, the ID is already the backend resume ID
      const actualResumeId = resumeFile?.id;
      
      const requestPayload = {
        wish_type: "improvement",
        wish_text: jobPosting,
        context_data: {
          ...(actualResumeId ? { resume_id: actualResumeId } : {}),
          ...(companyName ? { company_name: companyName } : {}),
          ...(positionTitle ? { position_title: positionTitle } : {}),
        },
      };
      const data = await apiClient.post<WishDetailsResponse>(endpoint, requestPayload);

      // Add wish to history immediately with real backend ID
      // Create a clean title and descriptive subtitle
      const wishTitle = "Resume & Job Match Analysis";
      let wishDescription = "";
      
      if (companyName || positionTitle) {
        wishDescription = `${companyName || ""}${companyName && positionTitle ? " - " : ""}${positionTitle || ""}`;
      } else if (jobPosting) {
        // Extract first line or first 60 chars from job posting for description
        const firstLine = jobPosting.split('\n')[0].trim();
        wishDescription = firstLine.length > 60 
          ? firstLine.substring(0, 60) + "..." 
          : firstLine;
      }
      
      const newWish: Wish = {
        id: data.id,
        type: "resume_analysis",
        title: wishTitle,
        description: wishDescription,
        timestamp: new Date(),
        status: "processing",
      };

      setWishes((prev) => {
        const updatedWishes = [newWish, ...prev];

        // Persist to localStorage
        try {
          UserStorage.setItem('genie_wishes', JSON.stringify(updatedWishes));
        } catch (error) {
          console.warn('Failed to save wishes to localStorage:', error);
        }

        return updatedWishes;
      });

      // For guest wishes, the response already contains full details (processed synchronously)
      // For authenticated wishes, we need to poll for completion
      let wishDetails: WishDetailsResponse;
      
      if (!isAuthenticated && data.processing_status === "completed") {
        // Guest wish is already complete, use the response directly
        wishDetails = data;
      } else {
        // Poll for wish completion (for authenticated users or if guest wish isn't complete yet)
        let polledDetails: WishDetailsResponse | null = null;
        for (let i = 0; i < 30; i++) {
          // up to 30s
          try {
            const wishEndpoint = isAuthenticated ? `/genie/${data.id}` : `/genie/guest/${data.id}`;
            polledDetails = await apiClient.get<WishDetailsResponse>(
              wishEndpoint
            );
            if (polledDetails && polledDetails.processing_status === "completed")
              break;
          } catch (error) {
            console.error(`Error polling wish ${data.id} (attempt ${i + 1}):`, error);
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (!polledDetails || polledDetails.processing_status !== "completed") {
          throw new Error("Wish processing timed out");
        }
        wishDetails = polledDetails;
      }

      const parsedRecommendations = parseRecommendations(wishDetails!.recommendations);
      const parsedActionItems = parseRecommendations(wishDetails!.action_items);

      // Update the wish with real results
      setWishes((prev) => {
        const updatedWishes = prev.map((wish) =>
          wish.id === data.id
            ? {
              ...wish,
              status: "completed" as const,
              results: {
                score: wishDetails!.overall_score || Math.round((wishDetails!.confidence_score || 0) * 100),
                insights: parsedRecommendations,
                recommendations: parsedActionItems,
              },
            }
            : wish
        );

        // Persist to localStorage
        try {
          UserStorage.setItem('genie_wishes', JSON.stringify(updatedWishes));
        } catch (error) {
          console.warn('Failed to save wishes to localStorage:', error);
        }

        return updatedWishes;
      });
      // Use job_match score from scoreBreakdown for consistency, fallback to job_match_score
      const jobMatchScore = wishDetails!.score_breakdown?.job_match?.score 
        || Math.round((wishDetails!.job_match_score || 0) * 100);
      
      setAnalysisResults({
        resumeScore: wishDetails!.overall_score || Math.round((wishDetails!.confidence_score || 0) * 100),
        matchScore: jobMatchScore,
        overallScore: wishDetails!.overall_score,
        scoreBreakdown: wishDetails!.score_breakdown,
        skillGaps: parsedActionItems,
        insights: parsedRecommendations,
        recommendations: parsedRecommendations,
      });

      // Enable output highlighting and scroll immediately after main analysis
      setShowButtonHighlight(false);
      setShowOutputHighlight(true);

      // Auto-scroll to show recommendations after a brief delay
      setTimeout(() => {
        const recommendationsElement = document.querySelector('[data-recommendations-section]');
        if (recommendationsElement) {
          recommendationsElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 500);

      // Automatically disable highlighting after 10 seconds with smooth fade-out
      setTimeout(() => {
        setOutputHighlightFading(true);
        // Complete fade-out after transition (increased to match CSS)
        setTimeout(() => {
          setShowOutputHighlight(false);
          setOutputHighlightFading(false);
        }, 1200); // Match CSS transition duration
      }, 10000);

      // Re-enable the button after all analysis completes
      setIsAnalyzing(false);

      // Refresh usage count after successful wish
      // For guests, refresh immediately without waiting for interview questions
      // For authenticated users, this happens after questions complete
      if (!isAuthenticated) {
        await refreshDailyUsage();
      } else {
        // Wait for interview questions before refreshing for authenticated users
        if (questionsPromise) {
          await questionsPromise;
        }
        await refreshDailyUsage();
      }
      
      // Keep job posting and context for reference - don't clear
      // User can manually clear if needed
    } catch (error) {
      // Remove the temporary wish if it failed
      setWishes((prev) => {
        const updatedWishes = prev.filter((wish) => wish.status !== "processing");

        // Persist to localStorage
        try {
          UserStorage.setItem('genie_wishes', JSON.stringify(updatedWishes));
        } catch (error) {
          console.warn('Failed to save wishes to localStorage:', error);
        }

        return updatedWishes;
      });

      // Parse the error and show user-friendly message
      const { title, description } = parseApiError(error as Error);
      toast.error(title, {
        description: description
      });

      // Refresh usage count even after error to get accurate count
      await refreshDailyUsage();
    } finally {
      // Only set to false if we haven't already (in case of early exit)
      setIsAnalyzing(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!analysisResults) {
      toast.error("Please run analysis first", {
        description: "You need to analyze a resume and job posting before generating a cover letter."
      });
      return;
    }

    if (!jobPosting) {
      toast.error("Job posting required", {
        description: "Please provide a job posting to generate a cover letter."
      });
      return;
    }

    setGeneratingCoverLetter(true);

    try {
      const response = await (isAuthenticated 
        ? coverLetterService.generateCoverLetter({
            job_description: jobPosting,
            company_name: companyName || undefined,
            position_title: positionTitle || undefined,
          })
        : coverLetterService.generateCoverLetterGuest({
            job_description: jobPosting,
            company_name: companyName || undefined,
            position_title: positionTitle || undefined,
          })
      );

      if (response.success) {
        setCoverLetter(response.cover_letter);
        toast.success("Cover letter generated!");
      } else {
        throw new Error("Failed to generate cover letter");
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast.error("Failed to generate cover letter", {
        description: "Please try again or check your internet connection."
      });
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleCopyCoverLetter = async () => {
    if (!coverLetter) return;
    
    try {
      await navigator.clipboard.writeText(coverLetter);
      setIsCopied(true);
      toast.success("Copied to clipboard!", {
        description: "The cover letter has been copied to your clipboard."
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy", {
        description: "Could not copy to clipboard. Please try again."
      });
    }
  };

  const handleDownloadCoverLetter = (format: 'text' = 'text') => {
    if (!coverLetter) return;

    if (format === 'text') {
      coverLetterService.downloadAsText(
        coverLetter,
        companyName || "Company",
        positionTitle || "Position"
      );
    }

    toast.success("Cover letter downloaded!", {
      description: "Your cover letter has been saved as a text file."
    });
  };

  const handleGenerateQuestions = async () => {
    if (!analysisResults) {
      toast.error("Please run analysis first", {
        description: "You need to analyze a resume and job posting before generating interview questions."
      });
      return;
    }

    if (!jobPosting) {
      toast.error("Job posting required", {
        description: "Please provide a job posting to generate interview questions."
      });
      return;
    }

    setGeneratingQuestions(true);

    try {
      const response = await (isAuthenticated 
        ? interviewQuestionsService.generateQuestions({
            resumeId: resumeFile?.resumeData?.id,
            jobDescription: jobPosting,
            numQuestions: 10,
          })
        : interviewQuestionsService.generateQuestions({
            resumeText: resumeFile?.name || "Resume submitted",
            jobDescription: jobPosting,
            numQuestions: 10,
          }, true) // Pass isGuest flag
      );

      if (response.success) {
        setInterviewQuestions(response.questions || []);
        toast.success("Interview questions generated!");
      } else {
        throw new Error("Failed to generate interview questions");
      }
    } catch (error) {
      console.error("Error generating interview questions:", error);
      toast.error("Failed to generate interview questions", {
        description: "Please try again or check your internet connection."
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const getWishIcon = (type: Wish["type"]) => {
    const wishType = wishTypes.find((w) => w.type === type);
    return wishType?.icon || <Bot className="h-4 w-4" />;
  };

  const getWishColor = (type: Wish["type"]) => {
    const wishType = wishTypes.find((w) => w.type === type);
    return wishType?.color || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />



      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center space-y-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              Make Your Career Wish
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your resume and paste a job posting to get AI-powered career insights.
              Your genie will analyze your match and provide personalized recommendations!
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Wish Counter */}
          <motion.div variants={itemVariants}>
            <Card className="max-w-3xl mx-auto bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-600 transition-all">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-gray-900 dark:text-gray-100">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  {isAuthenticated ? "Your Genie Powers" : "Daily Genie Wishes"}
                </CardTitle>
                <CardDescription className="text-lg">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-muted-foreground">
                        As a member, you have unlimited access to all genie
                        powers
                      </div>
                    </div>
                  ) : maxWishes >= 999 ? (
                    "You have unlimited wishes available!"
                  ) : remainingWishes > 0 ? (
                    `You have ${remainingWishes} wish${remainingWishes > 1 ? "es" : ""
                    } remaining today`
                  ) : (
                    "No wishes remaining today. Come back tomorrow for more."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isAuthenticated ? (
                  // Enhanced display for authenticated users (left column)
                  <div className="space-y-4">
                    {/* Expanded AI Recommendations Section */}
                    <div>
                      <div
                        data-recommendations-section
                        className={`bg-card rounded-md p-4 text-left min-h-48 max-h-80 md:max-h-96 overflow-auto border border-muted-foreground/10 ${showOutputHighlight && analysisResults?.insights?.length
                          ? getHighlightClass(true, outputHighlightFading)
                          : ""
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Lightbulb
                              className="h-5 w-5 text-gray-900 dark:text-gray-100"
                              aria-label="Key Insights icon"
                            />
                            Key Insights
                          </h5>
                          <div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsRecModalOpen(true)}
                              aria-label="Expand recommendations"
                              title="View full recommendations"
                              suppressHydrationWarning
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          {analysisResults?.insights &&
                            analysisResults.insights.length > 0
                            ? analysisResults.insights.map(
                              (rec, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-purple-600 mt-1">
                                    •
                                  </span>
                                  <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                                </li>
                              )
                            )
                            : [
                              "The cosmic forces are still aligning your personalized insights ✨",
                              "Your genie is crafting magical recommendations just for you 🔮",
                              "The stars haven't revealed your perfect guidance yet - try again! 🌟",
                              "Your wishes deserve divine attention - let me divine deeper insights! 💫",
                            ].map((mock, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2"
                              >
                                <span className="text-muted-foreground mt-1">
                                  •
                                </span>
                                <span className="text-muted-foreground">{mock}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Original design for guests (left column)
                  <>
                    {/* Animated Wish Stars */}
                    <div className="relative">
                      <div className="flex items-center justify-center gap-2">
                        {Array.from({ length: maxWishes }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{
                              scale: 1,
                              rotate: 0,
                              transition: {
                                delay: i * 0.1,
                                type: "spring",
                                stiffness: 200,
                              },
                            }}
                            whileHover={{
                              scale: 1.2,
                              rotate: 360,
                              transition: { duration: 0.3 },
                            }}
                          >
                            <Star
                              className={`h-10 w-10 transition-all duration-300 ${i < dailyWishes
                                ? "fill-amber-400 text-amber-400 drop-shadow-lg animate-pulse"
                                : i < remainingWishes + dailyWishes
                                  ? "text-purple-300 dark:text-purple-600 hover:text-primary/80"
                                  : "text-gray-300 dark:text-gray-700"
                                }`}
                            />
                          </motion.div>
                        ))}
                      </div>

                      {/* Magical sparkles around stars */}
                      {remainingWishes > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-1 h-1 bg-purple-400 rounded-full"
                              style={{
                                left: SPARKLE_POSITIONS[i].left,
                                top: SPARKLE_POSITIONS[i].top,
                              }}
                              animate={{
                                scale: [0, 1, 0],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.3,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-primary">
                          {maxWishes >= 999
                            ? `${dailyWishes}/∞`
                            : `${dailyWishes}/${maxWishes}`}
                        </span>
                      </div>
                      <div className="w-full bg-purple-600/20 rounded-full h-3 overflow-hidden">
                        <motion.div
                          className="h-full bg-purple-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width:
                              maxWishes >= 999
                                ? "100%"
                                : `${(dailyWishes / maxWishes) * 100}%`,
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* AI Recommendations moved to the right column */}

                    {/* Status Messages and Recommendations */}
                    {remainingWishes === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                      >
                        {/* Show recommendations first for guests who've used all wishes */}
                        <div
                          data-recommendations-section
                          className={`mt-3 bg-card rounded-md p-4 text-left min-h-48 max-h-80 md:max-h-96 overflow-auto border border-muted-foreground/10 ${showOutputHighlight && analysisResults?.insights?.length
                            ? getHighlightClass(true, outputHighlightFading)
                            : ""
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                              Key Insights
                            </h5>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsRecModalOpen(true)}
                              aria-label="Expand recommendations"
                              title="View full recommendations"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <ul className="space-y-2 text-sm">
                            {analysisResults?.insights &&
                              analysisResults.insights.length > 0
                              ? analysisResults.insights.map(
                                (rec, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="text-purple-600 mt-1">
                                      •
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                                  </li>
                                )
                              )
                              : [
                                "You've used all your daily wishes! Your genie insights are waiting here 🌟",
                                "Sign up for unlimited access to career magic and personalized recommendations 🔮",
                                "Your completed wishes hold valuable career insights - check your wish history below! ✨",
                              ].map((mock, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-muted-foreground mt-1">
                                    •
                                  </span>
                                  <span>{mock}</span>
                                </li>
                              ))}
                          </ul>
                        </div>

                        {/* Status message below recommendations */}
                        <div className="pt-4 border-t border-primary/20 mt-4">
                          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
                            <Clock className="h-4 w-4" />
                            Wishes reset at midnight UTC
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <Link
                              href="/auth"
                              className="text-primary hover:underline"
                            >
                              Sign up
                            </Link>{" "}
                            for unlimited wishes with Pro!
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                      >
                        {/* Expanded recommendations panel */}
                        <div
                          data-recommendations-section
                          className={`mt-3 bg-card rounded-md p-4 text-left min-h-48 max-h-80 md:max-h-96 overflow-auto border border-muted-foreground/10 ${showOutputHighlight && analysisResults?.insights?.length
                            ? getHighlightClass(true, outputHighlightFading)
                            : ""
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                              Key Insights
                            </h5>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsRecModalOpen(true)}
                              aria-label="Expand recommendations"
                              title="View full recommendations"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <ul className="space-y-2 text-sm">
                            {analysisResults?.insights &&
                              analysisResults.insights.length > 0
                              ? analysisResults.insights.map(
                                (rec, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="text-purple-600 mt-1">
                                      •
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                                  </li>
                                )
                              )
                              : [
                                "The cosmic forces are still aligning your personalized insights ✨",
                                "Your genie is crafting magical recommendations just for you 🔮",
                                "The stars haven't revealed your perfect guidance yet - try again! 🌟",
                                "Your wishes deserve divine attention - let me divine deeper insights! 💫",
                              ].map((mock, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-muted-foreground mt-1">
                                    •
                                  </span>
                                  <span>{mock}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Grid - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Resume Upload */}
            <motion.div variants={itemVariants}>
              <Card className={`h-full hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all ${showInitialHighlight && !analysisResults
                ? getHighlightClass(true, initialHighlightFading)
                : ""
                }`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Resume
                  </CardTitle>
                </CardHeader>

                <CardDescription className="text-sm text-muted-foreground mb-2 px-4">
                  Upload your resume to get personalized AI-powered insights
                </CardDescription>
                <CardContent className="space-y-4">
                  {!resumeFile ? (
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all h-[400px] flex flex-col justify-center ${isDailyLimitReached
                        ? "border-muted-foreground/15 bg-muted/20 cursor-not-allowed opacity-60"
                        : `cursor-pointer group ${isDragOver
                          ? "border-primary bg-primary/10 scale-105 shadow-lg"
                          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
                        }`
                        }`}
                      onDrop={isDailyLimitReached ? undefined : handleDrop}
                      onDragOver={isDailyLimitReached ? undefined : handleDragOver}
                      onDragLeave={isDailyLimitReached ? undefined : handleDragLeave}
                      onClick={isDailyLimitReached ? undefined : () => fileInputRef.current?.click()}
                    >
                      <motion.div
                        animate={{
                          y: isDragOver ? -5 : 0,
                          scale: isDragOver ? 1.05 : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                      >
                        <Upload
                          className={`mx-auto h-16 w-16 mb-4 transition-colors ${isDailyLimitReached
                            ? "text-muted-foreground/30"
                            : isDragOver
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary"
                            }`}
                        />
                        <div className="space-y-3">
                          <div>
                            <p className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                              {isDailyLimitReached
                                ? "Daily limit reached"
                                : isDragOver
                                  ? "Drop it here!"
                                  : "Drop your resume here"}
                            </p>
                            <p className="text-base text-muted-foreground mt-2">
                              {isDailyLimitReached
                                ? `You've used all ${maxWishes} wishes for today. Come back tomorrow!`
                                : "or click anywhere to browse files"}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-dashed border-muted-foreground/20">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">
                                Accepted formats:
                              </span>{" "}
                              {ACCEPTED_FILE_TYPES.join(", ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Max size:</span>{" "}
                              {formatFileSize(MAX_FILE_SIZE)}
                            </p>
                          </div>

                          {/* Visual indicators */}
                          <div className="flex justify-center gap-2 pt-2">
                            {[1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 bg-primary/30 rounded-full"
                                animate={{
                                  scale: isDragOver ? [1, 1.5, 1] : 1,
                                  opacity: isDragOver ? [0.3, 1, 0.3] : 0.3,
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: isDragOver ? Infinity : 0,
                                  delay: i * 0.2,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_FILE_TYPES.join(",")}
                        onChange={handleFileInputChange}
                        disabled={isDailyLimitReached}
                      />
                    </div>
                  ) : (
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ 
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                    >
                      <motion.div 
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-primary/20"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.4,
                          delay: 0.1,
                          ease: "easeOut"
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <motion.div
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ 
                              duration: 0.5,
                              delay: 0.2,
                              type: "spring",
                              stiffness: 200
                            }}
                          >
                            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{resumeFile.name}</p>
                              {resumeFile.autoLoaded && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ 
                                    duration: 0.3,
                                    delay: 0.4
                                  }}
                                >
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs whitespace-nowrap">
                                    &#128970; Primary Resume
                                  </Badge>
                                </motion.div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(resumeFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 flex-shrink-0"
                          title="Remove and upload different resume"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      {/* Upload Progress */}
                      {isLoading && (
                        <motion.div 
                          className="space-y-2"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </motion.div>
                      )}

                      {/* Processing Status */}
                      {resumeFile.isUploaded && resumeFile.resumeData && (
                        <motion.div 
                          className="flex items-center gap-2 text-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.3 }}
                        >
                          {resumeFile.resumeData.processing_status === "completed" ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="font-medium">Ready for analysis</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-muted-foreground">Processing...</span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Job Posting */}
            <motion.div variants={itemVariants}>
              <Card className={`h-full hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all ${showInitialHighlight && !analysisResults
                ? getHighlightClass(true, initialHighlightFading)
                : ""
                }`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Your Career Wish
                  </CardTitle>

                </CardHeader>
                <CardDescription className="text-sm text-muted-foreground mb-2 px-4">
                  Paste a job description to analyze your resume match, or ask for resume improvement tips
                </CardDescription>
                <CardContent className="space-y-4" suppressHydrationWarning>
                  {/* Company and Position Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground block">
                        Company Name (optional)
                      </label>
                      <Input
                        placeholder="e.g., Acme Corp"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        suppressHydrationWarning
                        className="w-full h-10 border-2 transition-all duration-200 bg-background/50 backdrop-blur-sm border-muted-foreground/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground block">
                        Position Title (optional)
                      </label>
                      <Input
                        placeholder="e.g., Senior Software Engineer"
                        value={positionTitle}
                        onChange={(e) => setPositionTitle(e.target.value)}
                        suppressHydrationWarning
                        className="w-full h-10 border-2 transition-all duration-200 bg-background/50 backdrop-blur-sm border-muted-foreground/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Job Posting Textarea */}
                  <div className="relative">
                    <Textarea
                      placeholder={isDailyLimitReached
                        ? `Daily limit reached (${dailyWishes}/${maxWishes}). Come back tomorrow!`
                        : "Paste a full job posting to see how well your resume matches or ask for resume advice! \n\nExamples:\n• 'How can I improve my resume for senior software engineer roles?'\n• 'Give me tips to optimize my resume for ATS systems'"}
                      value={jobPosting}
                      onChange={(e) => {
                        setJobPosting(e.target.value);
                        if (!isResumeUploading && e.target.value.trim()) {
                          setShowInitialHighlight(false);
                          setShowButtonHighlight(true);
                        }
                      }}
                      disabled={isDailyLimitReached}
                      suppressHydrationWarning
                      className={`h-[400px] resize-none overflow-y-auto border-2 transition-all duration-200 bg-background/50 backdrop-blur-sm text-sm leading-relaxed rounded-lg ${isDailyLimitReached
                        ? "border-muted-foreground/20 opacity-60 cursor-not-allowed"
                        : "border-muted-foreground/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }`}
                    />

                    {/* Character count indicator */}
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-muted-foreground/20 shadow-sm">
                      {jobPosting.length} / 10,000 characters
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Submit Button */}

          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center"
          >
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={
                !resumeFile ||
                !jobPosting.trim() ||
                isDailyLimitReached ||
                isAnalyzing ||
                isResumeUploading
              }
              className={`px-8 ${showButtonHighlight && !(!resumeFile || !jobPosting.trim() || isDailyLimitReached || isAnalyzing || isResumeUploading) ? getHighlightClass(true) : ''}`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Granting Wish...
                </>
              ) : !resumeFile ? (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Resume First
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Grant My Wish
                </>
              )}
            </Button>
          </motion.div>

          {/* Analysis Results Cards */}
          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Resume Analysis */}
            <Card className={`relative hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all duration-300 ${showOutputHighlight && analysisResults
              ? getHighlightClass(true, outputHighlightFading)
              : ""
              }`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-purple-600" />
                  Resume Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overall Score Display */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-2"
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-5xl font-bold text-purple-600"
                    >
                      {analysisResults?.overallScore
                        ? Math.round(analysisResults.overallScore)
                        : analysisResults?.resumeScore || "---"}
                    </motion.div>
                    <div className="text-sm text-muted-foreground">out of 100</div>
                    <div className="relative h-2 bg-purple-600/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisResults?.overallScore || analysisResults?.resumeScore || 0}%` }}
                        transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                        className="absolute top-0 left-0 h-full bg-purple-600 rounded-full"
                      />
                    </div>
                  </motion.div>

                  {/* Score Breakdown */}
                  {analysisResults?.scoreBreakdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-3 pt-3 border-t"
                    >
                      <p className="text-sm font-semibold">Score Components</p>
                      <div className="space-y-3">
                        {[
                          { label: 'Style & Format', key: 'style_formatting', Icon: Palette, color: 'text-purple-500' },
                          { label: 'Grammar & Spelling', key: 'grammar_spelling', Icon: CheckCircle2, color: 'text-purple-500' },
                          { label: 'Job Match', key: 'job_match', Icon: Crosshair, color: 'text-purple-500' },
                          { label: 'ATS Compatibility', key: 'ats_compatibility', Icon: Cpu, color: 'text-purple-500' },
                          { label: 'Content Quality', key: 'content_quality', Icon: Award, color: 'text-purple-500' }
                        ].map(({ label, key, Icon, color }, index) => {
                          const score = Math.round(analysisResults.scoreBreakdown?.[key as keyof typeof analysisResults.scoreBreakdown]?.score || 0);
                          return (
                            <motion.div 
                              key={key} 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + index * 0.1 }}
                              className="space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${color}`} />
                                  <span className="font-medium">{label}</span>
                                </span>
                                <span className="font-bold text-purple-600">
                                  {score}
                                </span>
                              </div>
                              <div className="relative h-1.5 bg-purple-600/20 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${score}%` }}
                                  transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: "easeOut" }}
                                  className="absolute top-0 left-0 h-full bg-purple-600 rounded-full"
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* No insights here - moved to recommendations section */}
                  {!analysisResults && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      Upload your resume to get comprehensive analysis
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job Match Score */}
            <Card className={`relative hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all duration-300 ${showOutputHighlight && analysisResults
              ? getHighlightClass(true, outputHighlightFading)
              : ""
              }`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                  Job Match Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Match Score</span>
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                    >
                      {analysisResults
                        ? `${analysisResults.matchScore}%`
                        : "---%"}
                    </Badge>
                  </div>
                  <div className="relative h-2 bg-purple-600/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisResults?.matchScore || 0}%` }}
                      transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-purple-600 rounded-full"
                    />
                  </div>
                  
                  {/* Job Match Context - What you have and what's missing */}
                  {analysisResults?.scoreBreakdown?.job_match && 
                   ((analysisResults.scoreBreakdown.job_match.matches?.length ?? 0) > 0 || 
                    (analysisResults.scoreBreakdown.job_match.gaps?.length ?? 0) > 0) ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        What you have and what's missing for this role
                      </p>
                      
                      <div 
                        onClick={() => setIsJobMatchModalOpen(true)}
                        className="border border-muted-foreground/25 rounded-lg p-4 transition-all duration-200 bg-background/50 backdrop-blur-sm cursor-pointer hover:shadow-md hover:border-primary/50 hover:bg-primary/5 dark:bg-card h-[280px] flex flex-col overflow-hidden"
                      >
                        {/* Preview - show first 3 of each */}
                        <div className="space-y-2 flex-1 overflow-hidden">
                          {(() => {
                            const matches = analysisResults.scoreBreakdown.job_match.matches || [];
                            const gaps = analysisResults.scoreBreakdown.job_match.gaps || [];
                            const totalItems = matches.length + gaps.length;
                            
                            return (
                              <>
                                {matches.slice(0, 3).map((match: string, idx: number) => (
                                  <div key={`match-${idx}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                    <span className="text-purple-600 mt-0.5">✓</span>
                                    <span>{match}</span>
                                  </div>
                                ))}
                                {gaps.slice(0, 3).map((gap: string, idx: number) => (
                                  <div key={`gap-${idx}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                    <span className="text-purple-600 mt-0.5">✗</span>
                                    <span>{gap}</span>
                                  </div>
                                ))}
                                {totalItems > 6 && (
                                  <div className="text-center pt-2 border-t border-muted-foreground/10 mt-auto flex-shrink-0">
                                    <span className="text-sm text-purple-600 hover:text-purple-700 hover:underline">
                                      View all {totalItems} items
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  ) : analysisResults?.scoreBreakdown?.job_match ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {analysisResults.scoreBreakdown.job_match.feedback || 
                       `Your resume matches ${analysisResults.matchScore}% of the job requirements`}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {analysisResults
                        ? `Your resume matches ${analysisResults.matchScore}% of the job requirements`
                        : "See how well your resume matches the job requirements"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skill Gap Analysis */}
            <Card className={`overflow-hidden relative hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all duration-300 ${showOutputHighlight && analysisResults
              ? getHighlightClass(true, outputHighlightFading)
              : ""
              }`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Skill Gap Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Skills from the job posting that could strengthen your
                    profile
                  </p>
                  
                  {/* Expandable Inner Card - Only shows when there are skills */}
                  {analysisResults && analysisResults.skillGaps.length > 0 && (
                    <div 
                      onClick={() => setIsSkillGapModalOpen(true)}
                      className="border border-muted-foreground/25 rounded-lg p-4 transition-all duration-200 bg-background/50 backdrop-blur-sm cursor-pointer hover:shadow-md hover:border-primary/50 hover:bg-primary/5 dark:bg-card h-[280px] flex flex-col overflow-hidden"
                    >
                      <ul className="space-y-2 text-sm flex-1 overflow-hidden">
                        {analysisResults.skillGaps.slice(0, 8).map((skill: string, index: number) => (
                          <li
                            key={index}
                            className="flex items-start gap-2"
                          >
                            <span className="text-purple-600 mt-1">
                              •
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">{skill.trim()}</span>
                          </li>
                        ))}
                      </ul>
                      {analysisResults.skillGaps.length > 8 && (
                        <div className="text-center pt-3 border-t border-muted-foreground/10 mt-auto flex-shrink-0">
                          <span className="text-sm text-purple-600 hover:text-purple-700 hover:underline">
                            View all {analysisResults.skillGaps.length} skills
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Interview Questions and Cover Letter Row */}
          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Interview Questions - Stacked Card View */}
            <Card className={`relative hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all duration-300 cursor-pointer group ${showOutputHighlight && analysisResults ? getHighlightClass(true, outputHighlightFading) : ""}`}
              onClick={analysisResults && interviewQuestions.length === 0 && !generatingQuestions ? handleGenerateQuestions : undefined}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Interview Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-2">
                {!analysisResults ? (
                  <p className="text-sm text-muted-foreground text-center">
                    Run your analysis above to generate interview questions based on your resume and job description
                  </p>
                ) : interviewQuestions.length === 0 ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {generatingQuestions
                        ? "Generating interview questions..."
                        : "Click to generate interview questions based on your resume and job description"}
                    </p>
                    {generatingQuestions && (
                      <div className="flex items-center justify-center mt-3">
                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      </div>
                    )}
                  </div>
                ) : (
                  <InterviewQuestionsCards 
                    questions={interviewQuestions}
                    isLoading={generatingQuestions}
                  />
                )}
              </CardContent>
            </Card>

            {/* AI Recommendations now located inside the Genie counter card */}

            {/* Cover Letter Card */}
            <Card className={`relative hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all duration-300 cursor-pointer group ${showOutputHighlight && analysisResults ? getHighlightClass(true, outputHighlightFading) : ""}`}
              onClick={analysisResults ? () => {
                if (coverLetter) {
                  setIsCoverLetterModalOpen(true);
                } else {
                  handleGenerateCoverLetter();
                }
              } : undefined}
            >
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Sample Cover Letter
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-3">
                {!analysisResults ? (
                  <p className="text-sm text-muted-foreground text-center">
                    Run your analysis above to generate a sample cover letter based on your resume and job description
                  </p>
                ) : !coverLetter ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {generatingCoverLetter
                        ? "Generating cover letter..."
                        : "Click to generate a cover letter based on your resume and job description"}
                    </p>
                    {generatingCoverLetter && (
                      <div className="flex items-center justify-center mt-3">
                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-96 flex flex-col">
                    <div className="border border-muted-foreground/25 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 dark:hover:border-purple-700 bg-background/50 backdrop-blur-sm dark:bg-card flex-1 flex flex-col overflow-hidden cursor-pointer">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 flex-1 overflow-auto">
                        {coverLetter}
                      </div>
                      <div className="text-center pt-3 border-t border-muted-foreground/25 mt-auto flex-shrink-0">
                        <span className="text-xs text-purple-600 dark:text-purple-400">Click card to view full letter</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Wish History */}
          <motion.div variants={itemVariants}>
            <Card className={`max-w-4xl mx-auto hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 hover:shadow-lg dark:hover:border-purple-600 transition-all ${showOutputHighlight && wishes.some(w => w.status === 'completed')
              ? getHighlightClass(true, outputHighlightFading)
              : ""
              }`}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Clock className="h-5 w-5 flex-shrink-0" />
                      <span>Your Wish History</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Click any analysis to view full results
                    </CardDescription>
                  </div>
                </div>

                {/* Search and Filter Section */}
                {wishes.length > 0 && (
                  <div className="flex flex-col gap-3 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <Input
                        placeholder="Search wishes by title or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-input bg-background text-foreground placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <Button
                        variant={statusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                        className="whitespace-nowrap text-xs sm:text-sm"
                      >
                        All ({wishes.length})
                      </Button>
                      <Button
                        variant={statusFilter === "completed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("completed")}
                        className="whitespace-nowrap text-xs sm:text-sm"
                      >
                        <Trophy className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">Completed</span>
                        <span className="sm:hidden">Done</span>
                        <span className="ml-1">({wishes.filter(w => w.status === "completed").length})</span>
                      </Button>
                      <Button
                        variant={statusFilter === "processing" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("processing")}
                        className="whitespace-nowrap text-xs sm:text-sm"
                      >
                        <Zap className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">Processing</span>
                        <span className="sm:hidden">Active</span>
                        <span className="ml-1">({wishes.filter(w => w.status === "processing").length})</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="h-80 sm:h-96 p-4 sm:p-6 pt-0">
                <div className="h-full flex flex-col">
                  {filteredWishes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col justify-center">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>
                        {wishes.length === 0
                          ? "No wishes yet! Make your first wish above."
                          : searchQuery || statusFilter !== "all"
                            ? "No wishes match your current filters."
                            : "No wishes found."
                        }
                      </p>
                      {(searchQuery || statusFilter !== "all") && wishes.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                          }}
                          className="mt-2"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                      {filteredWishes.map((wish) => (
                        <motion.div
                          key={wish.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            if (wish.status === "completed") {
                              setSelectedWish(wish);
                              setIsWishDetailModalOpen(true);
                            }
                          }}
                          className={`border border-muted-foreground/25 rounded-lg p-3 sm:p-4 transition-all duration-200 bg-background/50 backdrop-blur-sm ${wish.status === "completed"
                            ? "cursor-pointer hover:shadow-md hover:border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 dark:bg-card"
                            : "cursor-default dark:bg-card"
                            }`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3 mb-3">
                            <div
                              className={`p-2 rounded-lg text-white flex-shrink-0 ${getWishColor(
                                wish.type
                              )}`}
                            >
                              {getWishIcon(wish.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-sm sm:text-base break-words flex-1">
                                  {wish.title}
                                </h4>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {wish.status === "completed" &&
                                    wish.results?.score && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs"
                                      >
                                        {wish.results.score}%
                                      </Badge>
                                    )}
                                  <Badge
                                    variant={
                                      wish.status === "completed"
                                        ? "default"
                                        : wish.status === "processing"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className={`text-xs whitespace-nowrap ${wish.status === "completed"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                                      : wish.status === "processing"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                                      }`}
                                  >
                                    {wish.status === "processing" && (
                                      <Zap className="h-3 w-3 mr-1 animate-pulse flex-shrink-0" />
                                    )}
                                    {wish.status === "completed" && (
                                      <Trophy className="h-3 w-3 mr-1 flex-shrink-0" />
                                    )}
                                    <span className="hidden sm:inline">
                                      {wish.status.charAt(0).toUpperCase() +
                                        wish.status.slice(1)}
                                    </span>
                                    <span className="sm:hidden">
                                      {wish.status === "completed" ? "Done" : wish.status === "processing" ? "Active" : "Pending"}
                                    </span>
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await deleteWish(wish.id);
                                    }}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 flex-shrink-0"
                                    title="Delete wish"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
                                {wish.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(
                                    wish.timestamp
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {wish.status === "processing" && (
                            <div className="mt-3">
                              <Progress value={65} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                AI genie is working on your request...
                              </p>
                            </div>
                          )}

                          {wish.status === "completed" && wish.results && (
                            <div className="mt-3 pt-3 border-t border-muted/50">
                              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                                {wish.results.score && (
                                  <div>
                                    <div className="text-base sm:text-lg font-bold text-primary">
                                      {wish.results.score}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      <span className="hidden sm:inline">Overall </span>Score
                                    </div>
                                  </div>
                                )}
                                {wish.results.insights && (
                                  <div>
                                    <div className="text-base sm:text-lg font-bold text-purple-600">
                                      {wish.results.insights.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Insights
                                    </div>
                                  </div>
                                )}
                                {wish.results.recommendations && (
                                  <div>
                                    <div className="text-base sm:text-lg font-bold text-purple-600">
                                      {wish.results.recommendations.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Tips
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recommendations Modal */}
          <AnimatePresence>
            {isRecModalOpen && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsRecModalOpen(false)}
                />
                <motion.div
                  className="relative w-full max-w-3xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div
                    className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm hover:border-purple-300 dark:hover:bg-purple-950/30 hover:shadow-3xl dark:hover:border-purple-600 transition-all"
                    ref={modalRef}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        Key Insights
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copyRecommendationsToClipboard}
                          aria-label="Copy recommendations"
                          title="Copy recommendations to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsRecModalOpen(false)}
                          ref={modalCloseRef}
                          aria-label="Close recommendations"
                          title="Close recommendations modal"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[60vh] overflow-auto text-sm">
                      {analysisResults?.recommendations &&
                        analysisResults.recommendations.length > 0
                        ? analysisResults.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="text-purple-600 mt-1">•</span>
                            <div className="text-gray-700 dark:text-gray-300">{rec}</div>
                          </div>
                        ))
                        : [
                          "The cosmic forces are still aligning your personalized insights ✨",
                          "Your genie is crafting magical recommendations just for you 🔮",
                          "The stars haven't revealed your perfect guidance yet - try again! 🌟",
                          "Your wishes deserve divine attention - let me divine deeper insights! 💫",
                        ].map((mock, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="text-muted-foreground mt-1">
                              •
                            </span>
                            <div className="text-muted-foreground">{mock}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skill Gap Modal */}
          <AnimatePresence>
            {isSkillGapModalOpen && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsSkillGapModalOpen(false)}
                />
                <motion.div
                  className="relative w-full max-w-3xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm hover:border-purple-300 hover:shadow-3xl dark:hover:border-purple-600 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        Skill Gap Analysis
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copySkillGapsToClipboard}
                          aria-label="Copy skills"
                          title="Copy skills to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsSkillGapModalOpen(false)}
                          aria-label="Close skills"
                          title="Close skills modal"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Skills from the job posting that could strengthen your profile
                    </p>
                    <div className="max-h-[60vh] overflow-auto">
                      {analysisResults?.skillGaps && analysisResults.skillGaps.length > 0 ? (
                        <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card">
                          <div className="space-y-3">
                            {analysisResults.skillGaps.map((skill, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <span className="text-purple-600 mt-0.5 flex-shrink-0 font-semibold">•</span>
                                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{skill.trim()}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card flex items-center justify-center">
                          <div className="space-y-3 text-center py-8">
                            {[
                              "The cosmic forces are still aligning your personalized insights ✨",
                              "Your genie is crafting magical recommendations just for you 🔮",
                              "The stars haven't revealed your perfect guidance yet - try again! 🌟",
                              "Your wishes deserve divine attention - let me divine deeper insights! 💫",
                            ].map((mock, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground">{mock}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interview Questions Modal */}
          <AnimatePresence>
            {isInterviewQuestionsModalOpen && interviewQuestions.length > 0 && (
              null
            )}
          </AnimatePresence>

          {/* Job Match Modal */}
          <AnimatePresence>
            {isJobMatchModalOpen && analysisResults?.scoreBreakdown?.job_match && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsJobMatchModalOpen(false)}
                />
                <motion.div
                  className="relative w-full max-w-3xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm hover:border-purple-300 hover:shadow-3xl dark:hover:border-purple-600 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        Job Match Analysis
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsJobMatchModalOpen(false)}
                        aria-label="Close"
                        title="Close modal"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Summary */}
                    <p className="text-sm text-muted-foreground mb-4">
                      {analysisResults.scoreBreakdown.job_match.feedback}
                    </p>
                    
                    <div className="space-y-5 max-h-[60vh] overflow-auto">
                      {/* What You Have */}
                      {analysisResults.scoreBreakdown.job_match.matches && 
                       analysisResults.scoreBreakdown.job_match.matches.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="h-5 w-5 text-purple-600" />
                            <h4 className="font-medium text-purple-600">What You Have</h4>
                          </div>
                          <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card">
                            <div className="space-y-3">
                              {analysisResults.scoreBreakdown.job_match.matches.map((match: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <span className="text-purple-600 mt-0.5 flex-shrink-0 font-semibold">✓</span>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{match}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* What's Missing */}
                      {analysisResults.scoreBreakdown.job_match.gaps && 
                       analysisResults.scoreBreakdown.job_match.gaps.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <X className="h-5 w-5 text-purple-600" />
                            <h4 className="font-medium text-purple-600">What's Missing</h4>
                          </div>
                          <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card">
                            <div className="space-y-3">
                              {analysisResults.scoreBreakdown.job_match.gaps.map((gap: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <span className="text-purple-600 mt-0.5 flex-shrink-0 font-semibold">✗</span>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{gap}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wish Detail Modal */}
          <AnimatePresence>
            {isWishDetailModalOpen && selectedWish && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsWishDetailModalOpen(false)}
                />
                <motion.div
                  className="relative w-full max-w-4xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm max-h-[90vh] overflow-hidden flex flex-col hover:border-purple-300 dark:hover:bg-purple-950/30 hover:shadow-3xl dark:hover:border-purple-600 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg text-white ${getWishColor(
                            selectedWish.type
                          )}`}
                        >
                          {getWishIcon(selectedWish.type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {selectedWish.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(
                              selectedWish.timestamp
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsWishDetailModalOpen(false)}
                        aria-label="Close wish details"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6">
                      {/* Overall Score */}
                      {selectedWish.results?.score && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4 text-purple-600" />
                            Overall Analysis Score
                          </h4>
                          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                            <div className="text-3xl font-bold text-primary">
                              {selectedWish.results.score}%
                            </div>
                            <div className="flex-1">
                              <Progress
                                value={selectedWish.results.score}
                                className="h-3"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Key Insights */}
                      {selectedWish.results?.insights &&
                        selectedWish.results.insights.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <Target className="h-4 w-4 text-purple-600" />
                              Key Insights (
                              {selectedWish.results.insights.length})
                            </h4>
                            <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card">
                              <div className="space-y-3">
                                {selectedWish.results.insights.map(
                                  (insight, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start gap-3"
                                    >
                                      <span className="text-purple-600 mt-0.5 font-semibold flex-shrink-0">
                                        •
                                      </span>
                                      <span className="text-sm leading-relaxed">{insight}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Skills to Highlight */}
                      {selectedWish.results?.recommendations &&
                        selectedWish.results.recommendations.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-purple-600" />
                              Skills to Highlight (
                              {selectedWish.results.recommendations.length})
                            </h4>
                            <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedWish.results.recommendations.map(
                                  (rec, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">
                                          {index + 1}
                                        </span>
                                      </div>
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{rec}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Recommended Skills to Add */}
                      {selectedWish.results?.skillGaps &&
                        selectedWish.results.skillGaps.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-500" />
                              Recommended Skills to Add (
                              {selectedWish.results.skillGaps.length})
                            </h4>
                            <ul className="space-y-1">
                              {selectedWish.results.skillGaps.map((skill, index: number) => {
                                const skillName = typeof skill === "string" ? skill : skill.skill;
                                return (
                                  <li
                                    key={index}
                                    className="text-sm text-muted-foreground flex items-start gap-2"
                                  >
                                    <span className="text-amber-500 mt-1">•</span>
                                    {skillName}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cover Letter Modal */}
          <AnimatePresence>
            {isCoverLetterModalOpen && coverLetter && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
              >
                <motion.div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsCoverLetterModalOpen(false)}
                />
                <motion.div
                  className="relative w-full max-w-3xl mx-auto p-6"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <div className="bg-card rounded-lg p-6 shadow-2xl border backdrop-blur-sm hover:border-purple-300 hover:shadow-3xl dark:hover:border-purple-600 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Sample Cover Letter
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCopyCoverLetter}
                          aria-label="Copy cover letter"
                          title={isCopied ? "Copied!" : "Copy to clipboard"}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsCoverLetterModalOpen(false)}
                          aria-label="Close modal"
                          title="Close modal"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {companyName || "Company"} - {positionTitle || "Position"}
                    </p>
                    <div className="max-h-[60vh] overflow-auto">
                      <div className="border border-muted-foreground/25 rounded-lg p-4 bg-background/50 backdrop-blur-sm dark:bg-card">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {coverLetter}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                      <Button
                        onClick={() => handleDownloadCoverLetter('text')}
                        size="sm"
                        className="bg-slate-600 hover:bg-slate-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download as Text
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}