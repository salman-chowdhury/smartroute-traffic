// Core traffic data types based on QLDTraffic API structure
export interface TrafficIncident {
  id: string;
  type: 'crash' | 'hazard' | 'roadwork' | 'flooding' | 'event' | 'camera';
  title: string;
  description: string;
  coordinates: [number, number]; // [lat, lng]
  status: 'clear' | 'moderate' | 'major' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  lastUpdated: string; // ISO string
  source: 'qldtraffic' | 'bom' | 'google';
  sourceUrl?: string;
  road?: string;
  suburb?: string;
  region?: string;
  affectedLanes?: string;
  diversions?: string[];
}

// Map layer configuration
export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  icon: string;
  incidents: TrafficIncident[];
  lastUpdated?: string;
}

// Route planning types
export interface RouteQuery {
  from: string;
  to: string;
  departureTime?: string; // ISO string
  arrivalTime?: string; // ISO string
  avoid: {
    tolls: boolean;
    floods: boolean;
    events: boolean;
  };
}

export interface RouteOption {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  distance: number; // kilometers
  status: 'clear' | 'moderate' | 'major' | 'unavailable';
  statusReason?: string;
  googleMapsUrl: string;
  estimatedArrival: string; // ISO string
  primaryRoads: string[];
  warnings: string[];
}

export interface RouteResponse {
  query: RouteQuery;
  options: RouteOption[];
  lastUpdated: string;
  source: string;
}

// AI Assistant types
export interface AIQuery {
  question: string;
  context?: {
    location?: string;
    time?: string;
    route?: string;
  };
}

export interface DataSource {
  type: 'incident' | 'camera' | 'weather' | 'route';
  id: string;
  title: string;
  timestamp: string;
  source: string;
}

export interface AIResponse {
  bullets: string[];
  suggestedAction?: string;
  dataSources: DataSource[];
  confidence: 'low' | 'medium' | 'high';
  timestamp: string;
}

// User preferences and saved routes
export interface SavedCommute {
  id: string;
  name: string;
  from: string;
  to: string;
  fromCoordinates?: [number, number];
  toCoordinates?: [number, number];
  defaultOptions: {
    avoidTolls: boolean;
    floodAware: boolean;
    eventAware: boolean;
  };
  createdAt: string;
  lastUsed: string;
}

// Application state
export interface AppState {
  map: {
    center: [number, number];
    zoom: number;
    layers: MapLayer[];
    selectedIncident?: TrafficIncident;
  };
  routes: {
    currentQuery?: RouteQuery;
    results?: RouteResponse;
    isLoading: boolean;
  };
  ai: {
    currentQuery?: AIQuery;
    currentResponse?: AIResponse;
    isLoading: boolean;
    chatHistory: Array<{
      query: AIQuery;
      response: AIResponse;
      timestamp: string;
    }>;
  };
  commutes: SavedCommute[];
  preferences: {
    defaultAvoidTolls: boolean;
    defaultFloodAware: boolean;
    defaultEventAware: boolean;
    preferredMapStyle: 'standard' | 'satellite';
  };
}

// API response types
export interface QLDTrafficResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat] - GeoJSON format
    };
    properties: {
      id: string;
      title: string;
      description: string;
      category: string;
      severity: string;
      created: string;
      updated: string;
      url?: string;
      road?: string;
      suburb?: string;
      [key: string]: any;
    };
  }>;
  metadata?: {
    lastUpdated: string;
    source: string;
    count: number;
  };
}

// Brisbane area bounds for map initialization
export const BRISBANE_BOUNDS = {
  center: [-27.4698, 153.0251] as [number, number], // Brisbane city center
  defaultZoom: 11,
  bounds: [
    [-27.8, 152.6], // Southwest
    [-27.1, 153.4]  // Northeast
  ] as [[number, number], [number, number]],
  // Key suburbs for the target area
  keyAreas: {
    stLucia: [-27.4983, 153.0158],
    indooroopilly: [-27.5009, 152.9747],
    toowong: [-27.4847, 152.9928],
    uq: [-27.4975, 153.0137]
  }
};

// Error handling types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}