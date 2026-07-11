# SmartRoute: Local Traffic Companion

A responsive traffic companion prototype designed for commuters in **Brisbane's St Lucia, Indooroopilly and Toowong**, with a layout that can support broader South East Queensland coverage. SmartRoute adds local traffic context without replacing turn-by-turn navigation.

![SmartRoute Dashboard](./docs/screenshot.png)

## 🎯 Objectives

Solve QLDTraffic pain points with:
- **Clear UI**: No clunky maps or unclear colors
- **Fresh Data**: Show timestamps on all traffic information
- **Light Personalization**: Quick access to regular commutes

## ✨ Features

### 1. Interactive Traffic Map (Leaflet)
- **Map-first single page** with smooth pan/zoom
- **Toggle layers**: Crashes, Hazards, Roadworks, Flooding/Congestion, Special Events, Cameras
- **Always-visible legend** with Green/Amber/Red/Black status indicators
- **Click incidents** for detail cards with timestamps and data source badges
- **Default viewport**: Greater Brisbane (includes UQ St Lucia, Indooroopilly, Toowong)

### 2. Route Quick Check
- **Compact search**: From, To, Time (Leave now | Leave at | Arrive by)
- **Up to 3 route options** with ETA estimates and status colors
- **"Open in Google Maps"** deep links for selected routes
- **Plan toggles**: Avoid tolls, Flood-aware, Event-aware routing

### 3. AI Traffic Insight Panel ("Ask SmartRoute")
- **Natural language queries**: "Is Moggill Rd to UQ clear at 8am?"
- **3 concise bullets** format with optional suggested actions
- **Cited data sources** with timestamps (no speculation)
- **Mobile-friendly** slide-in interface

### 4. My Commutes (Lite)
- **Star up to 3** favorite origin↔destination pairs
- **One-click Quick Check** for saved routes
- **Local storage only** (no login required)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smartroute-traffic

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# API Configuration
VITE_API_BASE_URL=/api

# Feature Flags
VITE_DEV_MODE=true
VITE_MOCK_DATA=true

# Optional API Keys
# VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
# VITE_QLD_TRAFFIC_API_KEY=your_qld_traffic_api_key
```

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Mapping**: Leaflet + React Leaflet + OpenStreetMap tiles
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Storage**: Local Storage API

## 📊 Data Sources

### Primary
- **QLDTraffic GeoJSON**: Hazards, Crashes, Congestion, Flooding, Roadworks, Special Events, Web Cameras

### Optional Overlays
- **BOM warnings**: Weather-related traffic impacts
- **Google traffic layer**: Real-time traffic data (where permitted)

### Data Freshness
- **Stale-while-revalidate** caching strategy
- **Banner notifications** for delayed feeds
- **Source + timestamp** shown on all data items

## 🎨 Design Principles

### Mobile-First Responsive
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch-friendly**: 44px minimum touch targets
- **Progressive enhancement**: Works without JavaScript for basic functionality

### Accessibility (WCAG 2.2 AA)
- **Color contrast**: 4.5:1 minimum ratio
- **Focus management**: Visible focus indicators
- **ARIA labels**: Screen reader support
- **Keyboard navigation**: Full functionality without mouse

### Performance
- **Lighthouse score**: ≥ 95 target
- **Core Web Vitals**: Optimized LCP, CLS, FID
- **Bundle size**: Tree-shaking and code splitting
- **Image optimization**: WebP with fallbacks

## 🗂️ Project Structure

```
src/
├── components/           # React components
│   ├── TrafficMap.tsx   # Main Leaflet map
│   ├── MapLegend.tsx    # Layer controls and legend
│   ├── RouteSearch.tsx  # Route planning form
│   ├── RouteResults.tsx # Route options display
│   └── AIPanel.tsx      # Natural language assistant
├── services/            # API and business logic
│   ├── api.ts          # HTTP client and data fetching
│   └── ai.ts           # Natural language processing
├── types/              # TypeScript definitions
│   └── index.ts        # All type definitions
├── utils/              # Utility functions
│   └── index.ts        # Storage, formatting, etc.
├── styles.css          # Global styles and Tailwind
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Component Development

All components are built with:
- **TypeScript** for type safety
- **React Hooks** for state management
- **Tailwind CSS** for styling
- **Lucide React** for icons

### API Integration

Mock data is used by default in development mode. To integrate with real APIs:

1. Set `VITE_MOCK_DATA=false` in `.env.local`
2. Configure API endpoints in `src/services/api.ts`
3. Add necessary API keys to environment variables

## 🌐 Deployment

### Build Configuration

```bash
# Production build
npm run build

# Files will be generated in dist/
# Serve with any static file server
```

### Serverless Functions (Optional)

For production data fetching, deploy serverless functions:

```bash
# Example with Vercel
vercel --prod

# Example with Netlify
netlify deploy --prod
```

### Environment Setup

Production environment variables:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_DEV_MODE=false
VITE_MOCK_DATA=false
VITE_GOOGLE_MAPS_API_KEY=your_production_key
```

## 🔧 Configuration

### Map Settings

Customize map behavior in `src/types/index.ts`:

```typescript
export const BRISBANE_BOUNDS = {
  center: [-27.4698, 153.0251], // Brisbane center
  defaultZoom: 11,
  bounds: [
    [-27.8, 152.6], // Southwest
    [-27.1, 153.4]  // Northeast
  ]
};
```

### Traffic Layers

Enable/disable layers in `src/App.tsx`:

```typescript
const layerConfig = [
  { id: 'crashes', name: 'Crashes', visible: true },
  { id: 'roadworks', name: 'Roadworks', visible: true },
  { id: 'cameras', name: 'Cameras', visible: false },
  // Add custom layers...
];
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: 2-space indentation
- **Conventional Commits**: For changelog generation

## 📈 Performance Monitoring

### Metrics to Track

- **Time to First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Tools

- **Lighthouse CI**: Automated performance testing
- **Web Vitals**: Core metrics monitoring
- **Bundle Analyzer**: Asset size optimization

## 🐛 Troubleshooting

### Common Issues

**Map not loading**
- Check Leaflet CSS import in `src/styles.css`
- Verify network connectivity for tile loading

**Type errors**
- Run `npm run type-check` for detailed error messages
- Ensure all imports use `type` keyword for type-only imports

**API errors**
- Check console for network errors
- Verify `VITE_MOCK_DATA` setting in `.env.local`

**Performance issues**
- Use React DevTools Profiler
- Check Network tab for slow requests
- Monitor bundle size with `npm run analyze`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For questions or support:
- Open an [issue](https://github.com/your-repo/issues)
- Check the [documentation](./docs/)
- Contact the development team

---

**SmartRoute** - Making Brisbane traffic navigation simple, fast, and intelligent. 🚗✨
