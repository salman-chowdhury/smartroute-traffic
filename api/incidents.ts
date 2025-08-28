// Serverless function to fetch and normalize traffic incidents
// Compatible with Vercel, Netlify, and other serverless platforms

import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Interface for QLDTraffic API response
interface QLDTrafficFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
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
}

interface QLDTrafficResponse {
  type: 'FeatureCollection';
  features: QLDTrafficFeature[];
}

// Normalized traffic incident interface
interface TrafficIncident {
  id: string;
  type: 'crash' | 'hazard' | 'roadwork' | 'flooding' | 'event' | 'camera';
  title: string;
  description: string;
  coordinates: [number, number]; // [lat, lng]
  status: 'clear' | 'moderate' | 'major' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startTime?: string;
  endTime?: string;
  lastUpdated: string;
  source: 'qldtraffic' | 'bom' | 'google';
  sourceUrl?: string;
  road?: string;
  suburb?: string;
  region?: string;
  affectedLanes?: string;
  diversions?: string[];
}

// Transform QLDTraffic data to our format
function transformQLDTrafficData(response: QLDTrafficResponse): TrafficIncident[] {
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

// Create mock data for development/fallback
function createMockTrafficData(): TrafficIncident[] {
  return [
    {
      id: 'api-crash-1',
      type: 'crash',
      title: 'Multi-vehicle Accident - Western Freeway',
      description: 'Three vehicle accident blocking two lanes, emergency services on scene',
      coordinates: [-27.4985, 152.9850],
      status: 'major',
      severity: 'high',
      startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      source: 'qldtraffic',
      road: 'Western Freeway',
      suburb: 'Toowong',
      affectedLanes: 'Two left lanes blocked',
      diversions: ['Use Milton Road as alternative']
    },
    {
      id: 'api-roadwork-1',
      type: 'roadwork',
      title: 'Major Roadworks - Coronation Drive',
      description: 'Lane closure for bridge maintenance work, expect significant delays',
      coordinates: [-27.4847, 152.9928],
      status: 'moderate',
      severity: 'medium',
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      source: 'qldtraffic',
      road: 'Coronation Drive',
      suburb: 'Toowong',
      diversions: ['Consider using Milton Road', 'Riverside Drive available']
    },
    {
      id: 'api-flooding-1',
      type: 'flooding',
      title: 'Flood Warning - River Road',
      description: 'Minor flooding affecting low-lying areas, road passable with caution',
      coordinates: [-27.5009, 152.9747],
      status: 'moderate',
      severity: 'medium',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      source: 'qldtraffic',
      road: 'River Road',
      suburb: 'Indooroopilly',
      region: 'Brisbane West'
    },
    {
      id: 'api-camera-1',
      type: 'camera',
      title: 'Traffic Camera - Eleanor Schonell Bridge',
      description: 'Live traffic monitoring - currently clear',
      coordinates: [-27.4975, 153.0137],
      status: 'clear',
      severity: 'low',
      lastUpdated: new Date().toISOString(),
      source: 'qldtraffic',
      road: 'Eleanor Schonell Bridge',
      suburb: 'St Lucia'
    },
    {
      id: 'api-event-1',
      type: 'event',
      title: 'Special Event - University of Queensland',
      description: 'Graduation ceremony causing increased traffic around campus',
      coordinates: [-27.4968, 153.0144],
      status: 'moderate',
      severity: 'medium',
      startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      source: 'qldtraffic',
      road: 'Sir William MacGregor Drive',
      suburb: 'St Lucia',
      region: 'Brisbane South'
    }
  ];
}

// Main handler function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if we should use mock data
    const useMockData = process.env.VITE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development';
    
    if (useMockData) {
      console.log('Using mock traffic data');
      const mockData = createMockTrafficData();
      
      return res.status(200).json({
        incidents: mockData,
        metadata: {
          lastUpdated: new Date().toISOString(),
          source: 'mock-data',
          count: mockData.length
        }
      });
    }

    // Fetch from QLDTraffic API
    const qldTrafficUrl = process.env.QLD_TRAFFIC_API_URL || 'https://www.qldtraffic.qld.gov.au/json/incidents';
    
    console.log('Fetching traffic data from:', qldTrafficUrl);
    
    const response = await fetch(qldTrafficUrl, {
      headers: {
        'User-Agent': 'SmartRoute-Traffic-App/1.0',
        'Accept': 'application/json'
      },
      // Add timeout
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`QLDTraffic API error: ${response.status} ${response.statusText}`);
    }

    const qldData: QLDTrafficResponse = await response.json();
    const transformedData = transformQLDTrafficData(qldData);

    console.log(`Processed ${transformedData.length} traffic incidents`);

    return res.status(200).json({
      incidents: transformedData,
      metadata: {
        lastUpdated: new Date().toISOString(),
        source: 'qldtraffic',
        count: transformedData.length
      }
    });

  } catch (error) {
    console.error('Error fetching traffic incidents:', error);
    
    // Fallback to mock data on error
    const fallbackData = createMockTrafficData();
    
    return res.status(200).json({
      incidents: fallbackData,
      metadata: {
        lastUpdated: new Date().toISOString(),
        source: 'fallback-mock',
        count: fallbackData.length,
        error: 'Primary data source unavailable'
      }
    });
  }
}

// Export for different serverless platforms
export { handler };
export { handler as GET };