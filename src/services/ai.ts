import type { AIQuery, AIResponse, DataSource, TrafficIncident, RouteResponse } from '../types';
import { apiService } from './api';
import { format, parseISO, isAfter, isBefore, addMinutes } from 'date-fns';

export class AIService {
  private trafficData: TrafficIncident[] = [];
  private lastDataUpdate: Date = new Date(0);

  // Update traffic data for AI analysis
  async updateTrafficData(): Promise<void> {
    try {
      this.trafficData = await apiService.fetchTrafficIncidents();
      this.lastDataUpdate = new Date();
    } catch (error) {
      console.error('Failed to update traffic data for AI:', error);
    }
  }

  // Process natural language query and return structured response
  async processQuery(query: AIQuery): Promise<AIResponse> {
    // Ensure we have fresh data
    const dataAge = Date.now() - this.lastDataUpdate.getTime();
    if (dataAge > 2 * 60 * 1000) { // Refresh if older than 2 minutes
      await this.updateTrafficData();
    }

    const { question, context } = query;
    const lowerQuestion = question.toLowerCase();

    // Parse the query for intent and entities
    const intent = this.parseIntent(lowerQuestion);
    const entities = this.extractEntities(lowerQuestion, context);

    let response: AIResponse;

    try {
      switch (intent) {
        case 'route_status':
          response = await this.handleRouteStatusQuery(entities, lowerQuestion);
          break;
        case 'route_comparison':
          response = await this.handleRouteComparisonQuery(entities, lowerQuestion);
          break;
        case 'time_impact':
          response = await this.handleTimeImpactQuery(entities, lowerQuestion);
          break;
        case 'area_status':
          response = await this.handleAreaStatusQuery(entities, lowerQuestion);
          break;
        case 'incident_details':
          response = await this.handleIncidentDetailsQuery(entities, lowerQuestion);
          break;
        default:
          response = this.handleGenericQuery(lowerQuestion);
      }
    } catch (error) {
      console.error('AI query processing error:', error);
      response = {
        bullets: [
          'Sorry, I encountered an error processing your request.',
          'Please try rephrasing your question or check back in a moment.',
          'You can also try asking about specific roads or suburbs.'
        ],
        confidence: 'low',
        dataSources: [],
        timestamp: new Date().toISOString()
      };
    }

    return response;
  }

  private parseIntent(question: string): string {
    const patterns = {
      route_status: /is .* (clear|ok|good|blocked|busy)|(how is|what's) .* to .* (like|looking)/,
      route_comparison: /(which|what) .* (route|way|path) .* (better|faster|best)|compare .* routes?/,
      time_impact: /(if i leave|leaving) .* (earlier|later)|what if .* (time|when)/,
      area_status: /(how is|what's) .* (road|area|suburb) .* (like|looking)|is .* (busy|clear)/,
      incident_details: /why .* (slow|delay|blocked)|what.* (happening|wrong|problem)/
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(question)) {
        return intent;
      }
    }

    return 'general';
  }

  private extractEntities(question: string, context?: AIQuery['context']) {
    const entities: any = {
      locations: [],
      roads: [],
      times: [],
      routes: []
    };

    // Extract common Brisbane locations
    const locationPatterns = [
      'uq', 'university of queensland', 'st lucia', 'indooroopilly', 'toowong',
      'brisbane city', 'south bank', 'milton', 'paddington', 'auchenflower'
    ];

    const roadPatterns = [
      'western freeway', 'coronation drive', 'milton road', 'moggill road',
      'sir fred schonell drive', 'eleanor schonell bridge', 'riverside drive'
    ];

    const timePatterns = /(\d{1,2})(:\d{2})?\s?(am|pm)|(\d{1,2})\s?(am|pm)/gi;

    // Extract locations
    locationPatterns.forEach(location => {
      if (question.includes(location)) {
        entities.locations.push(location);
      }
    });

    // Extract roads
    roadPatterns.forEach(road => {
      if (question.includes(road)) {
        entities.roads.push(road);
      }
    });

    // Extract times
    const timeMatches = question.match(timePatterns);
    if (timeMatches) {
      entities.times = timeMatches;
    }

    // Add context if provided
    if (context) {
      if (context.location) entities.locations.push(context.location);
      if (context.time) entities.times.push(context.time);
      if (context.route) entities.routes.push(context.route);
    }

    return entities;
  }

  private async handleRouteStatusQuery(entities: any, question: string): Promise<AIResponse> {
    const relevantIncidents = this.findRelevantIncidents(entities);
    const dataSources: DataSource[] = [];

    let bullets: string[] = [];

    if (entities.locations.length >= 2) {
      // Route between locations
      const from = entities.locations[0];
      const to = entities.locations[1];
      
      bullets.push(`Checking route from ${from} to ${to}...`);

      if (relevantIncidents.length > 0) {
        const majorIncidents = relevantIncidents.filter(i => i.status === 'major' || i.status === 'closed');
        if (majorIncidents.length > 0) {
          bullets.push(`⚠️ ${majorIncidents.length} major incident(s) affecting this route`);
          bullets.push('Consider alternative routes or delay departure');
        } else {
          bullets.push('✓ Minor delays possible but route is generally clear');
        }
      } else {
        bullets.push('✓ No reported incidents on this route');
      }

      // Add data sources
      relevantIncidents.forEach(incident => {
        dataSources.push({
          type: 'incident',
          id: incident.id,
          title: incident.title,
          timestamp: incident.lastUpdated,
          source: incident.source
        });
      });
    } else if (entities.roads.length > 0) {
      // Specific road status
      const road = entities.roads[0];
      const roadIncidents = relevantIncidents.filter(i => 
        i.road?.toLowerCase().includes(road) || 
        i.title.toLowerCase().includes(road)
      );

      bullets.push(`Current status for ${road}:`);

      if (roadIncidents.length > 0) {
        const latestIncident = roadIncidents[0];
        bullets.push(`${this.getStatusEmoji(latestIncident.status)} ${latestIncident.title}`);
        bullets.push(`Last updated: ${format(parseISO(latestIncident.lastUpdated), 'h:mm a')}`);
      } else {
        bullets.push('✓ No reported incidents on this road');
      }
    } else {
      bullets = [
        'I need more specific information to check route status.',
        'Please specify locations like "UQ to City" or "Toowong to Indooroopilly".',
        'You can also ask about specific roads like "How is Coronation Drive?"'
      ];
    }

    return {
      bullets,
      confidence: bullets.length > 1 && dataSources.length > 0 ? 'high' : 'medium',
      dataSources,
      timestamp: new Date().toISOString()
    };
  }

  private async handleRouteComparisonQuery(entities: any, question: string): Promise<AIResponse> {
    if (entities.locations.length < 2) {
      return {
        bullets: [
          'I need start and end locations to compare routes.',
          'Try asking "Which route is better from UQ to City?"',
          'I can compare up to 3 different route options for you.'
        ],
        confidence: 'low',
        dataSources: [],
        timestamp: new Date().toISOString()
      };
    }

    // Mock route comparison logic
    const bullets = [
      '🔀 Comparing route options for your journey:',
      'Route A (Western Freeway): Fastest but has minor delays',
      'Route B (Milton Road): Slightly longer but currently clear'
    ];

    return {
      bullets,
      suggestedAction: 'Take Route B via Milton Road for most reliable timing',
      confidence: 'high',
      dataSources: [],
      timestamp: new Date().toISOString()
    };
  }

  private async handleTimeImpactQuery(entities: any, question: string): Promise<AIResponse> {
    const bullets = [
      '⏱️ Time impact analysis:',
      'Leaving 30 minutes later would avoid peak congestion',
      'Expected travel time would reduce by 10-15 minutes'
    ];

    return {
      bullets,
      suggestedAction: 'Consider delaying departure to 8:30 AM',
      confidence: 'medium',
      dataSources: [],
      timestamp: new Date().toISOString()
    };
  }

  private async handleAreaStatusQuery(entities: any, question: string): Promise<AIResponse> {
    const area = entities.locations[0] || entities.roads[0] || 'the area';
    const relevantIncidents = this.findRelevantIncidents(entities);

    const bullets = [
      `📍 Current status for ${area}:`,
      relevantIncidents.length > 0 ? 
        `${relevantIncidents.length} active incident(s) reported` :
        'No active incidents reported',
      `Data last updated: ${format(this.lastDataUpdate, 'h:mm a')}`
    ];

    const dataSources: DataSource[] = relevantIncidents.map(incident => ({
      type: 'incident',
      id: incident.id,
      title: incident.title,
      timestamp: incident.lastUpdated,
      source: incident.source
    }));

    return {
      bullets,
      confidence: 'high',
      dataSources,
      timestamp: new Date().toISOString()
    };
  }

  private async handleIncidentDetailsQuery(entities: any, question: string): Promise<AIResponse> {
    const relevantIncidents = this.findRelevantIncidents(entities);

    if (relevantIncidents.length === 0) {
      return {
        bullets: [
          'No specific incidents found for your query.',
          'Traffic appears to be flowing normally in this area.',
          'Check back if conditions change or try asking about specific roads.'
        ],
        confidence: 'medium',
        dataSources: [],
        timestamp: new Date().toISOString()
      };
    }

    const incident = relevantIncidents[0];
    const bullets = [
      `🚨 ${incident.title}`,
      incident.description || 'Additional details not available',
      `Status: ${incident.status} | Updated: ${format(parseISO(incident.lastUpdated), 'h:mm a')}`
    ];

    const dataSources: DataSource[] = [{
      type: 'incident',
      id: incident.id,
      title: incident.title,
      timestamp: incident.lastUpdated,
      source: incident.source
    }];

    return {
      bullets,
      confidence: 'high',
      dataSources,
      timestamp: new Date().toISOString()
    };
  }

  private handleGenericQuery(question: string): AIResponse {
    return {
      bullets: [
        'I can help you with traffic information for Brisbane.',
        'Try asking: "How is the route from UQ to City?" or "Is Coronation Drive clear?"',
        'I can also compare routes and suggest optimal departure times.'
      ],
      confidence: 'low',
      dataSources: [],
      timestamp: new Date().toISOString()
    };
  }

  private findRelevantIncidents(entities: any): TrafficIncident[] {
    return this.trafficData.filter(incident => {
      // Check if incident is relevant to locations
      if (entities.locations.length > 0) {
        return entities.locations.some((loc: string) => 
          incident.road?.toLowerCase().includes(loc) ||
          incident.suburb?.toLowerCase().includes(loc) ||
          incident.title.toLowerCase().includes(loc) ||
          incident.description.toLowerCase().includes(loc)
        );
      }

      // Check if incident is relevant to roads
      if (entities.roads.length > 0) {
        return entities.roads.some((road: string) =>
          incident.road?.toLowerCase().includes(road) ||
          incident.title.toLowerCase().includes(road)
        );
      }

      return false;
    });
  }

  private getStatusEmoji(status: string): string {
    const emojiMap = {
      clear: '✅',
      moderate: '⚠️',
      major: '🚨',
      closed: '❌'
    };
    return emojiMap[status as keyof typeof emojiMap] || '❓';
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;