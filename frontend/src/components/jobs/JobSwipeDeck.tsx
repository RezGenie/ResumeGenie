'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, Sparkles, Heart } from 'lucide-react';
import { SwipeableJobCard } from './SwipeableJobCard';
import { JobDisplay, JobStats } from '@/lib/api/types';
import { jobService } from '@/lib/api/jobs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';


interface JobSwipeDeckProps {
  onJobDetailsAction: (job: JobDisplay) => void;
}

const PREFETCH_THRESHOLD = 3; // Start prefetching when 3 cards left
const CARDS_TO_SHOW = 5; // Number of cards in deck at once

export function JobSwipeDeck({ onJobDetailsAction }: JobSwipeDeckProps) {
  // State management
  const [jobs, setJobs] = useState<JobDisplay[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stats, setStats] = useState<JobStats | null>(null);
  const [swipeStats, setSwipeStats] = useState({ liked: 0, passed: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Refs for prefetching and performance
  const nextPageRef = useRef(1);
  const prefetchingRef = useRef(false);
  const hasMoreJobsRef = useRef(true);

  // Fetch initial jobs and stats
  const fetchInitialData = useCallback(async (resetIndex = false) => {
    setLoading(true);
    setError(null);
    
    // Reset index if requested (for preference updates)
    if (resetIndex) {
      setCurrentIndex(0);
      nextPageRef.current = 1;
      hasMoreJobsRef.current = true;
      prefetchingRef.current = false;
    }
    
    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        jobService.getJobs({}),
        jobService.getJobStats()
      ]);
      
      if (jobsResponse.success && jobsResponse.data) {
        setJobs(jobsResponse.data);
        hasMoreJobsRef.current = jobsResponse.data.length === 20;
        nextPageRef.current = 2;
      } else {
        setError(jobsResponse.message || 'Failed to load jobs');
      }
      
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      setError('An unexpected error occurred while loading jobs');
      console.error('JobSwipeDeck: Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Prefetch more jobs when running low
  const prefetchJobs = useCallback(async () => {
    if (prefetchingRef.current || !hasMoreJobsRef.current) return;
    
    prefetchingRef.current = true;
    
    try {
      const response = await jobService.getJobs({});
      
      if (response.success && response.data) {
        const newJobs = response.data;
        
        setJobs(prevJobs => [...prevJobs, ...newJobs]);
        hasMoreJobsRef.current = newJobs.length === 20;
        nextPageRef.current += 1;
      } else {
        hasMoreJobsRef.current = false;
      }
    } catch (err) {
      console.error('JobSwipeDeck: Error prefetching jobs:', err);
      hasMoreJobsRef.current = false;
    } finally {
      prefetchingRef.current = false;
    }
  }, []);

  // Handle swipe actions with optimistic updates
  const handleSwipe = useCallback(async (direction: 'left' | 'right', jobId: string) => {
    // Prevent multiple rapid swipes
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Update swipe stats optimistically
    setSwipeStats(prev => ({
      ...prev,
      [direction === 'right' ? 'liked' : 'passed']: prev[direction === 'right' ? 'liked' : 'passed'] + 1
    }));

    // Move to next card immediately
    setCurrentIndex(prev => prev + 1);
    
    // Prefetch if running low on cards
    const remainingCards = jobs.length - currentIndex - 1;
    if (remainingCards <= PREFETCH_THRESHOLD && hasMoreJobsRef.current) {
      prefetchJobs();
    }

    // TODO: Send swipe data to backend
    try {
      console.log('Swipe recorded:', direction, jobId);
    } catch (err) {
      console.error('Failed to record swipe:', err);
    }
    
    // Reset animation lock quickly
    setTimeout(() => setIsAnimating(false), 100);
  }, [jobs.length, currentIndex, prefetchJobs, isAnimating]);

  // Refresh deck with new jobs
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentIndex(0);
    nextPageRef.current = 1;
    hasMoreJobsRef.current = true;
    prefetchingRef.current = false;
    
    await fetchInitialData();
    setRefreshing(false);
  }, [fetchInitialData]);

  // Initialize data on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Listen for preference changes and refresh jobs
  useEffect(() => {
    const handlePreferencesUpdate = () => {
      console.log('JobSwipeDeck: Preferences updated, refreshing jobs...');
      fetchInitialData(true); // Reset index and fetch fresh jobs
    };

    // Listen for custom event when preferences are saved
    window.addEventListener('userPreferencesUpdated', handlePreferencesUpdate);

    return () => {
      window.removeEventListener('userPreferencesUpdated', handlePreferencesUpdate);
    };
  }, [fetchInitialData]);

  // Get visible cards for rendering
  const visibleCards = jobs.slice(currentIndex, currentIndex + CARDS_TO_SHOW).reverse();
  const hasCards = visibleCards.length > 0;
  const isLastCard = currentIndex >= jobs.length - 1;

  // Loading state with genie theme
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-12 h-12 text-purple-500" />
        </motion.div>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            ✨ The Genie is gathering opportunities...
          </h3>
          <p className="text-muted-foreground text-sm">
            Preparing your personalized job matches
          </p>
        </div>
      </div>
    );
  }

  // Error state with genie theme
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <Alert className="max-w-md">
          <AlertDescription className="text-center">
            <strong>🧞‍♂️ Oops! The Genie encountered a challenge:</strong>
            <br />
            {error}
          </AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state - no more jobs
  if (!hasCards || isLastCard) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center">
            <Heart className="w-10 h-10 text-purple-600" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-2">
              You&apos;ve reviewed all available opportunities
            </h3>
            <p className="text-muted-foreground mb-4">
              The Genie has shown you all current job matches. Check back later for new opportunities!
            </p>
          </div>

          {/* Swipe statistics */}
          <div className="flex gap-4 justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{swipeStats.liked}</div>
              <div className="text-sm text-muted-foreground">Liked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{swipeStats.passed}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
          </div>
        </motion.div>
        
        <Button onClick={handleRefresh} className="gap-2" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Find New Jobs'}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      {/* Card deck container */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="popLayout">
          {visibleCards.map((job, index) => {
            const cardIndex = currentIndex + visibleCards.length - 1 - index;
            const isActive = index === visibleCards.length - 1;
            
            return (
              <SwipeableJobCard
                key={`${job.id}-${cardIndex}-${currentIndex}`}
                job={job}
                onSwipeAction={handleSwipe}
                onViewDetailsAction={onJobDetailsAction}
                isActive={isActive}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}