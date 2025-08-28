import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { TrafficIncident, MapLayer } from '../types';
import { BRISBANE_BOUNDS } from '../types';
import { apiService } from '../services/api';
import { formatUtils, colorUtils } from '../utils';
import { 
  MapPin, 
  AlertTriangle, 
  Construction, 
  Waves, 
  Calendar, 
  Camera,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

// Custom marker clustering component
const MarkerClusterGroup: React.FC<{
  children: React.ReactNode;
  chunkedLoading?: boolean;
}> = ({ children, chunkedLoading = false }) => {
  const map = useMap();
  const clusterRef = useRef<any>(null);

  useEffect(() => {
    if (!clusterRef.current) {
      clusterRef.current = (L as any).markerClusterGroup({
        chunkedLoading,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          let className = 'marker-cluster-';
          
          if (count < 10) {
            className += 'small';
          } else if (count < 25) {
            className += 'medium';
          } else {
            className += 'large';
          }
          
          return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster ${className}`,
            iconSize: [40, 40]
          });
        }
      });
      
      map.addLayer(clusterRef.current);
    }

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map, chunkedLoading]);

  return null;
};

// Layer-specific marker groups
const LayerMarkers: React.FC<{
  layer: MapLayer;
  onIncidentSelect: (incident: TrafficIncident) => void;
  selectedIncident?: TrafficIncident;
}> = ({ layer, onIncidentSelect, selectedIncident }) => {
  if (!layer.visible || layer.incidents.length === 0) {
    return null;
  }

  return (
    <LayerGroup>
      {layer.incidents.map((incident) => (
        <IncidentMarker
          key={incident.id}
          incident={incident}
          onSelect={onIncidentSelect}
          isSelected={selectedIncident?.id === incident.id}
        />
      ))}
    </LayerGroup>
  );
};
// Fix Leaflet marker icons for production builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TrafficMapProps {
  selectedIncident?: TrafficIncident;
  onIncidentSelect: (incident: TrafficIncident | undefined) => void;
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
  className?: string;
}

// Custom marker icons for different incident types
const createCustomIcon = (type: TrafficIncident['type'], status: TrafficIncident['status']) => {
  const color = colorUtils.getStatusColor(status);
  const iconSize = 32;
  
  const svgIcon = `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
      ${getIconPath(type)}
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-traffic-icon',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
    popupAnchor: [0, -iconSize / 2]
  });
};

const getIconPath = (type: TrafficIncident['type']): string => {
  const iconPaths = {
    crash: '<path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="white"/>',
    hazard: '<path d="M12 2L22 20H2L12 2ZM12 7L6 17H18L12 7Z" fill="white"/>',
    roadwork: '<path d="M3 17H7V19H17V17H21V15H19L17 13V11H19V9H17V7H15V9H9V7H7V9H5V11H7V13L5 15H3V17Z" fill="white"/>',
    flooding: '<path d="M6 2L4 6V20H20V6L18 2H6ZM8 4H16L17 6V18H7V6L8 4Z" fill="white"/>',
    event: '<path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z" fill="white"/>',
    camera: '<path d="M12 4C4.41 4 1.64 8.27 1.12 9.02C1.03 9.16 1.03 9.34 1.12 9.48C1.64 10.23 4.41 14.5 12 14.5S22.36 10.23 22.88 9.48C22.97 9.34 22.97 9.16 22.88 9.02C22.36 8.27 19.59 4 12 4ZM12 12.5C10.62 12.5 9.5 11.38 9.5 10S10.62 7.5 12 7.5S14.5 8.62 14.5 10S13.38 12.5 12 12.5Z" fill="white"/>'
  };
  
  return iconPaths[type] || iconPaths.hazard;
};

// Component to handle map events and updates
const MapEventHandler: React.FC<{
  incidents: TrafficIncident[];
  onIncidentSelect: (incident?: TrafficIncident) => void;
  selectedIncident?: TrafficIncident;
}> = ({ incidents, onIncidentSelect, selectedIncident }) => {
  const map = useMap();

  // Handle map clicks to deselect incidents
  useMapEvents({
    click: () => {
      onIncidentSelect(undefined);
    }
  });

  // Center map on selected incident
  useEffect(() => {
    if (selectedIncident) {
      map.setView(selectedIncident.coordinates, 15, { animate: true });
    }
  }, [selectedIncident, map]);

  return null;
};

// Incident marker component
const IncidentMarker: React.FC<{
  incident: TrafficIncident;
  onSelect: (incident: TrafficIncident) => void;
  isSelected: boolean;
}> = ({ incident, onSelect, isSelected }) => {
  const icon = createCustomIcon(incident.type, incident.status);
  
  return (
    <Marker
      position={incident.coordinates}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onSelect(incident);
        }
      }}
    >
      <Popup>
        <div className="p-2 min-w-64">
          <IncidentPopupContent incident={incident} />
        </div>
      </Popup>
    </Marker>
  );
};

// Popup content component
const IncidentPopupContent: React.FC<{ incident: TrafficIncident }> = ({ incident }) => {
  const getTypeIcon = (type: TrafficIncident['type']) => {
    const iconMap = {
      crash: AlertTriangle,
      hazard: AlertTriangle,
      roadwork: Construction,
      flooding: Waves,
      event: Calendar,
      camera: Camera
    };
    
    const IconComponent = iconMap[type] || AlertTriangle;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className={`p-1 rounded ${colorUtils.getStatusBgClass(incident.status)}`}>
          <div className="text-white">
            {getTypeIcon(incident.type)}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{incident.title}</h3>
          {incident.road && (
            <p className="text-xs text-gray-600">{incident.road}</p>
          )}
        </div>
      </div>

      {incident.description && (
        <p className="text-sm text-gray-700">{incident.description}</p>
      )}

      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Updated {formatUtils.formatTimestamp(incident.lastUpdated)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded text-xs font-medium ${colorUtils.getStatusBgClass(incident.status)} text-white`}>
            {formatUtils.titleCase(incident.status)}
          </span>
          
          {incident.sourceUrl && (
            <a
              href={incident.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <span>Details</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// Main TrafficMap component
const TrafficMap: React.FC<TrafficMapProps> = ({
  selectedIncident,
  onIncidentSelect,
  layers,
  onLayerToggle,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Get all visible incidents from layers
  const visibleIncidents = layers
    .filter(layer => layer.visible)
    .flatMap(layer => layer.incidents);

  const handleIncidentSelect = useCallback((incident?: TrafficIncident) => {
    onIncidentSelect(incident);
  }, [onIncidentSelect]);

  // Initialize map
  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Error</h3>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={BRISBANE_BOUNDS.center}
        zoom={BRISBANE_BOUNDS.defaultZoom}
        className="w-full h-full"
        ref={mapRef}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Render layered incidents */}
        <MarkerClusterGroup chunkedLoading={true}>
          {layers.map((layer) => (
            <LayerMarkers
              key={layer.id}
              layer={layer}
              onIncidentSelect={handleIncidentSelect}
              selectedIncident={selectedIncident}
            />
          ))}
        </MarkerClusterGroup>

        {/* Map event handler */}
        <MapEventHandler
          incidents={visibleIncidents}
          onIncidentSelect={handleIncidentSelect}
          selectedIncident={selectedIncident}
        />
      </MapContainer>

      {/* Map controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.setView(BRISBANE_BOUNDS.center, BRISBANE_BOUNDS.defaultZoom);
            }
          }}
          className="bg-white p-2 rounded shadow-lg hover:bg-gray-50"
          title="Reset to Brisbane view"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>

      {/* Incident counter */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <div className="bg-white px-3 py-2 rounded shadow-lg text-sm">
          <span className="font-medium">{visibleIncidents.length}</span> incidents
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;