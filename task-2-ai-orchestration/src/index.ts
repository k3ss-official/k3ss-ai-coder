// Main AI Orchestration Engine exports
export { AIOrchestrationEngine, OrchestrationEngineConfig } from './api/engine';

// Core types
export * from './types';

// Provider system
export * from './providers';

// Local model support
export * from './local-models';

// Intelligent routing
export * from './router';

// Context management
export * from './context';

// Response processing
export * from './processing';

// Default configuration factory
import { OrchestrationEngineConfig } from './api/engine';

export function createDefaultConfig(): OrchestrationEngineConfig {
  return {
    port: 3000,
    host: '0.0.0.0',
    cors: true,
    websocket: true,
    router: {
      defaultStrategy: 'performance',
      fallbackEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      performanceTracking: true,
      adaptiveLearning: true
    },
    context: {
      maxFiles: 100,
      maxTokens: 50000,
      relevanceThreshold: 0.3,
      compressionEnabled: true,
      cacheEnabled: true,
      analysisDepth: 'medium',
      autoRefresh: false,
      refreshInterval: 30,
      persistCache: false,
      watchFileChanges: false
    },
    processing: {
      cacheEnabled: true,
      cacheSize: 1000,
      cacheTTL: 60,
      formatEnabled: true,
      optimizationEnabled: true,
      qualityThreshold: 0.7
    }
  };
}

