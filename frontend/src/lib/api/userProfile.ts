// User Profile Service - Manages personal information locally
// This complements the user preferences service which handles job preferences

// TODO: MIGRATION NEEDED - Profile pictures currently stored as base64 in localStorage
// This is an MVP approach with limitations (no cross-device sync, storage size issues)

export interface UserProfile {
  name: string;
  phone?: string;
  location?: string;
  bio?: string;
  profilePicture?: string;
  avatar?: string; // Currently: base64 string or preset avatar path | Future: Cloud storage URL
}

class UserProfileService {
  private readonly STORAGE_KEY_PREFIX = 'user_profile_';

  // Get user-specific storage key
  private getUserStorageKey(): string {
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        const payload = authToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const userId = decoded.sub || decoded.user_id || decoded.id;
        return `${this.STORAGE_KEY_PREFIX}${userId}`;
      } catch (error) {
        console.warn('Failed to decode auth token:', error);
      }
    }
    
    return `${this.STORAGE_KEY_PREFIX}guest`;
  }

  // Save user profile to localStorage
  saveProfile(profile: Partial<UserProfile>): void {
    try {
      const storageKey = this.getUserStorageKey();
      const existing = this.getProfile();
      const updated = { ...existing, ...profile };
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Dispatch custom event to notify components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: updated
        }));
      }
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  // Get user profile from localStorage
  getProfile(): UserProfile {
    try {
      const storageKey = this.getUserStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }

    // Return empty profile
    return {
      name: '',
    };
  }

  // Clear user profile
  clearProfile(): void {
    try {
      const storageKey = this.getUserStorageKey();
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear user profile:', error);
    }
  }
}

export const userProfileService = new UserProfileService();
