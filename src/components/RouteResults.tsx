import React, { useState } from 'react';
import type { RouteResponse, RouteOption, SavedCommute } from '../types';
import { formatUtils, colorUtils, storageService } from '../utils';
import {
  Clock,
  Route,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Star,
  MapPin,
  Navigation,
  Bookmark,
  TrendingUp,
  Zap
} from 'lucide-react';

interface RouteResultsProps {
  results: RouteResponse | null;
  isLoading?: boolean;
  error?: string | null;
  onSaveCommute?: (commute: Omit<SavedCommute, 'id' | 'createdAt' | 'lastUsed'>) => void;
  className?: string;
}

const RouteResults: React.FC<RouteResultsProps> = ({
  results,
  isLoading = false,
  error = null,
  onSaveCommute,
  className = ''
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commuteName, setCommuteName] = useState('');

  const getStatusIcon = (status: RouteOption['status']) => {
    const iconMap = {
      clear: CheckCircle,
      moderate: AlertTriangle,
      major: XCircle,
      unavailable: XCircle
    };
    
    return iconMap[status] || AlertTriangle;
  };

  const getStatusColor = (status: RouteOption['status']) => {
    const colorMap = {
      clear: 'text-green-600',
      moderate: 'text-amber-600',
      major: 'text-red-600',
      unavailable: 'text-gray-600'
    };
    
    return colorMap[status] || 'text-gray-600';
  };

  const getBestRoute = (options: RouteOption[]) => {
    const available = options.filter(opt => opt.status !== 'unavailable');
    if (available.length === 0) return null;
    
    // Prioritize clear routes, then by duration
    return available.reduce((best, current) => {
      if (current.status === 'clear' && best.status !== 'clear') return current;
      if (current.status !== 'clear' && best.status === 'clear') return best;
      return current.duration < best.duration ? current : best;
    });
  };

  const handleSaveCommute = () => {
    if (!results || !commuteName.trim() || !onSaveCommute) return;

    const newCommute: Omit<SavedCommute, 'id' | 'createdAt' | 'lastUsed'> = {
      name: commuteName.trim(),
      from: results.query.from,
      to: results.query.to,
      defaultOptions: {
        avoidTolls: results.query.avoid.tolls,
        floodAware: results.query.avoid.floods,
        eventAware: results.query.avoid.events
      }
    };

    onSaveCommute(newCommute);
    setShowSaveModal(false);
    setCommuteName('');
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Finding best routes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Route Search Failed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your locations and try again. Make sure both locations are in the Brisbane area.
          </p>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const bestRoute = getBestRoute(results.options);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Route Options</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{results.query.from}</span>
              <Navigation className="w-3 h-3" />
              <span>{results.query.to}</span>
            </div>
          </div>
          
          {onSaveCommute && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save Route</span>
            </button>
          )}
        </div>
      </div>

      {/* Best Route Highlight */}
      {bestRoute && (
        <div className="p-4 bg-green-50 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Recommended Route</span>
          </div>
          <div className="text-sm text-green-700">
            <strong>{bestRoute.title}</strong> - {formatUtils.formatDuration(bestRoute.duration)}, 
            {formatUtils.formatDistance(bestRoute.distance)}
            {bestRoute.statusReason && (
              <span className="block mt-1">{bestRoute.statusReason}</span>
            )}
          </div>
        </div>
      )}

      {/* Route Options */}
      <div className="divide-y divide-gray-200">
        {results.options.map((option, index) => {
          const StatusIcon = getStatusIcon(option.status);
          const isBest = bestRoute?.id === option.id;
          
          return (
            <div key={option.id} className={`p-4 ${isBest ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Route Title and Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <StatusIcon className={`w-5 h-5 ${getStatusColor(option.status)}`} />
                    <h3 className="font-semibold text-gray-900">{option.title}</h3>
                    {isBest && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Best
                      </span>
                    )}
                  </div>

                  {/* Route Description */}
                  <p className="text-sm text-gray-600 mb-3">{option.description}</p>

                  {/* Route Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatUtils.formatDuration(option.duration)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Distance</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatUtils.formatDistance(option.distance)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</div>
                      <div className={`text-sm font-semibold ${getStatusColor(option.status)}`}>
                        {formatUtils.titleCase(option.status)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ETA</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(option.estimatedArrival).toLocaleTimeString('en-AU', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Primary Roads */}
                  {option.primaryRoads.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">Main Routes</div>
                      <div className="flex flex-wrap gap-1">
                        {option.primaryRoads.map((road, roadIndex) => (
                          <span
                            key={roadIndex}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {road}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {option.warnings.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-amber-600 mb-1">Warnings</div>
                      <div className="space-y-1">
                        {option.warnings.map((warning, warningIndex) => (
                          <div key={warningIndex} className="flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-amber-700">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Reason */}
                  {option.statusReason && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">Traffic Info</div>
                      <p className="text-sm text-gray-700">{option.statusReason}</p>
                    </div>
                  )}
                </div>

                {/* Google Maps Button */}
                <div className="ml-4 flex-shrink-0">
                  <a
                    href={option.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>Open in Maps</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Updated {formatUtils.formatTimestamp(results.lastUpdated)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>Data from {results.source}</span>
          </div>
        </div>
      </div>

      {/* Save Commute Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Commute</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commute Name
              </label>
              <input
                type="text"
                value={commuteName}
                onChange={(e) => setCommuteName(e.target.value)}
                placeholder="e.g., Home to Work"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={50}
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <div><strong>From:</strong> {results.query.from}</div>
                <div><strong>To:</strong> {results.query.to}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setCommuteName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSaveCommute}
                disabled={!commuteName.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  commuteName.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save Commute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteResults;