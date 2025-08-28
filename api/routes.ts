// Serverless function for route planning and ETA calculation
// Compatible with Vercel, Netlify, and other serverless platforms

import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Route interfaces
interface RouteQuery {
  from: string;
  to: string;
  departureTime?: string;
  arrivalTime?: string;
  avoid: {
    tolls: boolean;
    floods: boolean;
    events: boolean;
  };
}

interface RouteOption {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  distance: number; // kilometers
  status: 'clear' | 'moderate' | 'major' | 'unavailable';
  statusReason?: string;
  googleMapsUrl: string;
  estimatedArrival: string;
  primaryRoads: string[];
  warnings: string[];
}

interface RouteResponse {
  query: RouteQuery;
  options: RouteOption[];
  lastUpdated: string;
  source: string;
}

// Brisbane location database for geocoding
const brisbaneLocations: Record<string, { lat: number; lng: number; formatted: string }> = {
  'uq': { lat: -27.4975, lng: 153.0137, formatted: 'University of Queensland, St Lucia QLD' },
  'university of queensland': { lat: -27.4975, lng: 153.0137, formatted: 'University of Queensland, St Lucia QLD' },
  'st lucia': { lat: -27.4983, lng: 153.0158, formatted: 'St Lucia QLD' },
  'indooroopilly': { lat: -27.5009, lng: 152.9747, formatted: 'Indooroopilly QLD' },
  'toowong': { lat: -27.4847, lng: 152.9928, formatted: 'Toowong QLD' },
  'brisbane city': { lat: -27.4698, lng: 153.0251, formatted: 'Brisbane City QLD' },
  'south bank': { lat: -27.4748, lng: 153.0244, formatted: 'South Bank QLD' },
  'paddington': { lat: -27.4598, lng: 152.9987, formatted: 'Paddington QLD' },
  'milton': { lat: -27.4664, lng: 152.9955, formatted: 'Milton QLD' },
  'auchenflower': { lat: -27.4787, lng: 152.9884, formatted: 'Auchenflower QLD' },
  'brisbane airport': { lat: -27.3942, lng: 153.1218, formatted: 'Brisbane Airport QLD' },
  'queen street mall': { lat: -27.4689, lng: 153.0234, formatted: 'Queen Street Mall, Brisbane QLD' }
};

// Simple geocoding function
function geocodeLocation(location: string): { lat: number; lng: number; formatted: string } | null {
  const normalized = location.toLowerCase().trim();
  
  // Direct match
  if (brisbaneLocations[normalized]) {
    return brisbaneLocations[normalized];
  }
  
  // Fuzzy match
  for (const [key, coords] of Object.entries(brisbaneLocations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  
  return null;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

// Generate Google Maps URL
function generateGoogleMapsUrl(query: RouteQuery, routeType: string): string {
  const baseUrl = 'https://www.google.com/maps/dir/';
  const origin = encodeURIComponent(query.from);
  const destination = encodeURIComponent(query.to);
  
  let url = `${baseUrl}${origin}/${destination}`;
  
  // Add avoid parameters
  const avoid: string[] = [];
  if (query.avoid.tolls) avoid.push('tolls');
  if (query.avoid.floods) avoid.push('highways'); // Approximate
  
  if (avoid.length > 0) {
    url += `?avoid=${avoid.join(',')}`;
  }
  
  return url;
}

// Mock route calculation
function calculateMockRoutes(query: RouteQuery): RouteOption[] {
  const fromCoords = geocodeLocation(query.from);
  const toCoords = geocodeLocation(query.to);
  
  if (!fromCoords || !toCoords) {
    return [];
  }
  
  const distance = calculateDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
  const baseTime = Math.max(15, distance * 3); // Rough estimate: 3 minutes per km minimum 15 min
  
  const routes: RouteOption[] = [
    {
      id: 'route-fastest',
      title: 'Fastest Route',
      description: 'Via major roads and highways',
      duration: Math.round(baseTime),
      distance: Math.round(distance * 10) / 10,
      status: Math.random() > 0.7 ? 'moderate' : 'clear',
      statusReason: Math.random() > 0.7 ? 'Minor delays due to traffic volume' : undefined,
      googleMapsUrl: generateGoogleMapsUrl(query, 'fastest'),
      estimatedArrival: new Date(Date.now() + baseTime * 60 * 1000).toISOString(),
      primaryRoads: ['Western Freeway', 'Coronation Drive'],
      warnings: Math.random() > 0.8 ? ['Heavy traffic expected'] : []
    },
    {
      id: 'route-alternative',
      title: 'Alternative Route',
      description: 'Via local roads, avoiding major highways',
      duration: Math.round(baseTime * 1.2),
      distance: Math.round(distance * 1.1 * 10) / 10,
      status: 'clear',
      googleMapsUrl: generateGoogleMapsUrl(query, 'alternative'),
      estimatedArrival: new Date(Date.now() + baseTime * 1.2 * 60 * 1000).toISOString(),
      primaryRoads: ['Milton Road', 'Sir Fred Schonell Drive'],
      warnings: []
    }
  ];
  
  // Add scenic route for longer distances
  if (distance > 10) {
    routes.push({
      id: 'route-scenic',
      title: 'Scenic Route',
      description: 'Via riverside roads (toll-free)',
      duration: Math.round(baseTime * 1.4),
      distance: Math.round(distance * 1.3 * 10) / 10,
      status: 'clear',
      googleMapsUrl: generateGoogleMapsUrl(query, 'scenic'),
      estimatedArrival: new Date(Date.now() + baseTime * 1.4 * 60 * 1000).toISOString(),
      primaryRoads: ['River Road', 'Riverside Drive'],
      warnings: []
    });
  }
  
  // Apply avoid preferences
  if (query.avoid.tolls) {
    routes.forEach(route => {
      if (route.primaryRoads.some(road => road.includes('Freeway') || road.includes('Highway'))) {
        route.duration = Math.round(route.duration * 1.1);
        route.description += ' (toll-free)';
      }
    });
  }
  
  return routes.slice(0, 3); // Return max 3 routes
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

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const query = req.body as RouteQuery;
    
    // Validate input
    if (!query.from || !query.to) {
      return res.status(400).json({ 
        error: 'Missing required fields: from and to locations' 
      });
    }
    
    if (!query.avoid) {
      query.avoid = { tolls: false, floods: true, events: true };
    }

    console.log('Processing route query:', {
      from: query.from,
      to: query.to,
      options: query.avoid
    });

    // Check if we can geocode the locations
    const fromCoords = geocodeLocation(query.from);
    const toCoords = geocodeLocation(query.to);
    
    if (!fromCoords || !toCoords) {
      return res.status(400).json({
        error: 'Unable to find one or both locations. Please use Brisbane area locations.',
        supportedAreas: 'St Lucia, Indooroopilly, Toowong, Brisbane City, South Bank'
      });
    }

    // For now, use mock calculation
    // In production, integrate with Google Directions API or similar
    const routes = calculateMockRoutes(query);
    
    if (routes.length === 0) {
      return res.status(404).json({
        error: 'No routes found for the specified locations'
      });
    }

    const response: RouteResponse = {
      query,
      options: routes,
      lastUpdated: new Date().toISOString(),
      source: 'smartroute-api'
    };

    console.log(`Generated ${routes.length} route options`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error processing route request:', error);
    
    return res.status(500).json({
      error: 'Internal server error while processing route request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export for different serverless platforms
export { handler };
export { handler as POST };