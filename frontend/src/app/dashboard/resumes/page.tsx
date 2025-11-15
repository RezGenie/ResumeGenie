'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Edit3,
  Star,
  StarOff,
  Plus,
  Search,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { localResumeService, LocalResume } from '@/lib/api/localResumes';
import { DeleteResumeDialog } from '@/components/resumes/DeleteResumeDialog';
import { toast } from 'sonner';
import { userPreferencesService } from '@/lib/api/userPreferences';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString();
  } catch {
    return 'Unknown date';
  }
};

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
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<LocalResume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<LocalResume[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedResume, setSelectedResume] = useState<LocalResume | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingResume, setEditingResume] = useState<LocalResume | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [stats, setStats] = useState({ total: 0, ready: 0, processing: 0, errors: 0, hasPrimary: false });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<LocalResume | null>(null);

  // Load resumes
  const loadResumes = useCallback(() => {
    const allResumes = localResumeService.getResumes();
    const resumeStats = localResumeService.getResumeStats();
    setResumes(allResumes);
    setStats(resumeStats);
  }, []);

  // Filter resumes based on search with debounce
  useEffect(() => {
    setSearching(true);
    const timeoutId = setTimeout(() => {
      let filtered = resumes;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = resumes.filter(resume =>
          resume.name.toLowerCase().includes(term) ||
          resume.fileName.toLowerCase().includes(term) ||
          resume.tags?.some(tag => tag.toLowerCase().includes(term)) ||
          resume.extractedData?.skills?.some(skill => skill.toLowerCase().includes(term))
        );
      }

      setFilteredResumes(filtered);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [resumes, searchTerm]);

  // Load data on mount
  useEffect(() => {
    loadResumes();

    // Listen for resume processing completion
    const handleResumeProcessed = () => {
      loadResumes();
    };

    window.addEventListener('resumeProcessed', handleResumeProcessed);
    return () => window.removeEventListener('resumeProcessed', handleResumeProcessed);
  }, [loadResumes]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const result = await localResumeService.addResume(file);

      if (result.success) {
        loadResumes();
        setShowUploadDialog(false);
      } else {
        alert(result.error || 'Failed to upload resume');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Handle resume deletion
  const handleDeleteResume = (resume: LocalResume) => {
    setResumeToDelete(resume);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteResume = async () => {
    if (!resumeToDelete) return;
    
    const wasDeleted = await localResumeService.deleteResume(resumeToDelete.id);
    
    if (wasDeleted) {
      toast.success("Resume deleted successfully", {
        description: `"${resumeToDelete.name}" has been removed`,
      });
      
      loadResumes();
      
      if (selectedResume?.id === resumeToDelete.id) {
        setSelectedResume(null);
      }
      
      // If deleted resume was primary, auto-set another resume as primary
      if (resumeToDelete.isPrimary) {
        const remainingResumes = localResumeService.getResumes();
        if (remainingResumes.length > 0) {
          const firstReadyResume = remainingResumes.find(r => r.status === 'ready');
          if (firstReadyResume) {
            localResumeService.setPrimaryResume(firstReadyResume.id);
            toast.info("Primary resume updated", {
              description: `"${firstReadyResume.name}" is now your primary resume`,
            });
            loadResumes();
          }
        }
      }
    }
    
    setResumeToDelete(null);
  };

  // Handle setting primary resume
  const handleSetPrimary = (resumeId: string) => {
    const resume = resumes.find(r => r.id === resumeId);
    if (localResumeService.setPrimaryResume(resumeId)) {
      toast.success("Primary resume updated", {
        description: `"${resume?.name}" is now your primary resume`,
      });
      loadResumes();
    }
  };

  // Handle resume editing
  const handleUpdateResume = () => {
    if (!editingResume) return;

    const updates: Partial<LocalResume> = {};
    if (editName.trim() && editName !== editingResume.name) {
      updates.name = editName.trim();
    }
    if (editNotes !== (editingResume.notes || '')) {
      updates.notes = editNotes;
    }

    if (Object.keys(updates).length > 0) {
      localResumeService.updateResume(editingResume.id, updates);
      loadResumes();
    }

    setEditingResume(null);
    setEditName('');
    setEditNotes('');
  };

  // Get status icon and color
  const getStatusDisplay = (status: LocalResume['status']) => {
    switch (status) {
      case 'ready':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-purple-600', text: 'Ready' };
      case 'processing':
        return { icon: <Clock className="w-4 h-4" />, color: 'text-purple-600', text: 'Processing' };
      case 'error':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-purple-600', text: 'Error' };
      default:
        return { icon: <Clock className="w-4 h-4" />, color: 'text-purple-600', text: 'Unknown' };
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
                  My Resumes
                </h1>
                <p className="text-muted-foreground">
                  Manage your resumes and get AI-powered insights
                </p>
              </div>

              <Button
                onClick={() => setShowUploadDialog(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Add Resume
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Resumes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.ready}</div>
                  <div className="text-sm text-gray-600">Ready</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
                  <div className="text-sm text-gray-600">Processing</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.hasPrimary ? '1' : '0'}
                  </div>
                  <div className="text-sm text-gray-600">Primary</div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 border-purple-200/50 dark:border-purple-700/50 shadow-lg">
              <div className="flex flex-col md:flex-row gap-4 p-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400 h-5 w-5" />
                  <Input
                    placeholder="Search resumes, skills, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-700 hover:border-purple-400 focus:border-purple-500 dark:hover:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 shadow-sm focus:shadow-md placeholder:text-purple-400 dark:placeholder:text-purple-500 h-12 text-base"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Resumes List */}
          <motion.div variants={itemVariants}>
            {searching ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-8 w-8 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredResumes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {resumes.length === 0 ? 'No resumes yet' : 'No matching resumes'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {resumes.length === 0
                      ? 'Upload your first resume to get started with AI-powered insights'
                      : 'Try adjusting your search terms'
                    }
                  </p>
                  {resumes.length === 0 && (
                    <Button onClick={() => setShowUploadDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Resume
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredResumes.map((resume, index) => {
                    const statusDisplay = getStatusDisplay(resume.status);

                    return (
                      <motion.div
                        key={resume.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 sm:p-6">
                            {/* Header Row - Icon, Title, Status, and Actions */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedResume(resume)}>
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg sm:text-xl font-semibold text-foreground hover:text-purple-600 transition-colors flex items-center gap-2 break-words">
                                    <span className="break-all">{resume.name}</span>
                                    {resume.isPrimary && (
                                      <Star className="w-4 h-4 text-purple-600 fill-current flex-shrink-0" />
                                    )}
                                  </h3>
                                </div>
                              </div>

                              {/* Action Buttons - Horizontal on all screens */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!resume.isPrimary && resume.status === 'ready' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSetPrimary(resume.id)}
                                    className="h-8 w-8 p-0"
                                    title="Set as primary resume"
                                  >
                                    <StarOff className="w-4 h-4" />
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingResume(resume);
                                    setEditName(resume.name);
                                    setEditNotes(resume.notes || '');
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Edit resume details"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteResume(resume)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-8 w-8 p-0"
                                  title="Delete resume"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>

                                {resume.downloadUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = resume.downloadUrl!;
                                      a.download = resume.fileName;
                                      a.click();
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Download resume"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* File Info and Status */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground mb-3 cursor-pointer" onClick={() => setSelectedResume(resume)}>
                              <span className="truncate">{resume.fileName}</span>
                              <span className="whitespace-nowrap">{localResumeService.formatFileSize(resume.fileSize)}</span>
                              <div className={`flex items-center gap-1 ${statusDisplay.color} whitespace-nowrap font-medium`}>
                                {statusDisplay.icon}
                                {statusDisplay.text}
                              </div>
                              <span className="whitespace-nowrap ml-auto">{formatDate(resume.uploadedAt)}</span>
                            </div>

                            {/* Status indicator for ready resumes */}
                            {resume.status === 'ready' && (
                              <div className="mb-3 cursor-pointer" onClick={() => setSelectedResume(resume)}>
                                <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                  <span className="font-medium">Ready for AI analysis</span>
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {resume.notes && (
                              <div className="cursor-pointer" onClick={() => setSelectedResume(resume)}>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded break-words line-clamp-2">
                                  {resume.notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Upload Modal Overlay */}
          <AnimatePresence mode="wait">
            {showUploadDialog && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  onClick={() => !isUploading && setShowUploadDialog(false)}
                />
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
                <CardHeader>
                  <CardTitle>Upload Resume</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF or Word document to get AI-powered insights
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-input rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Choose a resume file
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload">
                      <Button
                        variant="outline"
                        disabled={isUploading}
                        className="cursor-pointer"
                        asChild
                      >
                        <span>
                          {isUploading ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Supported: PDF, DOC, DOCX (max 5MB)
                  </p>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowUploadDialog(false)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Enhanced Resume Details Modal with Genie Theme */}
          <AnimatePresence>
            {selectedResume && (
              <>
                {/* Backdrop with blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  onClick={() => setSelectedResume(null)}
                />

                {/* Modal Content */}
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="pointer-events-auto w-full max-w-4xl max-h-[85vh] overflow-hidden"
                  >
                    <Card className="shadow-2xl border-purple-200 dark:border-purple-800 bg-card">
                      <CardHeader className="border-b border-border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-3 text-2xl">
                              <motion.div
                                className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0"
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                              >
                                <FileText className="h-6 w-6 text-purple-600" />
                              </motion.div>
                              <span className="">
                                {selectedResume.name}
                              </span>
                              {selectedResume.isPrimary && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", delay: 0.3 }}
                                >
                                  <Star className="w-6 h-6 text-purple-600 fill-current drop-shadow-lg" />
                                </motion.div>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {selectedResume.fileName}
                              </span>
                              <span>•</span>
                              <span>{localResumeService.formatFileSize(selectedResume.fileSize)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(selectedResume.uploadedAt)}
                              </span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedResume(null)}
                            className="rounded-full h-8 w-8 p-0"
                          >
                            <span className="text-xl">×</span>
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6 max-h-[calc(85vh-180px)] overflow-y-auto">
                        {/* Auto-fill Profile Button */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                    <Target className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">Smart Profile Auto-Fill</h4>
                                    <p className="text-xs text-muted-foreground">
                                      Let the genie extract your skills and preferences from this resume
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => {
                                    // Auto-fill profile from resume
                                    if (selectedResume.extractedData) {
                                      const skills = selectedResume.extractedData.skills?.join(', ') || '';
                                      // Try to infer job title from experience or use resume name
                                      const jobTitle = selectedResume.extractedData.experience?.[0] || selectedResume.name || '';
                                      const location = selectedResume.extractedData.contactInfo?.location || '';

                                      userPreferencesService.savePreferences({
                                        skills,
                                        jobTitle,
                                        location,
                                        experienceLevel: 'mid', // Default, user can adjust
                                      });

                                      // Show success message
                                      toast.success('🧞‍♂️ Profile auto-filled!', {
                                        description: 'Your job preferences have been updated from your resume. Visit your profile to review and adjust.',
                                        duration: 5000,
                                      });

                                      setSelectedResume(null);
                                    }
                                  }}
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                  disabled={!selectedResume.extractedData?.skills}
                                >
                                  <Target className="w-4 h-4 mr-2" />
                                  Auto-Fill Profile
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Overview Stats */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-600 rounded-lg flex-shrink-0">
                                  <Target className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg mb-2">Get AI-Powered Resume Analysis</h4>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Upload your resume to the Genie for comprehensive analysis including ATS compatibility, 
                                    job match scoring, and personalized improvement recommendations.
                                  </p>
                                  <Button
                                    onClick={() => window.location.href = '/genie'}
                                    className="bg-purple-600 hover:bg-purple-700"
                                  >
                                    <Target className="w-4 h-4 mr-2" />
                                    Analyze with Genie
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Resume Info */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <Card className="border-purple-200 dark:border-purple-800">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                  <FileText className="w-5 h-5 text-purple-600" />
                                </div>
                                <span>Resume Details</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">File Name:</span>
                                <span className="font-medium">{selectedResume.fileName}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">File Size:</span>
                                <span className="font-medium">{localResumeService.formatFileSize(selectedResume.fileSize)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Uploaded:</span>
                                <span className="font-medium">{formatDate(selectedResume.uploadedAt)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant={selectedResume.status === 'ready' ? 'default' : 'secondary'}>
                                  {selectedResume.status === 'ready' ? 'Ready' : selectedResume.status}
                                </Badge>
                              </div>
                              {selectedResume.isPrimary && (
                                <div className="pt-2 border-t">
                                  <Badge className="bg-purple-600">
                                    <Star className="w-3 h-3 mr-1" />
                                    Primary Resume
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Actions */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                          className="flex justify-end gap-2 pt-4 border-t border-border"
                        >
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingResume(selectedResume);
                              setEditName(selectedResume.name);
                              setEditNotes(selectedResume.notes || '');
                              setSelectedResume(null);
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          {selectedResume.downloadUrl && (
                            <Button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = selectedResume.downloadUrl!;
                                a.download = selectedResume.fileName;
                                a.click();
                              }}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Edit Resume Modal */}
          <AnimatePresence mode="wait">
            {editingResume && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  onClick={() => setEditingResume(null)}
                />
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
                <CardHeader>
                  <CardTitle>Edit Resume</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Update resume name and add notes
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Resume Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter resume name"
                      className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add notes about this resume version..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingResume(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateResume} className="bg-purple-600 hover:bg-purple-700">
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <Footer />
      
      {/* Delete Resume Dialog */}
      <DeleteResumeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resumeName={resumeToDelete?.name || ''}
        onConfirm={confirmDeleteResume}
      />
    </div>
  );
}