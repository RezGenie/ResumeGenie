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
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { localResumeService, LocalResume } from '@/lib/api/localResumes';

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
  const [selectedResume, setSelectedResume] = useState<LocalResume | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingResume, setEditingResume] = useState<LocalResume | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [stats, setStats] = useState({ total: 0, ready: 0, processing: 0, errors: 0, hasPrimary: false });

  // Load resumes
  const loadResumes = useCallback(() => {
    const allResumes = localResumeService.getResumes();
    const resumeStats = localResumeService.getResumeStats();
    setResumes(allResumes);
    setStats(resumeStats);
  }, []);

  // Filter resumes based on search
  useEffect(() => {
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
  const handleDeleteResume = (resumeId: string) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      if (localResumeService.deleteResume(resumeId)) {
        loadResumes();
        if (selectedResume?.id === resumeId) {
          setSelectedResume(null);
        }
      }
    }
  };

  // Handle setting primary resume
  const handleSetPrimary = (resumeId: string) => {
    if (localResumeService.setPrimaryResume(resumeId)) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                My Resumes
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
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

          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resumes, skills, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </motion.div>

        {/* Resumes List */}
        <motion.div variants={itemVariants}>
          {filteredResumes.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {resumes.length === 0 ? 'No resumes yet' : 'No matching resumes'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {resumes.length === 0 
                    ? 'Upload your first resume to get started with AI-powered insights'
                    : 'Try adjusting your search terms'
                  }
                </p>
                {resumes.length === 0 && (
                  <Button onClick={() => setShowUploadDialog(true)}>
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
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 cursor-pointer" onClick={() => setSelectedResume(resume)}>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="text-2xl">
                                  {localResumeService.getFileTypeIcon(resume.fileType)}
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    {resume.name}
                                    {resume.isPrimary && (
                                      <Star className="w-4 h-4 text-purple-600 fill-current" />
                                    )}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>{resume.fileName}</span>
                                    <span>{localResumeService.formatFileSize(resume.fileSize)}</span>
                                    <div className={`flex items-center gap-1 ${statusDisplay.color}`}>
                                      {statusDisplay.icon}
                                      {statusDisplay.text}
                                    </div>
                                    <span>{new Date(resume.uploadedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              {resume.extractedData && (
                                <div className="mt-3">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {resume.extractedData.skills?.slice(0, 6).map((skill, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {resume.extractedData.skills && resume.extractedData.skills.length > 6 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{resume.extractedData.skills.length - 6} more
                                      </Badge>
                                    )}
                                  </div>

                                  {resume.analysisData && (
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-500" />
                                        <span>Score: {resume.analysisData.overallScore}/100</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        <span>Market Fit: {resume.analysisData.marketAlignment}%</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {resume.notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded mt-3">
                                  {resume.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              {!resume.isPrimary && resume.status === 'ready' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetPrimary(resume.id)}
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
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteResume(resume.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
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
        {showUploadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Upload Resume</CardTitle>
                <p className="text-sm text-gray-600">
                  Upload a PDF or Word document to get AI-powered insights
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
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
                
                <p className="text-xs text-gray-500 text-center">
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
          </div>
        )}

        {/* Simple Resume Details View */}
        {selectedResume && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">
                        {localResumeService.getFileTypeIcon(selectedResume.fileType)}
                      </span>
                      {selectedResume.name}
                      {selectedResume.isPrimary && (
                        <Star className="w-5 h-5 text-purple-600 fill-current" />
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {selectedResume.fileName} • {localResumeService.formatFileSize(selectedResume.fileSize)} • 
                      Uploaded {new Date(selectedResume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedResume(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold">ATS Compatibility</h4>
                      </div>
                      {selectedResume.analysisData ? (
                        <div>
                          <div className="text-3xl font-bold text-purple-600">
                            {selectedResume.analysisData.overallScore}
                          </div>
                          <div className="text-sm text-gray-600">out of 100</div>
                          <Progress 
                            value={selectedResume.analysisData.overallScore} 
                            className="mt-2" 
                          />
                        </div>
                      ) : (
                        <div className="text-gray-500">Processing...</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold">Market Alignment</h4>
                      </div>
                      {selectedResume.analysisData ? (
                        <div>
                          <div className="text-3xl font-bold text-purple-600">
                            {selectedResume.analysisData.marketAlignment}%
                          </div>
                          <div className="text-sm text-gray-600">market fit</div>
                          <Progress 
                            value={selectedResume.analysisData.marketAlignment} 
                            className="mt-2" 
                          />
                        </div>
                      ) : (
                        <div className="text-gray-500">Processing...</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Skills */}
                {selectedResume.extractedData?.skills && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedResume.extractedData.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                {selectedResume.extractedData?.summary && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Professional Summary</h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {selectedResume.extractedData.summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
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
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Resume Modal */}
        {editingResume && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Edit Resume</CardTitle>
                <p className="text-sm text-gray-600">
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
                  <Button onClick={handleUpdateResume}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}