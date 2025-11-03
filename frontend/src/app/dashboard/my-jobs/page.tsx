'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Building, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Archive, 
  CheckCircle, 
  Bookmark,
  Download,
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { savedJobsService, SavedJob, SavedJobsFilters } from '@/lib/api/savedJobs';

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100
    }
  }
} as const;

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<SavedJob[]>([]);
  const [filters, setFilters] = useState<SavedJobsFilters>({ status: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [stats, setStats] = useState({ total: 0, saved: 0, applied: 0, archived: 0 });

  // Load jobs on component mount
  useEffect(() => {
    loadJobs();
  }, []);

  // Apply filters when jobs or filters change
  useEffect(() => {
    const filtered = savedJobsService.getFilteredJobs({ ...filters, search: searchTerm });
    setFilteredJobs(filtered);
  }, [jobs, filters, searchTerm]);

  const loadJobs = () => {
    const savedJobs = savedJobsService.getSavedJobs();
    const jobStats = savedJobsService.getJobsStats();
    setJobs(savedJobs);
    setStats(jobStats);
  };

  const handleStatusChange = (jobId: string, status: SavedJob['status']) => {
    if (savedJobsService.updateJobStatus(jobId, status)) {
      loadJobs();
    }
  };

  const handleRemoveJob = (jobId: string) => {
    if (savedJobsService.removeSavedJob(jobId)) {
      loadJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
    }
  };

  const handleUpdateNotes = (jobId: string, notes: string) => {
    if (savedJobsService.updateJobNotes(jobId, notes)) {
      loadJobs();
      setEditingNotes(null);
      
      // Update selected job if it's the one being edited
      if (selectedJob?.id === jobId) {
        setSelectedJob({ ...selectedJob, notes });
      }
    }
  };

  const handleExportJobs = () => {
    // Convert jobs to CSV format for better user experience
    const headers = ['Title', 'Company', 'Location', 'Salary', 'Status', 'Saved Date', 'Skills', 'Notes', 'Job URL'];
    
    const csvRows = [
      headers.join(','),
      ...jobs.map(job => {
        const row = [
          `"${job.title.replace(/"/g, '""')}"`,
          `"${job.company.replace(/"/g, '""')}"`,
          `"${job.location.replace(/"/g, '""')}"`,
          `"${job.salary || 'Not specified'}"`,
          job.status.charAt(0).toUpperCase() + job.status.slice(1),
          new Date(job.savedAt).toLocaleDateString(),
          `"${job.skills.join(', ')}"`,
          `"${(job.notes || '').replace(/"/g, '""')}"`,
          job.jobUrl || ''
        ];
        return row.join(',');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-jobs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: SavedJob['status']) => {
    switch (status) {
      case 'saved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'applied': return 'bg-green-100 text-green-800 border-green-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: SavedJob['status']) => {
    switch (status) {
      case 'saved': return <Bookmark className="w-4 h-4" />;
      case 'applied': return <CheckCircle className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <Bookmark className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
        <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2">
                My Jobs
              </h1>
              <p className="text-muted-foreground">
                Manage your saved job opportunities
              </p>
            </div>
            
            <Button
              onClick={handleExportJobs}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.saved}</div>
                <div className="text-sm text-gray-600">Saved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.applied}</div>
                <div className="text-sm text-gray-600">Applied</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.archived}</div>
                <div className="text-sm text-gray-600">Archived</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 border-purple-200/50 dark:border-purple-700/50 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 p-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400 h-5 w-5" />
                <Input
                  placeholder="Search jobs, companies, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-700 hover:border-purple-400 focus:border-purple-500 dark:hover:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 shadow-sm focus:shadow-md placeholder:text-purple-400 dark:placeholder:text-purple-500 h-12 text-base"
                />
              </div>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value: string) => 
                  setFilters({ ...filters, status: value === 'all' ? undefined : value as SavedJob['status'] })
                }
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Location..."
                value={filters.location || ''}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full md:w-[180px] bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-700 hover:border-purple-400 focus:border-purple-500 dark:hover:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 shadow-sm focus:shadow-md placeholder:text-purple-400 dark:placeholder:text-purple-500 h-12 text-base"
              />
            </div>
          </Card>
        </motion.div>

        {/* Jobs List */}
        <motion.div variants={itemVariants}>
          {filteredJobs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Bookmark className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No saved jobs yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start saving jobs from the job discovery page to track your applications
                </p>
                <Button onClick={() => window.location.href = '/opportunities'} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Discover Jobs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1" onClick={() => setSelectedJob(job)}>
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-xl font-semibold text-foreground hover:text-purple-600 transition-colors">
                                {job.title}
                              </h3>
                              <Badge className={getStatusColor(job.status)}>
                                {getStatusIcon(job.status)}
                                <span className="ml-1 capitalize">{job.status}</span>
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                {job.company}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </div>
                              {job.salary && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {job.salary}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(job.savedAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {job.skills.slice(0, 4).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {job.skills.length > 4 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{job.skills.length - 4} more
                                </Badge>
                              )}
                            </div>

                            {job.notes && (
                              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                {job.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Select
                              value={job.status}
                              onValueChange={(value: string) => handleStatusChange(job.id, value as SavedJob['status'])}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="saved">Saved</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingNotes(job.id);
                                setNotesText(job.notes || '');
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveJob(job.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            {job.jobUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(job.jobUrl, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Job Details Modal */}
        <AnimatePresence mode="wait">
          {selectedJob && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setSelectedJob(null)}
              />
              
              {/* Modal Content */}
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="pointer-events-auto w-full max-w-4xl max-h-[80vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card className="shadow-2xl bg-card border-purple-200 dark:border-purple-800 flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-border flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-foreground">{selectedJob.title}</h2>
                          <p className="text-lg text-muted-foreground">
                            {selectedJob.company} • {selectedJob.location}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(null)}
                          className="rounded-full h-8 w-8 p-0"
                        >
                          <span className="text-xl">×</span>
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(selectedJob.status)}>
                          {getStatusIcon(selectedJob.status)}
                          <span className="ml-1 capitalize">{selectedJob.status}</span>
                        </Badge>
                        {selectedJob.salary && (
                          <div className="text-lg font-semibold text-purple-600">
                            {selectedJob.salary}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Skills Required</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Job Description</h4>
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{selectedJob.description}</p>
                        </div>
                      </div>

                      {selectedJob.notes && (
                        <div>
                          <h4 className="font-semibold mb-2">My Notes</h4>
                          <p className="bg-muted p-3 rounded">
                            {selectedJob.notes}
                          </p>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        Saved on {new Date(selectedJob.savedAt).toLocaleDateString()} at{' '}
                        {new Date(selectedJob.savedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="p-6 border-t border-border flex-shrink-0 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(selectedJob.id);
                          setNotesText(selectedJob.notes || '');
                          setSelectedJob(null);
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Notes
                      </Button>
                      {selectedJob.jobUrl && (
                        <Button onClick={() => window.open(selectedJob.jobUrl, '_blank')} className="bg-purple-600 hover:bg-purple-700">
                          <ExternalLink className="w-4 w-4 mr-2" />
                          View Original
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Notes Edit Modal */}
        <AnimatePresence mode="wait">
          {editingNotes && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setEditingNotes(null)}
              />
              
              {/* Modal Content */}
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="pointer-events-auto w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card className="shadow-2xl bg-card">
                    <div className="p-6 border-b border-border">
                      <h2 className="text-xl font-bold text-foreground">Edit Notes</h2>
                      <p className="text-sm text-muted-foreground">
                        Add your thoughts, application status, or interview notes
                      </p>
                    </div>

                    <div className="p-6">
                      <Textarea
                        placeholder="Add your notes here..."
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        rows={6}
                      />
                    </div>

                    <div className="p-6 border-t border-border flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingNotes(null)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (editingNotes) {
                            handleUpdateNotes(editingNotes, notesText);
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Save Notes
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}