import React, { useState, useEffect, useRef } from 'react';
import type { RouteQuery, RouteResponse, SavedCommute } from '../types';
import { apiService } from '../services/api';
import { formatUtils, debounce } from '../utils';
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Settings,
  Star,
  Calendar,
  Navigation,
  Loader,
  X
} from 'lucide-react';

interface RouteSearchProps {
  onRouteSearch: (query: RouteQuery) => void;
  onRouteResults: (results: RouteResponse | null) => void;
  savedCommutes: SavedCommute[];
  onUseCommute: (commute: SavedCommute) => void;
  className?: string;
}

interface LocationSuggestion {
  display: string;
  value: string;
  coordinates?: [number, number];
}

const RouteSearch: React.FC<RouteSearchProps> = ({
  onRouteSearch,
  onRouteResults,
  savedCommutes,
  onUseCommute,
  className = ''
}) => {
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [departureTime, setDepartureTime] = useState('now');
  const [customTime, setCustomTime] = useState('');
  const [timeType, setTimeType] = useState<'leave' | 'arrive'>('leave');
  
  const [fromSuggestions, setFromSuggestions] = useState<LocationSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationSuggestion[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  
  const [planOptions, setPlanOptions] = useState({
    avoidTolls: false,
    floodAware: true,
    eventAware: true
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // Common Brisbane locations for suggestions
  const commonLocations: LocationSuggestion[] = [
    { display: 'University of Queensland (UQ)', value: 'UQ St Lucia', coordinates: [-27.4975, 153.0137] },
    { display: 'Brisbane City', value: 'Brisbane City', coordinates: [-27.4698, 153.0251] },
    { display: 'Indooroopilly Shopping Centre', value: 'Indooroopilly', coordinates: [-27.5009, 152.9747] },
    { display: 'Toowong Village', value: 'Toowong', coordinates: [-27.4847, 152.9928] },
    { display: 'South Bank', value: 'South Bank', coordinates: [-27.4748, 153.0244] },
    { display: 'Queen Street Mall', value: 'Queen Street Mall', coordinates: [-27.4689, 153.0234] },
    { display: 'Brisbane Airport', value: 'Brisbane Airport', coordinates: [-27.3942, 153.1218] },
    { display: 'Paddington', value: 'Paddington', coordinates: [-27.4598, 152.9987] },
    { display: 'Milton', value: 'Milton', coordinates: [-27.4664, 152.9955] },
  ];

  // Debounced geocoding function
  const debouncedGeocode = debounce(async (query: string, setter: (suggestions: LocationSuggestion[]) => void) => {
    if (query.length < 2) {
      setter([]);
      return;
    }

    // Filter common locations first
    const filtered = commonLocations.filter(location =>
      location.display.toLowerCase().includes(query.toLowerCase()) ||
      location.value.toLowerCase().includes(query.toLowerCase())
    );

    // Try geocoding for additional results
    try {
      const geocoded = await apiService.geocodeAddress(query);
      if (geocoded) {
        filtered.unshift({
          display: geocoded.formatted,
          value: geocoded.formatted,
          coordinates: [geocoded.lat, geocoded.lng]
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }

    setter(filtered.slice(0, 5)); // Limit to 5 suggestions
  }, 300);

  // Handle input changes
  useEffect(() => {
    if (fromValue) {
      debouncedGeocode(fromValue, setFromSuggestions);
    } else {
      setFromSuggestions([]);
    }
  }, [fromValue]);

  useEffect(() => {
    if (toValue) {
      debouncedGeocode(toValue, setToSuggestions);
    } else {
      setToSuggestions([]);
    }
  }, [toValue]);

  const handleSearch = async () => {
    if (!fromValue.trim() || !toValue.trim()) {
      return;
    }

    setIsSearching(true);

    const query: RouteQuery = {
      from: fromValue.trim(),
      to: toValue.trim(),
      avoid: {
        tolls: planOptions.avoidTolls,
        floods: planOptions.floodAware,
        events: planOptions.eventAware
      }
    };

    // Add timing information
    if (departureTime !== 'now') {
      const timeValue = customTime || new Date().toTimeString().slice(0, 5);
      const [hours, minutes] = timeValue.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);

      if (timeType === 'leave') {
        query.departureTime = targetDate.toISOString();
      } else {
        query.arrivalTime = targetDate.toISOString();
      }
    }

    try {
      onRouteSearch(query);
      const results = await apiService.fetchRouteOptions(query);
      onRouteResults(results);
    } catch (error) {
      console.error('Route search error:', error);
      onRouteResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (
    suggestion: LocationSuggestion, 
    type: 'from' | 'to'
  ) => {
    if (type === 'from') {
      setFromValue(suggestion.value);
      setShowFromSuggestions(false);
    } else {
      setToValue(suggestion.value);
      setShowToSuggestions(false);
    }
  };

  const handleSwapLocations = () => {
    const temp = fromValue;
    setFromValue(toValue);
    setToValue(temp);
  };

  const handleCommuteSelect = (commute: SavedCommute) => {
    setFromValue(commute.from);
    setToValue(commute.to);
    setPlanOptions({
      avoidTolls: commute.defaultOptions.avoidTolls,
      floodAware: commute.defaultOptions.floodAware,
      eventAware: commute.defaultOptions.eventAware
    });
    onUseCommute(commute);
  };

  const clearSearch = () => {
    setFromValue('');
    setToValue('');
    setDepartureTime('now');
    setCustomTime('');
    onRouteResults(null);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Route Quick Check</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded hover:bg-gray-100 ${showAdvanced ? 'text-blue-600' : 'text-gray-600'}`}
              title="Advanced options"
            >
              <Settings className="w-4 h-4" />
            </button>
            {(fromValue || toValue) && (
              <button
                onClick={clearSearch}
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Saved Commutes */}
      {savedCommutes.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">My Commutes</h3>
          <div className="space-y-2">
            {savedCommutes.map((commute) => (
              <button
                key={commute.id}
                onClick={() => handleCommuteSelect(commute)}
                className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">{commute.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                  <span>{commute.from}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{commute.to}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Form */}
      <div className="p-4 space-y-4">
        {/* From Location */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From
          </label>
          <div className="relative">
            <input
              ref={fromInputRef}
              type="text"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
              onFocus={() => setShowFromSuggestions(true)}
              onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
              placeholder="Enter starting location"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            
            {showFromSuggestions && fromSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {fromSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(suggestion, 'from')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-sm">{suggestion.display}</div>
                    {suggestion.coordinates && (
                      <div className="text-xs text-gray-500">
                        {formatUtils.formatCoordinates(suggestion.coordinates[0], suggestion.coordinates[1])}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapLocations}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Swap locations"
          >
            <ArrowRight className="w-4 h-4 text-gray-600 rotate-90" />
          </button>
        </div>

        {/* To Location */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To
          </label>
          <div className="relative">
            <input
              ref={toInputRef}
              type="text"
              value={toValue}
              onChange={(e) => setToValue(e.target.value)}
              onFocus={() => setShowToSuggestions(true)}
              onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
              placeholder="Enter destination"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            
            {showToSuggestions && toSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {toSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(suggestion, 'to')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-sm">{suggestion.display}</div>
                    {suggestion.coordinates && (
                      <div className="text-xs text-gray-500">
                        {formatUtils.formatCoordinates(suggestion.coordinates[0], suggestion.coordinates[1])}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timing Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            When
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="timing"
                  value="now"
                  checked={departureTime === 'now'}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Leave now</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="timing"
                  value="custom"
                  checked={departureTime === 'custom'}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Custom time</span>
              </label>
            </div>

            {departureTime === 'custom' && (
              <div className="flex items-center gap-2">
                <select
                  value={timeType}
                  onChange={(e) => setTimeType(e.target.value as 'leave' | 'arrive')}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="leave">Leave at</option>
                  <option value="arrive">Arrive by</option>
                </select>
                
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700">Route Preferences</h4>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planOptions.avoidTolls}
                  onChange={(e) => setPlanOptions(prev => ({
                    ...prev,
                    avoidTolls: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Avoid tolls</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planOptions.floodAware}
                  onChange={(e) => setPlanOptions(prev => ({
                    ...prev,
                    floodAware: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Flood-aware routing</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planOptions.eventAware}
                  onChange={(e) => setPlanOptions(prev => ({
                    ...prev,
                    eventAware: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Avoid events and closures</span>
              </label>
            </div>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={!fromValue.trim() || !toValue.trim() || isSearching}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !fromValue.trim() || !toValue.trim() || isSearching
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSearching ? (
            <div className="flex items-center justify-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Searching routes...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>Find Routes</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default RouteSearch;