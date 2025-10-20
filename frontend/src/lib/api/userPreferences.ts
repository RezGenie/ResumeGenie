import { JobDisplay } from './types';

export interface UserPreferences {
  jobTitle: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  salaryMin: string;
  salaryMax: string;
  workType: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  industries: string;
  skills: string;
  remotePreference: boolean;
  willingToRelocate: boolean;
  location: string;
}

class UserPreferencesService {
  private readonly STORAGE_KEY = 'user_preferences';

  // Save user preferences to localStorage
  savePreferences(preferences: Partial<UserPreferences>): void {
    try {
      const existing = this.getPreferences();
      const updated = { ...existing, ...preferences };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      console.log('Preferences saved:', updated);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  // Get user preferences from localStorage
  getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
    
    // Return default preferences
    return {
      jobTitle: '',
      experienceLevel: 'mid',
      salaryMin: '',
      salaryMax: '',
      workType: 'hybrid',
      industries: '',
      skills: '',
      remotePreference: true,
      willingToRelocate: false,
      location: '',
    };
  }

  // Check if user has completed their profile
  hasCompletedProfile(): boolean {
    const prefs = this.getPreferences();
    return !!(prefs.jobTitle && prefs.skills && (prefs.salaryMin || prefs.salaryMax));
  }

  // Calculate profile completion percentage
  getProfileCompleteness(): number {
    const prefs = this.getPreferences();
    const fields = [
      prefs.jobTitle,
      prefs.skills,
      prefs.salaryMin || prefs.salaryMax,
      prefs.industries,
      prefs.location,
    ];
    
    const completed = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  }

  // Filter jobs based on user preferences
  filterJobs(jobs: JobDisplay[]): JobDisplay[] {
    const prefs = this.getPreferences();
    
    if (!this.hasCompletedProfile()) {
      console.log('Profile not completed, showing all jobs');
      return jobs; // Show all jobs if profile is not completed
    }

    console.log('Applying smart filters with preferences:', prefs);

    return jobs.filter(job => {
      // Salary filtering
      if (prefs.salaryMin || prefs.salaryMax) {
        const jobSalary = this.extractSalaryFromJob(job);
        if (jobSalary) {
          if (prefs.salaryMin && jobSalary < parseInt(prefs.salaryMin)) {
            console.log(`Filtered out ${job.title} - salary too low (${jobSalary} < ${prefs.salaryMin})`);
            return false;
          }
          if (prefs.salaryMax && jobSalary > parseInt(prefs.salaryMax)) {
            console.log(`Filtered out ${job.title} - salary too high (${jobSalary} > ${prefs.salaryMax})`);
            return false;
          }
        }
      }

      // Work type filtering
      if (prefs.workType !== 'flexible') {
        const isRemoteJob = this.isRemoteJob(job);
        if (prefs.workType === 'remote' && !isRemoteJob) {
          console.log(`Filtered out ${job.title} - not remote`);
          return false;
        }
        if (prefs.workType === 'onsite' && isRemoteJob) {
          console.log(`Filtered out ${job.title} - is remote but user prefers onsite`);
          return false;
        }
      }

      // Skills matching (if job has required skills, check if user has them)
      if (prefs.skills && job.skills && job.skills.length > 0) {
        const userSkills = prefs.skills.toLowerCase().split(',').map(s => s.trim());
        const jobSkills = job.skills.map(s => s.toLowerCase());
        const hasMatchingSkills = jobSkills.some(jobSkill => 
          userSkills.some(userSkill => 
            jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
          )
        );
        
        if (!hasMatchingSkills) {
          console.log(`Filtered out ${job.title} - no matching skills`);
          return false;
        }
      }

      // Experience level filtering (basic logic)
      if (prefs.experienceLevel) {
        const jobTitle = job.title.toLowerCase();
        const jobSnippet = (job.snippet || '').toLowerCase();
        
        if (prefs.experienceLevel === 'entry') {
          // Entry level should not see senior/lead positions
          if (jobTitle.includes('senior') || jobTitle.includes('lead') || 
              jobTitle.includes('principal') || jobTitle.includes('director') ||
              jobSnippet.includes('5+ years') || jobSnippet.includes('7+ years')) {
            console.log(`Filtered out ${job.title} - too senior for entry level`);
            return false;
          }
        }
        
        if (prefs.experienceLevel === 'senior' || prefs.experienceLevel === 'lead') {
          // Senior level should not see junior positions
          if (jobTitle.includes('junior') || jobTitle.includes('entry') ||
              jobSnippet.includes('0-2 years') || jobSnippet.includes('no experience')) {
            console.log(`Filtered out ${job.title} - too junior for senior level`);
            return false;
          }
        }
      }

      return true; // Job passes all filters
    });
  }

  // Extract salary from job (basic implementation)
  private extractSalaryFromJob(job: JobDisplay): number | null {
    const salaryText = job.salaryText || job.snippet || '';
    
    // Look for salary patterns like "$60,000", "$60K", "60000"
    const salaryMatch = salaryText.match(/\$?(\d{2,3})[,.]?(\d{3})(?:[,.](\d{3}))?[k]?/i);
    if (salaryMatch) {
      let salary = parseInt(salaryMatch[1] + (salaryMatch[2] || ''));
      if (salaryText.toLowerCase().includes('k') && salary < 1000) {
        salary *= 1000; // Convert 60K to 60000
      }
      return salary;
    }
    
    return null;
  }

  // Check if job is remote
  private isRemoteJob(job: JobDisplay): boolean {
    const location = job.location?.toLowerCase() || '';
    const title = job.title?.toLowerCase() || '';
    const snippet = job.snippet?.toLowerCase() || '';
    
    const remoteKeywords = ['remote', 'work from home', 'wfh', 'telecommute', 'distributed'];
    return remoteKeywords.some(keyword => 
      location.includes(keyword) || title.includes(keyword) || snippet.includes(keyword)
    );
  }

  // Prioritize jobs based on preferences (for sorting)
  scoreJob(job: JobDisplay): number {
    const prefs = this.getPreferences();
    let score = 0;

    // Skills matching score
    if (prefs.skills && job.skills) {
      const userSkills = prefs.skills.toLowerCase().split(',').map(s => s.trim());
      const jobSkills = job.skills.map(s => s.toLowerCase());
      const matchingSkills = jobSkills.filter(jobSkill => 
        userSkills.some(userSkill => 
          jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
        )
      );
      score += (matchingSkills.length / Math.max(jobSkills.length, 1)) * 30;
    }

    // Job title matching
    if (prefs.jobTitle) {
      const prefTitleWords = prefs.jobTitle.toLowerCase().split(' ');
      const jobTitleWords = job.title.toLowerCase().split(' ');
      const matchingWords = prefTitleWords.filter(word => 
        jobTitleWords.some(jobWord => jobWord.includes(word) || word.includes(jobWord))
      );
      score += (matchingWords.length / Math.max(prefTitleWords.length, 1)) * 25;
    }

    // Work type preference
    if (prefs.workType === 'remote' && this.isRemoteJob(job)) {
      score += 20;
    }

    // Salary range preference
    const jobSalary = this.extractSalaryFromJob(job);
    if (jobSalary && prefs.salaryMin && prefs.salaryMax) {
      const minSalary = parseInt(prefs.salaryMin);
      const maxSalary = parseInt(prefs.salaryMax);
      const midPoint = (minSalary + maxSalary) / 2;
      
      if (jobSalary >= minSalary && jobSalary <= maxSalary) {
        // Job is within range, score based on how close to midpoint
        const distance = Math.abs(jobSalary - midPoint) / (maxSalary - minSalary);
        score += (1 - distance) * 15; // Closer to midpoint = higher score
      }
    }

    return Math.min(score, 100); // Cap at 100
  }
}

export const userPreferencesService = new UserPreferencesService();