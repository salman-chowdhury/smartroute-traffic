import React, { useState } from 'react';
import type { MapLayer } from '../types';
import { formatUtils, colorUtils } from '../utils';
import {
  AlertTriangle,
  Construction,
  Waves,
  Calendar,
  Camera,
  Eye,
  EyeOff,
  Clock,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface MapLegendProps {
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
  className?: string;
}

const MapLegend: React.FC<MapLegendProps> = ({ layers, onLayerToggle, className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showStatusGuide, setShowStatusGuide] = useState(false);

  const getLayerIcon = (layerId: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      crashes: AlertTriangle,
      hazards: AlertTriangle,
      roadworks: Construction,
      flooding: Waves,
      events: Calendar,
      cameras: Camera,
    };
    
    return iconMap[layerId] || AlertTriangle;
  };

  const statusDefinitions = [
    {
      status: 'clear' as const,
      label: 'Clear',
      description: 'Normal traffic flow, no significant delays',
      color: colorUtils.getStatusColor('clear')
    },
    {
      status: 'moderate' as const,
      label: 'Moderate',
      description: 'Minor delays, some congestion possible',
      color: colorUtils.getStatusColor('moderate')
    },
    {
      status: 'major' as const,
      label: 'Major',
      description: 'Significant delays, avoid if possible',
      color: colorUtils.getStatusColor('major')
    },
    {
      status: 'closed' as const,
      label: 'Closed',
      description: 'Road closed or blocked, use alternative route',
      color: colorUtils.getStatusColor('closed')
    }
  ];

  const totalIncidents = layers.reduce((total, layer) => total + layer.incidents.length, 0);
  const visibleIncidents = layers
    .filter(layer => layer.visible)
    .reduce((total, layer) => total + layer.incidents.length, 0);

  const getMostRecentUpdate = () => {
    const allTimestamps = layers
      .flatMap(layer => layer.incidents)
      .map(incident => incident.lastUpdated)
      .filter(Boolean);
    
    if (allTimestamps.length === 0) return null;
    
    const mostRecent = allTimestamps.reduce((latest, current) => 
      new Date(current) > new Date(latest) ? current : latest
    );
    
    return mostRecent;
  };

  const mostRecentUpdate = getMostRecentUpdate();

  if (isCollapsed) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium">
              {visibleIncidents}/{totalIncidents} incidents
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Expand legend"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Traffic Legend</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowStatusGuide(!showStatusGuide)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Status guide"
            >
              <Info className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="Collapse legend"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{visibleIncidents} of {totalIncidents} incidents visible</span>
          {mostRecentUpdate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Updated {formatUtils.formatTimestamp(mostRecentUpdate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Guide */}
      {showStatusGuide && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Status Definitions</h4>
          <div className="space-y-2">
            {statusDefinitions.map(({ status, label, description, color }) => (
              <div key={status} className="flex items-start gap-2">
                <div 
                  className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <div className="text-xs font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-600">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer Controls */}
      <div className="p-4 space-y-3">
        {layers.map((layer) => {
          const IconComponent = getLayerIcon(layer.id);
          const incidentCount = layer.incidents.length;
          
          return (
            <div key={layer.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => onLayerToggle(layer.id)}
                  className={`p-2 rounded-lg border-2 transition-colors ${
                    layer.visible
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-gray-50 text-gray-400'
                  }`}
                  aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                >
                  <IconComponent className="w-4 h-4" />
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      layer.visible ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {layer.name}
                    </span>
                    {layer.visible ? (
                      <Eye className="w-3 h-3 text-green-600" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${
                      layer.visible ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {incidentCount} {incidentCount === 1 ? 'incident' : 'incidents'}
                    </span>
                    
                    {layer.lastUpdated && (
                      <span className={`text-xs ${
                        layer.visible ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        • Updated {formatUtils.formatTimestamp(layer.lastUpdated)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status indicator for layer */}
              {incidentCount > 0 && layer.visible && (
                <div className="flex gap-1">
                  {['clear', 'moderate', 'major', 'closed'].map(status => {
                    const count = layer.incidents.filter(i => i.status === status).length;
                    if (count === 0) return null;
                    
                    return (
                      <div
                        key={status}
                        className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                        style={{ backgroundColor: colorUtils.getStatusColor(status as any) }}
                        title={`${count} ${status} incident${count !== 1 ? 's' : ''}`}
                      >
                        {count}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => {
              layers.forEach(layer => {
                if (!layer.visible) onLayerToggle(layer.id);
              });
            }}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Show All
          </button>
          
          <button
            onClick={() => {
              layers.forEach(layer => {
                if (layer.visible) onLayerToggle(layer.id);
              });
            }}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Hide All
          </button>
        </div>
      </div>

      {/* Data freshness indicator */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data from QLDTraffic</span>
        </div>
      </div>
    </div>
  );
};

export default MapLegend;