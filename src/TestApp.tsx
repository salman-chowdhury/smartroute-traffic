import React from 'react';
import { Navigation } from 'lucide-react';

// Simple test component to verify basic rendering
const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SmartRoute</h1>
              <p className="text-sm text-gray-600">Local Traffic Companion - Test Mode</p>
            </div>
          </div>
        </header>

        {/* Test Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Rendering Test</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>React Components ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Tailwind CSS ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Lucide Icons ✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">UI Elements Test</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Test Button
              </button>
              <input 
                type="text" 
                placeholder="Test input field"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-3 rounded-lg">
                Test alert component
              </div>
            </div>
          </div>
        </div>

        {/* Map Test Area */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Map Container Test</h2>
          <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-600">
              <Navigation className="w-12 h-12 mx-auto mb-2" />
              <p>Map will load here</p>
              <p className="text-sm">If you see this, basic rendering is working</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestApp;