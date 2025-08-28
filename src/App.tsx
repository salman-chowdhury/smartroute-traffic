import React, { useState, useEffect, useCallback } from 'react';
import type { TrafficIncident, MapLayer, RouteQuery, RouteResponse, SavedCommute } from './types';
import { apiService } from './services/api';
import { storageService } from './utils';
import TrafficMap from './components/TrafficMap';
import MapLegend from './components/MapLegend';
import RouteSearch from './components/RouteSearch';
import RouteResults from './components/RouteResults';
import AIPanel from './components/AIPanel';
import { 
  Menu, 
  X, 
  Navigation, 
  Brain, 
  Map, 
  RefreshCw,
  AlertCircle 
} from 'lucide-react';

function App() {
  // State management
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<TrafficIncident>();
  const [routeQuery, setRouteQuery] = useState<RouteQuery>();
  const [routeResults, setRouteResults] = useState<RouteResponse | null>(null);
  const [savedCommutes, setSavedCommutes] = useState<SavedCommute[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIPanelMinimized, setIsAIPanelMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'ai'>('search');
  const [announcement, setAnnouncement] = useState<string>('');
  
  // Initialize layers configuration
  const initializeLayers = useCallback((incidents: TrafficIncident[]) => {
    const layerConfig = [
      { id: 'crashes', name: 'Crashes', icon: 'AlertTriangle', visible: true },
      { id: 'hazards', name: 'Hazards', icon: 'AlertTriangle', visible: true },
      { id: 'roadworks', name: 'Roadworks', icon: 'Construction', visible: true },
      { id: 'flooding', name: 'Flooding', icon: 'Waves', visible: true },
      { id: 'events', name: 'Events', icon: 'Calendar', visible: false },
      { id: 'cameras', name: 'Cameras', icon: 'Camera', visible: false },
    ];

    return layerConfig.map(config => {
      const layerIncidents = incidents.filter(incident => {
        if (config.id === 'crashes') return incident.type === 'crash';
        if (config.id === 'hazards') return incident.type === 'hazard';
        if (config.id === 'roadworks') return incident.type === 'roadwork';
        if (config.id === 'flooding') return incident.type === 'flooding';
        if (config.id === 'events') return incident.type === 'event';
        if (config.id === 'cameras') return incident.type === 'camera';
        return false;
      });

      return {
        id: config.id,
        name: config.name,
        visible: config.visible,
        color: layerIncidents.length > 0 ? '#3B82F6' : '#9CA3AF',
        icon: config.icon,
        incidents: layerIncidents,
        lastUpdated: layerIncidents.length > 0 ? 
          layerIncidents.reduce((latest, incident) => 
            new Date(incident.lastUpdated) > new Date(latest) ? incident.lastUpdated : latest
          , layerIncidents[0].lastUpdated) : undefined
      };
    });
  }, []);

  // Load traffic data
  const loadTrafficData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setAnnouncement('Loading traffic data...');
      
      const trafficData = await apiService.fetchTrafficIncidents();
      setIncidents(trafficData);
      
      const newLayers = initializeLayers(trafficData);
      setLayers(newLayers);
      
      setAnnouncement(`Traffic data loaded. ${trafficData.length} incidents found.`);
    } catch (err) {
      console.error('Failed to load traffic data:', err);
      const errorMessage = 'Failed to load traffic data. Please try again.';
      setError(errorMessage);
      setAnnouncement(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [initializeLayers]);

  // Load saved commutes
  const loadSavedCommutes = useCallback(() => {
    const commutes = storageService.getSavedCommutes();
    setSavedCommutes(commutes);
  }, []);

  // Initialize app
  useEffect(() => {
    loadTrafficData();
    loadSavedCommutes();
  }, [loadTrafficData, loadSavedCommutes]);

  // Handle layer toggle
  const handleLayerToggle = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  }, []);

  // Handle route search
  const handleRouteSearch = useCallback((query: RouteQuery) => {
    setRouteQuery(query);
  }, []);

  // Handle route results
  const handleRouteResults = useCallback((results: RouteResponse | null) => {
    setRouteResults(results);
  }, []);

  // Handle commute save
  const handleSaveCommute = useCallback((commute: Omit<SavedCommute, 'id' | 'createdAt' | 'lastUsed'>) => {
    const savedCommute = storageService.saveCommute(commute);
    setSavedCommutes(prev => [...prev, savedCommute]);
  }, []);

  // Handle commute use
  const handleUseCommute = useCallback((commute: SavedCommute) => {
    storageService.updateCommuteLastUsed(commute.id);
    loadSavedCommutes(); // Refresh the list
  }, [loadSavedCommutes]);

  // Handle data refresh
  const handleRefresh = useCallback(() => {
    apiService.clearCache();
    loadTrafficData();
  }, [loadTrafficData]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header 
        className="bg-white shadow-sm border-b border-gray-200"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg" aria-hidden="true">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SmartRoute</h1>
                <p className="text-xs text-gray-600">Local Traffic Companion</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav 
              className="hidden md:flex items-center gap-6"
              role="navigation"
              aria-label="Main navigation"
            >
              <button
                onClick={() => {
                  setActiveTab('search');
                  setAnnouncement('Route search panel activated');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'search'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-pressed={activeTab === 'search'}
                aria-describedby="search-tab-desc"
              >
                <Map className="w-4 h-4" aria-hidden="true" />
                Route Search
              </button>
              <div id="search-tab-desc" className="sr-only">
                Search for routes and view traffic information
              </div>
              
              <button
                onClick={() => {
                  setActiveTab('ai');
                  setAnnouncement('AI assistant panel activated');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'ai'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-pressed={activeTab === 'ai'}
                aria-describedby="ai-tab-desc"
              >
                <Brain className="w-4 h-4" aria-hidden="true" />
                AI Assistant
              </button>
              <div id="ai-tab-desc" className="sr-only">
                Ask natural language questions about traffic conditions
              </div>
              
              <button
                onClick={() => {
                  handleRefresh();
                  setAnnouncement('Refreshing traffic data...');
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Refresh traffic data"
                aria-label="Refresh traffic data"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Refresh
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? 
                <X className="w-5 h-5" aria-hidden="true" /> : 
                <Menu className="w-5 h-5" aria-hidden="true" />
              }
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div 
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 bg-white"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="px-4 py-2 space-y-2">
              <button
                onClick={() => {
                  setActiveTab('search');
                  setIsMobileMenuOpen(false);
                  setAnnouncement('Route search panel activated');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'search'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-pressed={activeTab === 'search'}
              >
                <Map className="w-4 h-4" aria-hidden="true" />
                Route Search
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('ai');
                  setIsMobileMenuOpen(false);
                  setAnnouncement('AI assistant panel activated');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'ai'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-pressed={activeTab === 'ai'}
              >
                <Brain className="w-4 h-4" aria-hidden="true" />
                AI Assistant
              </button>
              
              <button
                onClick={() => {
                  handleRefresh();
                  setIsMobileMenuOpen(false);
                  setAnnouncement('Refreshing traffic data...');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Refresh traffic data"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Refresh Data
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main 
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        role="main"
        aria-label="Traffic information dashboard"
      >
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Map Legend */}
          <div className="lg:col-span-1 space-y-6">
            <MapLegend
              layers={layers}
              onLayerToggle={handleLayerToggle}
              className="sticky top-6"
            />
          </div>

          {/* Main Map Area */}
          <div className="lg:col-span-2">
            <TrafficMap
              selectedIncident={selectedIncident}
              onIncidentSelect={setSelectedIncident}
              layers={layers}
              onLayerToggle={handleLayerToggle}
              className="h-96 lg:h-[600px] rounded-lg overflow-hidden"
            />
          </div>

          {/* Right Sidebar - Route Search & AI */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tab Navigation for Mobile */}
            <div className="lg:hidden">
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'search'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'ai'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AI Assistant
                </button>
              </div>
            </div>

            {/* Route Search Section */}
            <div className={activeTab === 'search' ? 'block' : 'hidden lg:block'}>
              <RouteSearch
                onRouteSearch={handleRouteSearch}
                onRouteResults={handleRouteResults}
                savedCommutes={savedCommutes}
                onUseCommute={handleUseCommute}
                className="sticky top-6"
              />
              
              {routeResults && (
                <div className="mt-6">
                  <RouteResults
                    results={routeResults}
                    onSaveCommute={handleSaveCommute}
                  />
                </div>
              )}
            </div>

            {/* AI Panel Section */}
            <div className={activeTab === 'ai' ? 'block' : 'hidden lg:block'}>
              <AIPanel
                className="sticky top-6"
                isMinimized={isAIPanelMinimized}
                onToggleMinimize={() => setIsAIPanelMinimized(!isAIPanelMinimized)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <p>SmartRoute: Local Traffic Companion for Brisbane</p>
              <p className="mt-1">Data sourced from QLDTraffic and other official sources</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Last updated: {new Date().toLocaleTimeString('en-AU', { hour12: true })}</span>
              <span>•</span>
              <span>{incidents.length} active incidents</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
