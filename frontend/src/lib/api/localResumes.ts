// Local Resume Management Service (for dashboard display)
// This complements the existing backend resume service

export interface LocalResume {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  lastModified: string;
  status: 'processing' | 'ready' | 'error';
  isPrimary?: boolean;
  tags?: string[];
  notes?: string;
  extractedData?: {
    skills: string[];
    experience: string[];
    education: string[];
    contactInfo: {
      email?: string;
      phone?: string;
      location?: string;
    };
    summary?: string;
  };
  analysisData?: {
    overallScore: number;
    strengthAreas: string[];
    improvementSuggestions: string[];
    skillsGap: string[];
    marketAlignment: number;
  };
  downloadUrl?: string;
  previewUrl?: string;
}

export interface ResumeUploadResult {
  success: boolean;
  resumeId?: string;
  message?: string;
  error?: string;
}

class LocalResumeService {
  private readonly STORAGE_KEY = 'dashboardResumes';

  // Get all resumes from localStorage
  getResumes(): LocalResume[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving resumes:', error);
      return [];
    }
  }

  // Save resumes to localStorage
  private saveResumes(resumes: LocalResume[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(resumes));
    } catch (error) {
      console.error('Error saving resumes:', error);
    }
  }

  // Add a resume (simulated upload for demo)
  async addResume(file: File, name?: string): Promise<ResumeUploadResult> {
    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Invalid file type. Please upload a PDF or Word document.'
        };
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size too large. Please upload a file smaller than 5MB.'
        };
      }

      // Create resume object
      const resumeId = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newResume: LocalResume = {
        id: resumeId,
        name: name || file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'processing',
        tags: ['default']
      };

      // Save to localStorage
      const existingResumes = this.getResumes();
      existingResumes.push(newResume);
      this.saveResumes(existingResumes);

      // Simulate processing
      setTimeout(() => {
        this.simulateResumeProcessing(resumeId, file);
      }, 2000);

      return {
        success: true,
        resumeId: resumeId,
        message: 'Resume uploaded successfully and is being processed.'
      };

    } catch (error) {
      console.error('Error adding resume:', error);
      return {
        success: false,
        error: 'Failed to upload resume. Please try again.'
      };
    }
  }

  // Simulate resume processing
  private simulateResumeProcessing(resumeId: string, file: File): void {
    const resumes = this.getResumes();
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);
    
    if (resumeIndex === -1) return;

    // Mock extracted data
    const mockExtractedData = {
      skills: [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
        'AWS', 'MongoDB', 'PostgreSQL', 'Docker', 'Kubernetes'
      ],
      experience: [
        'Senior Software Developer at Tech Corp (2020-2023)',
        'Full Stack Developer at StartupXYZ (2018-2020)',
        'Junior Developer at WebSolutions (2016-2018)'
      ],
      education: [
        'Bachelor of Science in Computer Science - University of Technology (2012-2016)',
        'AWS Solutions Architect Certification (2021)'
      ],
      contactInfo: {
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA'
      },
      summary: 'Experienced full-stack developer with 7+ years in building scalable web applications.'
    };

    const mockAnalysisData = {
      overallScore: 85,
      strengthAreas: [
        'Strong technical skills in modern web technologies',
        'Good progression of roles and responsibilities',
        'Relevant certifications and continuous learning'
      ],
      improvementSuggestions: [
        'Add more quantifiable achievements and metrics',
        'Include leadership and project management experience',
        'Expand on specific technologies used'
      ],
      skillsGap: ['Machine Learning', 'DevOps', 'Mobile Development'],
      marketAlignment: 92
    };

    // Update resume
    resumes[resumeIndex] = {
      ...resumes[resumeIndex],
      status: 'ready',
      lastModified: new Date().toISOString(),
      extractedData: mockExtractedData,
      analysisData: mockAnalysisData,
      downloadUrl: URL.createObjectURL(file),
      previewUrl: URL.createObjectURL(file)
    };

    // Set as primary if it's the first resume
    if (resumes.filter(r => r.status === 'ready').length === 1) {
      resumes[resumeIndex].isPrimary = true;
    }

    this.saveResumes(resumes);

    // Notify components
    window.dispatchEvent(new CustomEvent('resumeProcessed', { 
      detail: { resumeId, status: 'ready' } 
    }));
  }

  // Delete resume
  deleteResume(resumeId: string): boolean {
    try {
      const resumes = this.getResumes();
      const filteredResumes = resumes.filter(r => r.id !== resumeId);
      
      if (filteredResumes.length !== resumes.length) {
        this.saveResumes(filteredResumes);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting resume:', error);
      return false;
    }
  }

  // Update resume
  updateResume(resumeId: string, updates: Partial<LocalResume>): boolean {
    try {
      const resumes = this.getResumes();
      const resumeIndex = resumes.findIndex(r => r.id === resumeId);
      
      if (resumeIndex !== -1) {
        resumes[resumeIndex] = {
          ...resumes[resumeIndex],
          ...updates,
          lastModified: new Date().toISOString()
        };
        this.saveResumes(resumes);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating resume:', error);
      return false;
    }
  }

  // Set primary resume
  setPrimaryResume(resumeId: string): boolean {
    try {
      const resumes = this.getResumes();
      
      // Remove primary flag from all
      resumes.forEach(r => r.isPrimary = false);
      
      // Set primary on target
      const targetResume = resumes.find(r => r.id === resumeId);
      if (targetResume) {
        targetResume.isPrimary = true;
        this.saveResumes(resumes);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting primary resume:', error);
      return false;
    }
  }

  // Get primary resume
  getPrimaryResume(): LocalResume | null {
    const resumes = this.getResumes();
    return resumes.find(r => r.isPrimary) || resumes.find(r => r.status === 'ready') || null;
  }

  // Get resume by ID
  getResumeById(resumeId: string): LocalResume | null {
    const resumes = this.getResumes();
    return resumes.find(r => r.id === resumeId) || null;
  }

  // Get statistics
  getResumeStats() {
    const resumes = this.getResumes();
    return {
      total: resumes.length,
      ready: resumes.filter(r => r.status === 'ready').length,
      processing: resumes.filter(r => r.status === 'processing').length,
      errors: resumes.filter(r => r.status === 'error').length,
      hasPrimary: resumes.some(r => r.isPrimary)
    };
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeIcon(fileType: string): string {
    switch (fileType) {
      case 'application/pdf':
        return '📄';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝';
      default:
        return '📄';
    }
  }

  // Export data
  exportResumeData(): string {
    return JSON.stringify(this.getResumes(), null, 2);
  }

  // Clear all (for development)
  clearAllResumes(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const localResumeService = new LocalResumeService();