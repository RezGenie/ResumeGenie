'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building, 
  ExternalLink, 
  Heart,
  Calendar,
  Users,
  Briefcase,
  Award,
  Target
} from 'lucide-react';
import { JobDisplay } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/ui/logo';

interface JobDetailsModalProps {
  job: JobDisplay | null;
  isOpen: boolean;
  onCloseAction: () => void;
  onLikeAction: (jobId: string) => void;
  onPassAction: (jobId: string) => void;
}

export function JobDetailsModal({ 
  job, 
  isOpen, 
  onCloseAction, 
  onLikeAction, 
  onPassAction 
}: JobDetailsModalProps) {
  if (!job || !isOpen) return null;

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-0 sm:p-6"
      onClick={onCloseAction}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ 
          type: 'spring', 
          damping: 25, 
          stiffness: 400,
          duration: 0.3
        }}
        className="bg-card w-full h-full sm:w-full sm:max-w-3xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-hidden shadow-2xl border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-purple-100 dark:border-purple-800/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center p-1">
                <Logo size={32} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Job Details</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Target className="h-3 w-3 text-purple-600" />
                  <span className="font-medium text-purple-600">{job.matchScore || 85}% Match</span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCloseAction}
              className="hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-full h-8 w-8 p-0 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div>
            <h1 className="text-xl font-bold mb-2 leading-tight">
              {job.title}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Building className="w-4 h-4" />
              <span className="font-medium">{job.company}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{getTimeAgo(job.posted_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {/* Key Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Salary */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <h3 className="font-medium text-sm">
                  Compensation
                </h3>
              </div>
              <p className="text-sm font-medium">
                {job.salaryText || 'Salary not specified'}
              </p>
            </div>

            {/* Job Type */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <h3 className="font-medium text-sm">
                  Employment Type
                </h3>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {job.type || 'Full-time'}
                </Badge>
                {job.remote && (
                  <Badge variant="secondary" className="text-xs">
                    Remote
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                About This Role
              </h3>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {job.snippet || 'No description available for this position.'}
              </p>
            </div>
          </div>

          {/* Skills & Requirements */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Skills & Technologies
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Job Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Job Details
              </h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Posted on:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(job.posted_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Job Provider:</span>
                <span className="text-gray-900 dark:text-white font-medium capitalize">
                  {job.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Location Type:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {job.remote ? 'Remote' : 'On-site'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Genie Recommendation */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Logo size={24} />
              </div>
              <div>
                <h4 className="font-medium mb-1">
                  Genie&apos;s Insight
                </h4>
                <p className="text-sm text-muted-foreground">
                  This position aligns well with current market trends. The company has a solid reputation, 
                  and the role offers good growth potential. Consider highlighting relevant experience 
                  in your application.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-purple-100 dark:border-purple-800/50 p-6 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onPassAction(job.id);
                onCloseAction();
              }}
              className="flex-1 gap-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 hover:text-red-700 transition-all"
            >
              <X className="w-4 h-4" />
              Pass
            </Button>
            
            <Button
              onClick={() => window.open(job.redirect_url, '_blank')}
              className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Apply Now
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Import and use savedJobsService
                const { savedJobsService } = require('@/lib/api/savedJobs');
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
                onLikeAction(job.id);
                onCloseAction();
              }}
              className="flex-1 gap-2 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 hover:text-purple-700 transition-all"
            >
              <Heart className="w-4 h-4" />
              Save Job
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}