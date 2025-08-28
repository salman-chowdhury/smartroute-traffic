import React, { useState, useRef, useEffect } from 'react';
import type { AIQuery, AIResponse, DataSource } from '../types';
import { aiService } from '../services/ai';
import { formatUtils } from '../utils';
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  Loader,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface AIPanelProps {
  className?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  response?: AIResponse;
  timestamp: string;
  isLoading?: boolean;
}

const AIPanel: React.FC<AIPanelProps> = ({
  className = '',
  isMinimized = false,
  onToggleMinimize
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Example queries for user guidance
  const suggestedQueries = [
    "Is the route from UQ to City clear at 8am?",
    "What's the traffic like on Coronation Drive?",
    "If I leave 30 minutes later, what changes?",
    "Why is Route B recommended today?",
    "How is Moggill Road to Indooroopilly?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    const loadingMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      type: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsProcessing(true);
    setShowSuggestions(false);

    try {
      const query: AIQuery = {
        question: userMessage.content
      };

      const response = await aiService.processQuery(query);

      // Replace loading message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: response.bullets.join(' • '),
              response: response,
              isLoading: false
            }
          : msg
      ));
    } catch (error) {
      console.error('AI query error:', error);
      
      // Replace loading message with error
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? {
              ...msg,
              content: 'Sorry, I encountered an error processing your request. Please try again.',
              isLoading: false
            }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const getConfidenceIcon = (confidence: AIResponse['confidence']) => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-gray-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const DataSourceBadge: React.FC<{ source: DataSource }> = ({ source }) => {
    const getSourceIcon = (type: DataSource['type']) => {
      switch (type) {
        case 'incident':
          return <AlertCircle className="w-3 h-3" />;
        case 'camera':
          return <Bot className="w-3 h-3" />;
        default:
          return <Info className="w-3 h-3" />;
      }
    };

    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border">
        {getSourceIcon(source.type)}
        <span className="font-medium">{source.title}</span>
        <span className="text-blue-500">
          {formatUtils.formatTimestamp(source.timestamp)}
        </span>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className={`bg-white rounded-lg shadow-lg ${className}`}>
        <button
          onClick={onToggleMinimize}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Ask SmartRoute</span>
          </div>
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Ask SmartRoute</h2>
            <p className="text-xs text-gray-600">Natural language traffic assistant</p>
          </div>
        </div>
        
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-1 hover:bg-gray-100 rounded"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96 min-h-64">
        {messages.length === 0 && showSuggestions && (
          <div className="space-y-4">
            <div className="text-center">
              <Lightbulb className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-4">
                Ask me anything about Brisbane traffic! Try these examples:
              </p>
            </div>
            
            <div className="space-y-2">
              {suggestedQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(query)}
                  className="w-full p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {/* User Message */}
            {message.type === 'user' && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-blue-600 text-white rounded-lg p-3 max-w-xs ml-auto">
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {formatUtils.formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            )}

            {/* Assistant Message */}
            {message.type === 'assistant' && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 max-w-xs">
                  {message.isLoading ? (
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin text-gray-600" />
                        <span className="text-sm text-gray-600">Analyzing traffic data...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-3 space-y-3">
                      {message.response ? (
                        <>
                          {/* Response Bullets */}
                          <div className="space-y-2">
                            {message.response.bullets.map((bullet, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                                <p className="text-sm text-gray-700">{bullet}</p>
                              </div>
                            ))}
                          </div>

                          {/* Suggested Action */}
                          {message.response.suggestedAction && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                  <div className="text-xs font-medium text-green-800 mb-1">
                                    Suggested Action
                                  </div>
                                  <p className="text-sm text-green-700">
                                    {message.response.suggestedAction}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Data Sources */}
                          {message.response.dataSources.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-600">
                                Data Sources:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {message.response.dataSources.map((source, index) => (
                                  <DataSourceBadge key={index} source={source} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Confidence & Timestamp */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              {getConfidenceIcon(message.response.confidence)}
                              <span>
                                {formatUtils.titleCase(message.response.confidence)} confidence
                              </span>
                            </div>
                            <span>
                              {formatUtils.formatTimestamp(message.response.timestamp)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-700">{message.content}</p>
                      )}
                    </div>
                  )}
                  
                  {!message.isLoading && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatUtils.formatTimestamp(message.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about traffic conditions..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={isProcessing}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className={`p-2 rounded-lg transition-colors ${
              !inputValue.trim() || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{inputValue.length}/200</span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;