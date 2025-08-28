import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { format } from 'date-fns';
import type {
  TrafficIncident,
  QLDTrafficResponse,
  RouteQuery,
  RouteResponse,
  RouteOption,
  APIError
} from '../types';
import { BRISBANE_BOUNDS } from '../types';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const QLD_TRAFFIC_BASE_URL = 'https://www.qldtraffic.qld.gov.au/json';

class APIService {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      console.log(`Making API request to: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw this.formatError(error);
      }
    );
  }

  private formatError(error: any): APIError {
    return {
      code: error.response?.status?.toString() || 'NETWORK_ERROR',
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      details: error.response?.data,
      timestamp: new Date().toISOString(),
    };
  }

  // Cache management
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCachedData<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  // Transform QLDTraffic data to our format
  private transformQLDTrafficData(response: QLDTrafficResponse): TrafficIncident[] {
    return response.features.map((feature) => {
      const { properties, geometry } = feature;
      
      // Map QLD Traffic categories to our types
      const typeMapping: Record<string, TrafficIncident['type']> = {
        'crash': 'crash',
        'incident': 'hazard',
        'roadwork': 'roadwork',
        'flooding': 'flooding',
        'event': 'event',
        'camera': 'camera',
      };

      // Map severity to status
      const statusMapping: Record<string, TrafficIncident['status']> = {
        'minor': 'clear',
        'moderate': 'moderate',
        'major': 'major',
        'closed': 'closed',
      };

      return {
        id: properties.id || `incident-${Date.now()}-${Math.random()}`,
        type: typeMapping[properties.category?.toLowerCase()] || 'hazard',
        title: properties.title || 'Traffic Incident',
        description: properties.description || '',
        coordinates: [geometry.coordinates[1], geometry.coordinates[0]], // Convert lng,lat to lat,lng
        status: statusMapping[properties.severity?.toLowerCase()] || 'moderate',
        severity: properties.severity?.toLowerCase() as TrafficIncident['severity'] || 'medium',
        startTime: properties.created,
        lastUpdated: properties.updated || properties.created || new Date().toISOString(),
        source: 'qldtraffic',
        sourceUrl: properties.url,
        road: properties.road,
        suburb: properties.suburb,
      };
    });
  }

  // Fetch traffic incidents from QLDTraffic
  async fetchTrafficIncidents(): Promise<TrafficIncident[]> {
    const cacheKey = 'traffic-incidents';
    const cached = this.getCachedData<TrafficIncident[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // For development, we'll create mock data since we can't access QLD Traffic directly from browser
      const mockData = this.createMockTrafficData();
      
      // Cache for 2 minutes
      this.setCachedData(cacheKey, mockData, 2 * 60 * 1000);
      
      return mockData;
    } catch (error) {
      console.error('Failed to fetch traffic incidents:', error);
      // Return empty array on error to prevent app crash
      return [];
    }
  }

  // Create mock data for development
  private createMockTrafficData(): TrafficIncident[] {
    const mockIncidents: TrafficIncident[] = [
      {
        id: 'mock-crash-1',
        type: 'crash',
        title: 'Vehicle Accident - Western Freeway',
        description: 'Two vehicle accident blocking left lane',
        coordinates: [-27.4985, 152.9850],
        status: 'major',
        severity: 'high',
        startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        source: 'qldtraffic',
        road: 'Western Freeway',
        suburb: 'Toowong',
        affectedLanes: 'Left lane blocked'
      },
      {
        id: 'mock-roadwork-1',
        type: 'roadwork',
        title: 'Roadworks - Coronation Drive',
        description: 'Lane closure for maintenance work',
        coordinates: [-27.4847, 152.9928],
        status: 'moderate',
        severity: 'medium',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        source: 'qldtraffic',
        road: 'Coronation Drive',
        suburb: 'Toowong',
        diversions: ['Alternative: Milton Road']
      },
      {
        id: 'mock-camera-1',
        type: 'camera',
        title: 'Traffic Camera - UQ Bridge',
        description: 'Live traffic monitoring',
        coordinates: [-27.4975, 153.0137],
        status: 'clear',
        severity: 'low',
        lastUpdated: new Date().toISOString(),
        source: 'qldtraffic',
        road: 'Eleanor Schonell Bridge',
        suburb: 'St Lucia'
      },
      {
        id: 'mock-hazard-1',
        type: 'hazard',
        title: 'Broken Down Vehicle - Indooroopilly',
        description: 'Vehicle broken down on shoulder',
        coordinates: [-27.5009, 152.9747],
        status: 'moderate',
        severity: 'medium',
        startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        source: 'qldtraffic',
        road: 'Moggill Road',
        suburb: 'Indooroopilly'
      }
    ];

    return mockIncidents;
  }

  // Fetch route options
  async fetchRouteOptions(query: RouteQuery): Promise<RouteResponse> {
    const cacheKey = `route-${JSON.stringify(query)}`;
    const cached = this.getCachedData<RouteResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // For development, create mock route data
      const mockResponse = this.createMockRouteData(query);
      
      // Cache for 5 minutes
      this.setCachedData(cacheKey, mockResponse, 5 * 60 * 1000);
      
      return mockResponse;
    } catch (error) {
      console.error('Failed to fetch route options:', error);
      throw error;
    }
  }

  private createMockRouteData(query: RouteQuery): RouteResponse {
    const baseTime = new Date();
    
    const options: RouteOption[] = [
      {
        id: 'route-1',
        title: 'Fastest Route',
        description: 'Via Western Freeway and Coronation Drive',
        duration: 25,
        distance: 18.5,
        status: 'moderate',
        statusReason: 'Minor delays due to roadwork on Coronation Drive',
        googleMapsUrl: this.generateGoogleMapsUrl(query, 'fastest'),
        estimatedArrival: new Date(baseTime.getTime() + 25 * 60 * 1000).toISOString(),
        primaryRoads: ['Western Freeway', 'Coronation Drive'],
        warnings: ['Lane closure on Coronation Drive']
      },
      {
        id: 'route-2',
        title: 'Alternative Route',
        description: 'Via Milton Road and Sir Fred Schonell Drive',
        duration: 28,
        distance: 16.2,
        status: 'clear',
        googleMapsUrl: this.generateGoogleMapsUrl(query, 'alternative'),
        estimatedArrival: new Date(baseTime.getTime() + 28 * 60 * 1000).toISOString(),
        primaryRoads: ['Milton Road', 'Sir Fred Schonell Drive'],
        warnings: []
      },
      {
        id: 'route-3',
        title: 'Scenic Route',
        description: 'Via River Road (toll-free)',
        duration: 35,
        distance: 22.1,
        status: 'clear',
        googleMapsUrl: this.generateGoogleMapsUrl(query, 'scenic'),
        estimatedArrival: new Date(baseTime.getTime() + 35 * 60 * 1000).toISOString(),
        primaryRoads: ['River Road', 'Riverside Drive'],
        warnings: []
      }
    ];

    return {
      query,
      options,
      lastUpdated: new Date().toISOString(),
      source: 'smartroute-mock'
    };
  }

  private generateGoogleMapsUrl(query: RouteQuery, routeType: string): string {
    const baseUrl = 'https://www.google.com/maps/dir/';
    const origin = encodeURIComponent(query.from);
    const destination = encodeURIComponent(query.to);
    
    return `${baseUrl}${origin}/${destination}`;
  }

  // Geocoding service (mock implementation)
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
    try {
      // Mock geocoding for common Brisbane locations
      const mockLocations: Record<string, { lat: number; lng: number; formatted: string }> = {
        'uq': { lat: -27.4975, lng: 153.0137, formatted: 'University of Queensland, St Lucia QLD' },
        'university of queensland': { lat: -27.4975, lng: 153.0137, formatted: 'University of Queensland, St Lucia QLD' },
        'st lucia': { lat: -27.4983, lng: 153.0158, formatted: 'St Lucia QLD' },
        'indooroopilly': { lat: -27.5009, lng: 152.9747, formatted: 'Indooroopilly QLD' },
        'toowong': { lat: -27.4847, lng: 152.9928, formatted: 'Toowong QLD' },
        'brisbane city': { lat: -27.4698, lng: 153.0251, formatted: 'Brisbane City QLD' },
        'south bank': { lat: -27.4748, lng: 153.0244, formatted: 'South Bank QLD' },
      };

      const key = address.toLowerCase();
      const exactMatch = mockLocations[key];
      if (exactMatch) {
        return exactMatch;
      }

      // Fuzzy match
      for (const [location, coords] of Object.entries(mockLocations)) {
        if (key.includes(location) || location.includes(key)) {
          return coords;
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Clear cache (useful for force refresh)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache status for debugging
  getCacheStatus(): Array<{ key: string; age: number; ttl: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp,
      ttl: value.ttl,
    }));
  }
}

// Export singleton instance
export const apiService = new APIService();
export default apiService;