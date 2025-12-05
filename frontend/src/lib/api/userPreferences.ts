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
  private readonly STORAGE_KEY_PREFIX = 'user_preferences_';

  // Get user-specific storage key
  private getUserStorageKey(): string {
    // Get current user ID from auth token or localStorage
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        // Decode JWT to get user ID (simple base64 decode of payload)
        const payload = authToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const userId = decoded.sub || decoded.user_id || decoded.id;
        return `${this.STORAGE_KEY_PREFIX}${userId}`;
      } catch (error) {
        console.warn('Failed to decode auth token:', error);
      }
    }

    // Fallback to guest session
    return `${this.STORAGE_KEY_PREFIX}guest`;
  }

  // Save user preferences to localStorage (user-scoped) and sync to backend
  async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey();
      const existing = this.getPreferences();
      const updated = { ...existing, ...preferences };
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Sync to backend for authenticated users - wait for completion
      await this.syncPreferencesToBackend(updated);

      // Dispatch custom event to notify components about preference changes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userPreferencesUpdated', {
          detail: updated
        }));
      }
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error; // Propagate error to caller
    }
  }

  // Sync preferences to backend (async)
  private async syncPreferencesToBackend(preferences: UserPreferences): Promise<void> {
    try {
      // Only sync for authenticated users
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) return;

      const { apiClient } = await import('./client');

      // Map frontend field names to backend field names
      const backendPayload: any = {
        remote_ok: preferences.remotePreference,
        location_pref: preferences.location || null,
      };

      // Add skills array (backend expects "skills" not "skills_sought")
      if (preferences.skills) {
        backendPayload.skills = preferences.skills.split(',').map(s => s.trim()).filter(s => s);
      }

      // Add target_titles array (backend expects "target_titles" not "job_title")
      if (preferences.jobTitle) {
        backendPayload.target_titles = [preferences.jobTitle.trim()];
      }

      // Add industries array
      if (preferences.industries) {
        backendPayload.industries = preferences.industries.split(',').map(s => s.trim()).filter(s => s);
      }

      // Add salary_min (backend uses this field)
      if (preferences.salaryMin) {
        backendPayload.salary_min = parseInt(preferences.salaryMin);
      }

      console.log('Syncing preferences to backend:', backendPayload);

      await apiClient.put('/jobs/me/preferences', backendPayload);
      console.log('✅ Preferences synced successfully to backend');
    } catch (error) {
      console.error('❌ Failed to sync preferences to backend:', error);
      throw error;
    }
  }

  // Load preferences from backend (async)
  async loadPreferencesFromBackend(): Promise<UserPreferences | null> {
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) return null;

      const { apiClient } = await import('./client');

      const backendPrefs = await apiClient.get<any>('/jobs/me/preferences');

      console.log('📥 Loading preferences from backend:', backendPrefs);

      // Convert backend format to frontend format
      // Backend returns: skills (array), target_titles (array), industries (array), location_pref, remote_ok, salary_min
      const preferences: UserPreferences = {
        jobTitle: Array.isArray(backendPrefs.target_titles) && backendPrefs.target_titles.length > 0
          ? backendPrefs.target_titles[0]
          : '',
        experienceLevel: 'entry', // Not stored in backend, use entry as default
        salaryMin: backendPrefs.salary_min ? backendPrefs.salary_min.toString() : '',
        salaryMax: '', // Not stored in backend yet
        workType: 'flexible', // Not stored in backend yet
        industries: Array.isArray(backendPrefs.industries)
          ? backendPrefs.industries.join(', ')
          : '',
        skills: Array.isArray(backendPrefs.skills)
          ? backendPrefs.skills.join(', ')
          : '',
        remotePreference: backendPrefs.remote_ok ?? true,
        willingToRelocate: false, // Not stored in backend yet
        location: backendPrefs.location_pref || '',
      };

      console.log('✅ Converted preferences:', preferences);

      // Only save to localStorage if we have actual data from backend
      if (backendPrefs && Object.keys(backendPrefs).length > 0) {
        const storageKey = this.getUserStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(preferences));
      }

      return preferences;
    } catch (error) {
      console.error('❌ Failed to load preferences from backend:', error);
      return null;
    }
  }

  // Get user preferences from localStorage (user-scoped)
  getPreferences(): UserPreferences {
    try {
      const storageKey = this.getUserStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }

    // Return empty preferences - no defaults
    return {
      jobTitle: '',
      experienceLevel: 'entry',
      salaryMin: '',
      salaryMax: '',
      workType: 'flexible',
      industries: '',
      skills: '',
      remotePreference: true,
      willingToRelocate: false,
      location: '',
    };
  }

  // Check if user has completed their profile (lenient check)
  hasCompletedProfile(): boolean {
    const prefs = this.getPreferences();
    // Only require at least ONE preference field to be filled
    return !!(prefs.jobTitle || prefs.skills || prefs.salaryMin || prefs.salaryMax || prefs.workType !== 'hybrid');
  }

  // Calculate profile completion percentage
  getProfileCompleteness(): number {
    const prefs = this.getPreferences();

    // Check if user has at least one resume
    let hasResume = false;
    try {
      const { localResumeService } = require('@/lib/api/localResumes');
      const resumes = localResumeService.getResumes();
      hasResume = resumes.length > 0;
    } catch (error) {
      console.warn('Could not check resume status:', error);
    }

    // Core fields required for profile completion
    // Industries is optional since it can't be auto-extracted from resumes
    const fields = [
      prefs.jobTitle,
      prefs.skills,
      prefs.location,
      hasResume, // Resume is required
    ];

    const completed = fields.filter(field => field && (typeof field === 'boolean' ? field : field.trim() !== '')).length;
    return Math.round((completed / fields.length) * 100);
  }

  // Filter jobs based on user preferences - Remove completely irrelevant jobs
  filterJobs(jobs: JobDisplay[]): JobDisplay[] {
    const prefs = this.getPreferences();

    if (!this.hasCompletedProfile()) {
      return jobs; // Show all jobs if profile is not completed
    }

    return jobs.filter(job => {
      const jobTitle = job.title.toLowerCase();
      const jobSnippet = (job.snippet || '').toLowerCase();
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());

      // RELEVANCE CHECK: Filter out jobs with zero relevance to user's role
      if (prefs.jobTitle && prefs.skills) {
        const prefTitleWords = prefs.jobTitle.toLowerCase().split(' ').filter(w => w.length > 2);
        const userSkills = prefs.skills.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

        // Check if job title has ANY matching words
        const titleMatches = prefTitleWords.some(word =>
          jobTitle.includes(word) || jobSnippet.includes(word)
        );

        // Check if job has ANY matching skills
        const skillMatches = userSkills.some(userSkill =>
          jobSkills.some(jobSkill => jobSkill.includes(userSkill) || userSkill.includes(jobSkill)) ||
          jobSnippet.includes(userSkill)
        );

        // Filter out if NEITHER title NOR skills match
        if (!titleMatches && !skillMatches) {
          return false;
        }
      }

      // SALARY FILTERING: Only filter extreme outliers
      if (prefs.salaryMin || prefs.salaryMax) {
        const jobSalary = this.extractSalaryFromJob(job);
        if (jobSalary) {
          // Filter if salary is significantly below minimum (more than 40% below)
          if (prefs.salaryMin) {
            const minSalary = parseInt(prefs.salaryMin);
            if (jobSalary < minSalary * 0.6) {
              return false;
            }
          }
          // Filter if salary is significantly above maximum (more than 60% above)
          if (prefs.salaryMax) {
            const maxSalary = parseInt(prefs.salaryMax);
            if (jobSalary > maxSalary * 1.6) {
              return false;
            }
          }
        }
      }

      // WORK TYPE: Only filter if user has strong remote preference
      if (prefs.workType === 'remote' && prefs.remotePreference) {
        const isRemoteJob = this.isRemoteJob(job);
        if (!isRemoteJob && !job.location?.toLowerCase().includes('hybrid')) {
          return false;
        }
      }

      // EXPERIENCE LEVEL: Filter extreme mismatches
      if (prefs.experienceLevel) {
        if (prefs.experienceLevel === 'entry') {
          // Filter out clearly senior positions
          if ((jobTitle.includes('senior') || jobTitle.includes('lead') ||
            jobTitle.includes('principal') || jobTitle.includes('director') ||
            jobTitle.includes('vp') || jobTitle.includes('chief')) &&
            (jobSnippet.includes('10+ years') || jobSnippet.includes('15+ years'))) {
            return false;
          }
        }

        if (prefs.experienceLevel === 'senior' || prefs.experienceLevel === 'lead') {
          // Filter out explicitly junior/intern positions
          if (jobTitle.includes('intern') ||
            (jobTitle.includes('junior') && !jobTitle.includes('senior')) ||
            (jobTitle.includes('entry') && jobSnippet.includes('no experience'))) {
            return false;
          }
        }
      }

      return true; // Keep job if it passes all filters
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

  // Prioritize jobs based on preferences (for sorting) - STRICT RELEVANCE
  scoreJob(job: JobDisplay): number {
    const prefs = this.getPreferences();
    let score = 0; // Start at 0 - jobs must earn their score

    const jobTitle = job.title.toLowerCase();
    const jobSnippet = (job.snippet || '').toLowerCase();
    const jobSkills = (job.skills || []).map(s => s.toLowerCase());

    // JOB TITLE MATCHING (40 points max - MOST IMPORTANT)
    if (prefs.jobTitle) {
      const prefTitleWords = prefs.jobTitle.toLowerCase().split(' ').filter(w => w.length > 2);
      const jobTitleWords = jobTitle.split(' ');

      // Check for exact phrase match first
      if (jobTitle.includes(prefs.jobTitle.toLowerCase())) {
        score += 40; // Perfect match
      } else {
        // Check for word matches
        const matchingWords = prefTitleWords.filter(word =>
          jobTitleWords.some(jobWord => jobWord.includes(word) || word.includes(jobWord))
        );

        if (matchingWords.length > 0) {
          const matchRatio = matchingWords.length / prefTitleWords.length;
          score += matchRatio * 40; // Proportional score
        } else {
          // Check if any key words appear in snippet
          const snippetMatches = prefTitleWords.filter(word => jobSnippet.includes(word));
          if (snippetMatches.length > 0) {
            score += (snippetMatches.length / prefTitleWords.length) * 15; // Partial credit
          }
        }
      }
    } else {
      // No job title preference, give base score
      score += 20;
    }

    // SKILLS MATCHING (35 points max - VERY IMPORTANT)
    if (prefs.skills && jobSkills.length > 0) {
      const userSkills = prefs.skills.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

      // Count matching skills
      const matchingSkills = jobSkills.filter(jobSkill =>
        userSkills.some(userSkill =>
          jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
        )
      );

      if (matchingSkills.length > 0) {
        const skillMatchRatio = matchingSkills.length / Math.max(userSkills.length, 1);
        score += skillMatchRatio * 35;

        // Bonus for having ALL user skills
        if (matchingSkills.length === userSkills.length) {
          score += 10;
        }
      } else {
        // Check if skills appear in job description
        const snippetSkillMatches = userSkills.filter(skill => jobSnippet.includes(skill));
        if (snippetSkillMatches.length > 0) {
          score += (snippetSkillMatches.length / userSkills.length) * 15; // Partial credit
        }
      }
    } else if (!prefs.skills) {
      // No skills preference, give base score
      score += 15;
    }

    // EXPERIENCE LEVEL MATCH (10 points)
    if (prefs.experienceLevel) {
      if (prefs.experienceLevel === 'senior' && (jobTitle.includes('senior') || jobTitle.includes('lead'))) {
        score += 10;
      } else if (prefs.experienceLevel === 'mid' && !jobTitle.includes('senior') && !jobTitle.includes('junior') && !jobTitle.includes('entry')) {
        score += 10;
      } else if (prefs.experienceLevel === 'entry' && (jobTitle.includes('junior') || jobTitle.includes('entry'))) {
        score += 10;
      } else if (prefs.experienceLevel === 'lead' && (jobTitle.includes('lead') || jobTitle.includes('principal') || jobTitle.includes('staff'))) {
        score += 10;
      } else {
        // Partial credit if not a mismatch
        score += 5;
      }
    } else {
      score += 5;
    }

    // WORK TYPE PREFERENCE (10 points)
    if (prefs.workType === 'remote' && this.isRemoteJob(job)) {
      score += 10;
    } else if (prefs.workType === 'hybrid' && job.location?.toLowerCase().includes('hybrid')) {
      score += 8;
    } else if (prefs.workType === 'flexible') {
      score += 5; // Neutral
    } else {
      score += 3; // Small penalty for mismatch
    }

    // SALARY RANGE (5 points bonus)
    const jobSalary = this.extractSalaryFromJob(job);
    if (jobSalary && (prefs.salaryMin || prefs.salaryMax)) {
      const minSalary = prefs.salaryMin ? parseInt(prefs.salaryMin) : 0;
      const maxSalary = prefs.salaryMax ? parseInt(prefs.salaryMax) : Infinity;

      if (jobSalary >= minSalary && jobSalary <= maxSalary) {
        score += 5; // Bonus for being in range
      } else if (jobSalary >= minSalary * 0.8 && jobSalary <= maxSalary * 1.2) {
        score += 3; // Smaller bonus for being close
      }
    }

    return Math.min(Math.round(score), 100); // Cap at 100
  }
}

export const userPreferencesService = new UserPreferencesService();