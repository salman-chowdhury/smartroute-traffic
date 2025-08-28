import type { SavedCommute } from '../types';

// Local Storage utility functions
export class StorageService {
  private readonly COMMUTES_KEY = 'smartroute_commutes';
  private readonly PREFERENCES_KEY = 'smartroute_preferences';

  // Saved Commutes management
  getSavedCommutes(): SavedCommute[] {
    try {
      const stored = localStorage.getItem(this.COMMUTES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading saved commutes:', error);
      return [];
    }
  }

  saveCommute(commute: Omit<SavedCommute, 'id' | 'createdAt' | 'lastUsed'>): SavedCommute {
    const commutes = this.getSavedCommutes();
    
    // Limit to 3 commutes
    if (commutes.length >= 3) {
      // Remove the oldest used commute
      const oldestIndex = commutes.reduce((oldest, commute, index) => {
        return new Date(commute.lastUsed) < new Date(commutes[oldest].lastUsed) ? index : oldest;
      }, 0);
      commutes.splice(oldestIndex, 1);
    }

    const newCommute: SavedCommute = {
      ...commute,
      id: `commute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    commutes.push(newCommute);
    
    try {
      localStorage.setItem(this.COMMUTES_KEY, JSON.stringify(commutes));
    } catch (error) {
      console.error('Error saving commute:', error);
    }

    return newCommute;
  }

  updateCommuteLastUsed(commuteId: string): void {
    const commutes = this.getSavedCommutes();
    const commute = commutes.find(c => c.id === commuteId);
    
    if (commute) {
      commute.lastUsed = new Date().toISOString();
      try {
        localStorage.setItem(this.COMMUTES_KEY, JSON.stringify(commutes));
      } catch (error) {
        console.error('Error updating commute last used:', error);
      }
    }
  }

  deleteCommute(commuteId: string): void {
    const commutes = this.getSavedCommutes();
    const filteredCommutes = commutes.filter(c => c.id !== commuteId);
    
    try {
      localStorage.setItem(this.COMMUTES_KEY, JSON.stringify(filteredCommutes));
    } catch (error) {
      console.error('Error deleting commute:', error);
    }
  }

  // User Preferences management
  getPreferences(): any {
    try {
      const stored = localStorage.getItem(this.PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : {
        defaultAvoidTolls: false,
        defaultFloodAware: true,
        defaultEventAware: true,
        preferredMapStyle: 'standard'
      };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {};
    }
  }

  savePreferences(preferences: any): void {
    try {
      localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  // Clear all stored data
  clearAllData(): void {
    try {
      localStorage.removeItem(this.COMMUTES_KEY);
      localStorage.removeItem(this.PREFERENCES_KEY);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

// Formatting utilities
export const formatUtils = {
  // Format timestamp for display
  formatTimestamp(timestamp: string, format: 'relative' | 'absolute' = 'relative'): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (format === 'relative') {
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }

    return date.toLocaleTimeString('en-AU', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  },

  // Format duration in minutes to human readable
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    
    if (remainingMins === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMins}m`;
  },

  // Format distance in kilometers
  formatDistance(kilometers: number): string {
    if (kilometers < 1) {
      return `${Math.round(kilometers * 1000)}m`;
    }
    
    return `${kilometers.toFixed(1)}km`;
  },

  // Format coordinates for display
  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  },

  // Capitalize first letter of each word
  titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
};

// Color utilities for traffic status
export const colorUtils = {
  getStatusColor(status: 'clear' | 'moderate' | 'major' | 'closed'): string {
    const colors = {
      clear: '#10B981',    // Green
      moderate: '#F59E0B', // Amber
      major: '#EF4444',    // Red
      closed: '#1F2937',   // Dark gray
    };
    return colors[status];
  },

  getStatusBgClass(status: 'clear' | 'moderate' | 'major' | 'closed'): string {
    const classes = {
      clear: 'bg-green-500',
      moderate: 'bg-amber-500',
      major: 'bg-red-500',
      closed: 'bg-gray-800',
    };
    return classes[status];
  },

  getStatusTextClass(status: 'clear' | 'moderate' | 'major' | 'closed'): string {
    const classes = {
      clear: 'text-green-600',
      moderate: 'text-amber-600',
      major: 'text-red-600',
      closed: 'text-gray-800',
    };
    return classes[status];
  }
};

// Debounce utility for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Validate coordinates are within Brisbane area
export function isValidBrisbaneCoordinate(lat: number, lng: number): boolean {
  // Brisbane metropolitan area bounds (approximate)
  const bounds = {
    north: -26.8,
    south: -28.2,
    east: 153.6,
    west: 152.4
  };

  return lat >= bounds.south && 
         lat <= bounds.north && 
         lng >= bounds.west && 
         lng <= bounds.east;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in kilometers
}

// Export singleton storage service
export const storageService = new StorageService();