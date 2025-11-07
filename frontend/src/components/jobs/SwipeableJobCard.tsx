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
  
  // Motion values for smooth dragging
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform values for rotation and opacity
  const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]);
  const opacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, 200], [0, 0.5, 1, 0.5, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);

  // Reset motion values when card becomes active
  React.useEffect(() => {
    if (isActive && !isExiting) {
      x.set(0);
      y.set(0);
      setIsDragging(false);
      setIsExiting(false);
      controls.set({ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 });
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
      // Snap back to center
      controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 400, damping: 30 }
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
      className={`absolute inset-0 w-full h-full ${isDragging ? 'z-[55]' : isActive ? 'z-[45]' : 'z-10'}`}
      style={{ 
        x: isActive ? x : 0,
        y: isActive ? y : 0,
        rotate: isActive ? rotate : 0,
        opacity: isActive ? 1 : opacity,
        scale: isActive ? 1 : scale,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
      animate={controls}
      drag={isActive && !isExiting ? "x" : false}
      dragConstraints={false}
      dragElastic={0.7}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ scale: 0.8, opacity: 0 }}
      whileInView={{ 
        scale: isActive ? 1 : 0.95, 
        opacity: 1,
        transition: { duration: 0.3 }
      }}
    >
      {/* Swipe indicators - removed for cleaner look */}
      
      {/* Main card content */}
      <Card className="h-full hover:shadow-lg transition-all duration-200 group border-0 shadow-md">
        <div className="h-full flex flex-col">
          <CardHeader className="pb-3">
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
                  <span className="font-bold text-purple-600">{job.matchScore || 85}%</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {job.type}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 pt-0 pb-4 flex flex-col">
            <div className="flex-1 min-h-0 space-y-4">
              {/* Job Description */}
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {job.snippet || 'Join our dynamic team and work on exciting projects that make a real impact in the industry.'}
                </p>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center p-2 bg-muted/30 rounded">
                  <div className="font-medium">Experience</div>
                  <div className="text-muted-foreground">2-5 years</div>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  <div className="font-medium">Type</div>
                  <div className="text-muted-foreground">{job.type || 'Full-time'}</div>
                </div>
              </div>
            </div>
            
            {/* Clean action buttons */}
            <div className="flex gap-2 pt-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePass}
                className="flex-1 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                disabled={isDragging || isExiting}
              >
                <X className="w-4 h-4" />
                Pass
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetailsAction(job)}
                className="flex-1 gap-1 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300"
                disabled={isDragging || isExiting}
              >
                <Eye className="w-4 h-4" />
                Details
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(job.redirect_url, '_blank')}
                className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isDragging || isExiting}
              >
                <ExternalLink className="w-4 h-4" />
                Apply
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}