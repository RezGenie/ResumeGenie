'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  User,
  Briefcase,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  MapPin,
  DollarSign,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { resumeService } from '@/lib/api/resumes';
import { userPreferencesService } from '@/lib/api/userPreferences';
import { userProfileService } from '@/lib/api/userProfile';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Upload Resume',
    description: 'Let the genie analyze your experience',
    icon: <Upload className="w-6 h-6" />
  },
  {
    id: 2,
    title: 'Review Profile',
    description: 'Verify extracted information',
    icon: <User className="w-6 h-6" />
  },
  {
    id: 3,
    title: 'Job Preferences',
    description: 'Tell us what you\'re looking for',
    icon: <Briefcase className="w-6 h-6" />
  },
  {
    id: 4,
    title: 'All Set!',
    description: 'Start finding your dream job',
    icon: <CheckCircle className="w-6 h-6" />
  }
];

interface ProfileOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function ProfileOnboarding({ onComplete, onSkip }: ProfileOnboardingProps) {
  const { user } = useAuth();

  // Check if user already has a resume - if so, skip to step 2
  const { localResumeService } = require('@/lib/api/localResumes');
  const existingResumes = localResumeService.getResumes();
  const hasResume = existingResumes.length > 0;

  const [currentStep, setCurrentStep] = useState(hasResume ? 2 : 1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<any>(hasResume ? existingResumes[0] : null);

  // Load existing preferences
  const existingPrefs = userPreferencesService.getPreferences();

  // Form data - pre-populate with existing preferences
  const [formData, setFormData] = useState({
    // Profile info
    name: user?.email?.split('@')[0] || '',
    location: existingPrefs.location || '',
    phone: '',
    bio: '',

    // Job preferences - load from existing
    jobTitle: existingPrefs.jobTitle || '',
    experienceLevel: existingPrefs.experienceLevel || 'mid',
    salaryMin: existingPrefs.salaryMin || '',
    salaryMax: existingPrefs.salaryMax || '',
    workType: existingPrefs.workType || 'flexible',
    industries: existingPrefs.industries || '',
    skills: existingPrefs.skills || '',
    remotePreference: existingPrefs.remotePreference ?? true,
    willingToRelocate: existingPrefs.willingToRelocate ?? false,
  });

  const progress = (currentStep / steps.length) * 100;

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      await resumeService.uploadResume(file, {
        isGuest: !user,
        onProgress: (progress) => {
          console.log('Upload progress:', progress);
        },
        onComplete: async (response) => {
          setUploadedResume(response);

          // Save to local storage for dashboard display
          try {
            await localResumeService.addResume(file, response.original_filename);
            console.log('Resume saved to local storage');
          } catch (localError) {
            console.error('Failed to save to local storage:', localError);
            // Don't block the flow if local storage fails
          }

          // Auto-fill from resume if data is available
          // Note: This would need backend support for extraction
          toast.success('Resume uploaded successfully!', {
            description: 'The genie is analyzing your experience...'
          });

          // Move to next step
          setTimeout(() => {
            setCurrentStep(2);
          }, 1000);
        },
        onError: (error) => {
          console.error('Upload failed:', error);
          toast.error('Upload failed', {
            description: error.message || 'Please check your connection and try again.'
          });
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please check your connection and try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && (files[0].type === 'application/pdf' || files[0].name.endsWith('.docx'))) {
      handleFileUpload(files[0]);
    } else {
      toast.error('Please upload a PDF or DOCX file');
    }
  }, []);

  const handleNext = () => {
    // Validation for step 3
    if (currentStep === 3) {
      if (!formData.jobTitle.trim()) {
        toast.error('Please enter your desired job title');
        return;
      }
      if (!formData.skills.trim()) {
        toast.error('Please enter at least one skill');
        return;
      }

      // Save preferences before moving to step 4
      handleSavePreferences();
      setCurrentStep(4);
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - just close
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSavePreferences = () => {
    // Save personal information
    userProfileService.saveProfile({
      name: formData.name,
      phone: formData.phone,
      location: formData.location,
      bio: formData.bio,
    });

    // Save job preferences
    userPreferencesService.savePreferences({
      jobTitle: formData.jobTitle,
      experienceLevel: formData.experienceLevel,
      salaryMin: formData.salaryMin,
      salaryMax: formData.salaryMax,
      workType: formData.workType,
      industries: formData.industries,
      skills: formData.skills,
      remotePreference: formData.remotePreference,
      willingToRelocate: formData.willingToRelocate,
      location: formData.location,
    });

    console.log('Profile and preferences saved:', formData);

    toast.success('Profile saved!', {
      description: 'Your profile and preferences have been updated successfully'
    });
  };

  return (
    <motion.div
      key="onboarding-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onSkip}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", damping: 30, stiffness: 400, duration: 0.3 }}
          className="pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="shadow-2xl bg-card border-purple-200 dark:border-purple-800 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-purple-200 dark:border-purple-800 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Complete Your Profile
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Let the genie help you find the perfect opportunities
                    </p>
                  </div>
                </div>
                {onSkip && (
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                    className="hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-full h-8 w-8 p-0"
                  >
                    <span className="text-xl">×</span>
                  </Button>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Step {currentStep} of {steps.length}</span>
                  <span className="font-medium text-purple-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Step indicators */}
              <div className="flex justify-between mt-6">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center gap-2 flex-1 ${index < steps.length - 1 ? 'relative' : ''
                      }`}
                  >
                    <motion.div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep > step.id
                        ? 'bg-purple-600 text-white shadow-lg'
                        : currentStep === step.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}
                      animate={currentStep === step.id ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.icon
                      )}
                    </motion.div>
                    <span className={`text-xs text-center hidden sm:block ${currentStep >= step.id ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-0.5 -z-10 transition-colors ${currentStep > step.id
                          ? 'bg-purple-600'
                          : 'bg-purple-100 dark:bg-purple-900/30'
                          }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-8 flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                {/* Step 1: Upload Resume */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold">Upload Your Resume</h3>
                      <p className="text-muted-foreground">
                        The genie will extract your skills and experience to personalize your job matches
                      </p>
                    </div>

                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer bg-purple-50/50 dark:bg-purple-900/10"
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                        id="resume-upload"
                        disabled={isUploading}
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                            {isUploading ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <Sparkles className="w-8 h-8 text-purple-600" />
                              </motion.div>
                            ) : (
                              <FileText className="w-8 h-8 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-medium">
                              {isUploading ? 'Uploading...' : 'Drop your resume here or click to browse'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Supports PDF and DOCX files (max 10MB)
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>

                    {uploadedResume && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                      >
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900 dark:text-green-100">
                            {uploadedResume.original_filename}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Successfully uploaded
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Review Profile */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold">Review Your Information</h3>
                      <p className="text-muted-foreground">
                        Verify and update your profile details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="San Francisco, CA"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio">Professional Summary</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="A brief summary of your professional background and career goals..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Job Preferences */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold">Set Your Job Preferences</h3>
                      <p className="text-muted-foreground">
                        Help us find the perfect opportunities for you
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Desired Job Title</Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="jobTitle"
                            value={formData.jobTitle}
                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                            placeholder="e.g., Full Stack Developer"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experienceLevel">Experience Level</Label>
                        <Select
                          value={formData.experienceLevel}
                          onValueChange={(value: any) => setFormData({ ...formData, experienceLevel: value })}
                        >
                          <SelectTrigger className="bg-white dark:bg-input text-foreground">
                            <SelectValue placeholder="Select experience level">
                              {formData.experienceLevel === 'entry' && 'Entry Level (0-2 years)'}
                              {formData.experienceLevel === 'mid' && 'Mid Level (2-5 years)'}
                              {formData.experienceLevel === 'senior' && 'Senior Level (5-10 years)'}
                              {formData.experienceLevel === 'lead' && 'Lead/Principal (10+ years)'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                            <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                            <SelectItem value="senior">Senior Level (5-10 years)</SelectItem>
                            <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salaryMin">Minimum Salary (USD)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="salaryMin"
                            type="number"
                            value={formData.salaryMin}
                            onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                            placeholder="50000"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salaryMax">Maximum Salary (USD)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="salaryMax"
                            type="number"
                            value={formData.salaryMax}
                            onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                            placeholder="120000"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="workType">Work Type Preference</Label>
                        <Select
                          value={formData.workType}
                          onValueChange={(value: any) => setFormData({ ...formData, workType: value })}
                        >
                          <SelectTrigger className="bg-white dark:bg-input text-foreground">
                            <SelectValue placeholder="Select work type preference">
                              {formData.workType === 'remote' && 'Remote Only'}
                              {formData.workType === 'hybrid' && 'Hybrid (Remote + Office)'}
                              {formData.workType === 'onsite' && 'On-site Only'}
                              {formData.workType === 'flexible' && 'Flexible'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remote">Remote Only</SelectItem>
                            <SelectItem value="hybrid">Hybrid (Remote + Office)</SelectItem>
                            <SelectItem value="onsite">On-site Only</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industries">Preferred Industries</Label>
                        <Input
                          id="industries"
                          value={formData.industries}
                          onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                          placeholder="e.g., Technology, Finance"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="skills">Key Skills</Label>
                        <div className="relative">
                          <Award className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Textarea
                            id="skills"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            placeholder="e.g., Python, React, Node.js, AWS"
                            rows={2}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Separate skills with commas
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Complete */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center space-y-6 py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg"
                    >
                      <CheckCircle className="w-12 h-12 text-white" />
                    </motion.div>

                    <div className="space-y-2">
                      <h3 className="text-3xl font-bold">You're All Set!</h3>
                      <p className="text-muted-foreground text-lg">
                        Your profile is complete and the genie is ready to find your perfect opportunities
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <Card className="border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Target className="w-6 h-6 text-purple-600" />
                          </div>
                          <p className="font-medium">Smart Matching</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            AI-powered job recommendations
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                          </div>
                          <p className="font-medium">Genie Insights</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Personalized career guidance
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Briefcase className="w-6 h-6 text-purple-600" />
                          </div>
                          <p className="font-medium">Job Tracking</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Organize your applications
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            {/* Footer */}
            <div className="p-6 border-t border-purple-200 dark:border-purple-800 flex-shrink-0">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isUploading}
                  className="gap-2 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={isUploading || (currentStep === 1 && !uploadedResume)}
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {currentStep === steps.length ? 'Start Exploring' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
