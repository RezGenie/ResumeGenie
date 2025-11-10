/**
 * User-scoped localStorage utility
 * Ensures data is isolated per user account
 */

export class UserStorage {
  /**
   * Get user-specific storage key
   * Scopes the key by user ID from JWT token
   */
  static getUserStorageKey(baseKey: string): string {
    // Get current user ID from auth token
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        // Decode JWT to get user ID (simple base64 decode of payload)
        const payload = authToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const userId = decoded.sub || decoded.user_id || decoded.id;
        return `${baseKey}_${userId}`;
      } catch (error) {
        console.warn('Failed to decode auth token:', error);
      }
    }
    
    // Fallback to guest session
    return `${baseKey}_guest`;
  }

  /**
   * Get item from user-scoped storage
   */
  static getItem(baseKey: string): string | null {
    const key = this.getUserStorageKey(baseKey);
    return localStorage.getItem(key);
  }

  /**
   * Set item in user-scoped storage
   */
  static setItem(baseKey: string, value: string): void {
    const key = this.getUserStorageKey(baseKey);
    localStorage.setItem(key, value);
  }

  /**
   * Remove item from user-scoped storage
   */
  static removeItem(baseKey: string): void {
    const key = this.getUserStorageKey(baseKey);
    localStorage.removeItem(key);
  }

  /**
   * Clear all data for current user
   */
  static clearUserData(): void {
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        const payload = authToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const userId = decoded.sub || decoded.user_id || decoded.id;
        
        // Remove all keys for this user
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(`_${userId}`)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Failed to clear user data:', error);
      }
    }
  }
}
