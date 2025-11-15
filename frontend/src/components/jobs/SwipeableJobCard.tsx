'use client';

import React, { useState, useRef } from 'react';
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { X, MapPin, DollarSign, Eye, Building2, Target, ExternalLink } from 'lucide-react';
import { JobDisplay } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SwipeableJobCardProps {
  job: JobDisplay;
  onSwipeAction: (direction: 'left' | 'right', jobId: string) => void;
  onViewDetailsAction: (job: JobDisplay) => void;
  isActive: boolean;
}

const SWIPE_THRESHOLD = 100;

export function SwipeableJobCard({ 
  job, 
  onSwipeAction, 
  onViewDetailsAction, 
  isActive
}: SwipeableJobCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const isMountedRef = useRef(false);
  
  // Motion values for smooth dragging
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform values for rotation and opacity
  const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]);
  const opacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, 200], [0, 1, 1, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);

  // On mount, animate in the first card
  React.useEffect(() => {
    if (isActive && !isMountedRef.current) {
      isMountedRef.current = true;
    }
  }, [isActive]);

  // Reset motion values when card becomes active
  React.useLayoutEffect(() => {
    if (isActive && !isExiting) {
      x.set(0);
      y.set(0);
      setIsDragging(false);
      setIsExiting(false);
      
      // Smooth transition to active state
      controls.start({ 
        x: 0, 
        y: 0, 
        rotate: 0, 
        opacity: 1, 
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      });
      isMountedRef.current = true;
    } else if (!isActive) {
      // Inactive cards - immediate update to prevent flashing
      controls.set({ x: 0, y: 0, rotate: 0, opacity: 0.85, scale: 0.96 });
    }
  }, [isActive, isExiting, x, y, controls]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isActive || isExiting) return;
    
    setIsDragging(false);
    const swipeThreshold = SWIPE_THRESHOLD;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Determine swipe direction
    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > 500) {
      const direction = offset > 0 ? 'right' : 'left';
      setIsExiting(true);
      
      // Animate card off screen
      controls.start({
        x: direction === 'right' ? 1000 : -1000,
        rotate: direction === 'right' ? 30 : -30,
        opacity: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
      });
      
      // Call swipe action immediately without await
      setTimeout(() => onSwipeAction(direction, job.id), 100);
    } else {
      // Snap back to center with smooth animation
      await controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 500, damping: 35 }
      });
      x.set(0);
      y.set(0);
    }
  };



  const handlePass = async () => {
    if (!isActive || isDragging || isExiting) return;
    setIsExiting(true);
    controls.start({
      x: -1000,
      rotate: -30,
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    });
    setTimeout(() => onSwipeAction('left', job.id), 100);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`absolute inset-0 flex items-center justify-center px-3 py-4 sm:p-4 ${isDragging ? 'z-50' : isActive ? 'z-40' : 'z-30'}`}
      style={{ 
        x: isActive ? x : 0,
        y: isActive ? y : 0,
        rotate: isActive ? rotate : 0,
        opacity: isActive ? (isDragging ? opacity : 1) : 0.85,
        scale: isActive ? 1 : 0.96,
        pointerEvents: isActive ? 'auto' : 'none',
        touchAction: 'none',
      }}
      animate={controls}
      drag={isActive && !isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.2, right: 0.2 }}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
    >
      {/* Swipe indicators - removed for cleaner look */}
      
      {/* Main card content */}
      <Card className="w-full max-w-md hover:shadow-xl transition-all duration-300 group !bg-gradient-to-br from-purple-50/90 to-blue-50/90 dark:from-purple-950/40 dark:to-blue-950/40 backdrop-blur-sm border-2 border-purple-200/50 dark:border-purple-800/50 rounded-3xl shadow-2xl overflow-hidden" style={{ maxHeight: '75vh', height: 'auto', minHeight: '500px' }}>
        <div className="flex flex-col h-full">
          <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight">
                  {job.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{job.company}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{job.location}</span>
                  </div>
                  {job.salaryText && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{job.salaryText}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full">
                  <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-sm text-purple-600 dark:text-purple-400">{job.matchScore || 0}%</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-purple-300 dark:border-purple-700">
                  {job.type || 'Full-time'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-3 pb-3 px-4 flex flex-col space-y-3 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-3">
              {/* Job Description - properly formatted */}
              <div className="min-h-[100px] max-h-[180px] overflow-y-auto">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {(job.snippet || 'Join our dynamic team and work on exciting projects that make a real impact in the industry. We are looking for talented individuals who are passionate about technology and innovation.')
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, ' ')
                    .trim()
                  }
                </p>
              </div>

              {/* Job Details - 4 blocks in 2 rows */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
                  <div className="font-semibold text-[10px] sm:text-xs">Experience</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">2-5 years</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
                  <div className="font-semibold text-[10px] sm:text-xs">Type</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{job.type || 'Full-time'}</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
                  <div className="font-semibold text-[10px] sm:text-xs">Remote</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{job.location?.includes('Remote') ? 'Yes' : 'Hybrid'}</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
                  <div className="font-semibold text-[10px] sm:text-xs">Match</div>
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-xs sm:text-sm">{job.matchScore || 0}%</div>
                </div>
              </div>
            </div>
            
            {/* Divider line */}
            <div className="border-t border-purple-200/50 dark:border-purple-800/50"></div>
            
            {/* Clean action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePass}
                className="flex-1 gap-1 h-9 text-xs border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-700 transition-all"
                disabled={isDragging || isExiting}
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Pass</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetailsAction(job)}
                className="flex-1 gap-1 h-9 text-xs border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                disabled={isDragging || isExiting}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Details</span>
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(job.redirect_url, '_blank')}
                className="flex-1 gap-1 h-9 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white font-semibold transition-all shadow-md hover:shadow-lg"
                disabled={isDragging || isExiting}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Apply
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}