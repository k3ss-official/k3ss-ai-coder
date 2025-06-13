import { 
  AIRequest, 
  AIResponse, 
  AIModel, 
  AIProvider, 
  TaskType, 
  RoutingConstraints, 
  ModelSelection,
  AIError
} from '../types';

import { 
  RoutingStrategy,
  PerformanceBasedStrategy,
  CostOptimizedStrategy,
  LatencyOptimizedStrategy,
  QualityOptimizedStrategy
} from './strategies';

export interface RouterConfig {
  defaultStrategy: string;
  fallbackEnabled: boolean;
  maxRetries: number;
  retryDelay: number;
  performanceTracking: boolean;
  adaptiveLearning: boolean;
}

export interface RoutingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  modelUsageStats: Map<string, number>;
  providerUsageStats: Map<string, number>;
  strategyUsageStats: Map<string, number>;
}

export class ModelRouter {
  private providers: Map<string, AIProvider> = new Map();
  private strategies: Map<string, RoutingStrategy> = new Map();
  private config: RouterConfig;
  private metrics: RoutingMetrics;
  private performanceHistory: Map<string, number[]> = new Map();

  constructor(config: RouterConfig) {
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      modelUsageStats: new Map(),
      providerUsageStats: new Map(),
      strategyUsageStats: new Map()
    };

    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies.set('performance', new PerformanceBasedStrategy());
    this.strategies.set('cost-optimized', new CostOptimizedStrategy());
    this.strategies.set('latency-optimized', new LatencyOptimizedStrategy());
    this.strategies.set('quality-optimized', new QualityOptimizedStrategy());
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  public unregisterProvider(providerName: string): void {
    this.providers.delete(providerName);
  }

  public async routeRequest(
    request: AIRequest, 
    constraints?: RoutingConstraints,
    strategyName?: string
  ): Promise<AIResponse> {
    
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Get available models
      const availableModels = await this.getAvailableModels();
      if (availableModels.length === 0) {
        throw new Error('No available models');
      }

      // Select routing strategy
      const strategy = this.selectStrategy(request, strategyName);
      this.updateStrategyUsage(strategy.name);

      // Select optimal model
      const selection = strategy.selectModel(request, availableModels, this.providers, constraints);
      
      // Execute request with fallback handling
      const response = await this.executeWithFallback(request, selection);
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateSuccessMetrics(selection.model, selection.provider, responseTime);
      
      // Update performance history for adaptive learning
      if (this.config.adaptiveLearning) {
        this.updatePerformanceHistory(selection.model.id, responseTime);
      }

      return response;

    } catch (error: any) {
      this.metrics.failedRequests++;
      throw this.createRoutingError(error.message, request);
    }
  }

  public selectOptimalModel(
    request: AIRequest, 
    constraints?: RoutingConstraints,
    strategyName?: string
  ): Promise<ModelSelection> {
    return this.getAvailableModels().then(availableModels => {
      const strategy = this.selectStrategy(request, strategyName);
      return strategy.selectModel(request, availableModels, this.providers, constraints);
    });
  }

  private async getAvailableModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          allModels.push(...provider.models);
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} unavailable:`, error);
      }
    }

    return allModels;
  }

  private selectStrategy(request: AIRequest, strategyName?: string): RoutingStrategy {
    const name = strategyName || this.config.defaultStrategy;
    const strategy = this.strategies.get(name);
    
    if (!strategy) {
      console.warn(`Strategy ${name} not found, using performance strategy`);
      return this.strategies.get('performance')!;
    }

    return strategy;
  }

  private async executeWithFallback(
    request: AIRequest, 
    selection: ModelSelection
  ): Promise<AIResponse> {
    
    let lastError: Error | null = null;
    const attempts = [selection, ...selection.fallbacks];

    for (let i = 0; i < attempts.length && i < this.config.maxRetries + 1; i++) {
      const attempt = attempts[i];
      
      try {
        console.log(`Attempting request with ${attempt.model.name} (${attempt.provider.name})`);
        const response = await attempt.provider.sendRequest({
          ...request,
          model: attempt.model.id
        });

        // Add routing metadata to response
        response.metadata.model = attempt.model.id;
        response.metadata.provider = attempt.provider.name;
        
        return response;

      } catch (error: any) {
        lastError = error;
        console.warn(`Request failed with ${attempt.model.name}:`, error.message);
        
        // Wait before retry (except for last attempt)
        if (i < attempts.length - 1 && this.config.retryDelay > 0) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError || new Error('All routing attempts failed');
  }

  private updateSuccessMetrics(model: AIModel, provider: AIProvider, responseTime: number): void {
    this.metrics.successfulRequests++;
    
    // Update average response time
    const total = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;

    // Update model usage stats
    const modelUsage = this.metrics.modelUsageStats.get(model.id) || 0;
    this.metrics.modelUsageStats.set(model.id, modelUsage + 1);

    // Update provider usage stats
    const providerUsage = this.metrics.providerUsageStats.get(provider.name) || 0;
    this.metrics.providerUsageStats.set(provider.name, providerUsage + 1);
  }

  private updateStrategyUsage(strategyName: string): void {
    const usage = this.metrics.strategyUsageStats.get(strategyName) || 0;
    this.metrics.strategyUsageStats.set(strategyName, usage + 1);
  }

  private updatePerformanceHistory(modelId: string, responseTime: number): void {
    if (!this.performanceHistory.has(modelId)) {
      this.performanceHistory.set(modelId, []);
    }

    const history = this.performanceHistory.get(modelId)!;
    history.push(responseTime);

    // Keep only last 100 measurements
    if (history.length > 100) {
      history.shift();
    }
  }

  private createRoutingError(message: string, request: AIRequest): AIError {
    return {
      code: 'ROUTING_FAILED',
      message: `Routing failed: ${message}`,
      retryable: true,
      details: {
        requestId: request.id,
        requestType: request.type
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods

  public getMetrics(): RoutingMetrics {
    return { ...this.metrics };
  }

  public getPerformanceHistory(modelId?: string): Map<string, number[]> | number[] {
    if (modelId) {
      return this.performanceHistory.get(modelId) || [];
    }
    return new Map(this.performanceHistory);
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      modelUsageStats: new Map(),
      providerUsageStats: new Map(),
      strategyUsageStats: new Map()
    };
    this.performanceHistory.clear();
  }

  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  public addCustomStrategy(name: string, strategy: RoutingStrategy): void {
    this.strategies.set(name, strategy);
  }

  public removeStrategy(name: string): void {
    if (name !== this.config.defaultStrategy) {
      this.strategies.delete(name);
    }
  }

  public async getSystemStatus(): Promise<any> {
    const availableModels = await this.getAvailableModels();
    const providerStatuses = await Promise.all(
      Array.from(this.providers.values()).map(async provider => ({
        name: provider.name,
        available: await provider.isAvailable(),
        modelCount: provider.models.length
      }))
    );

    return {
      totalProviders: this.providers.size,
      availableProviders: providerStatuses.filter(p => p.available).length,
      totalModels: availableModels.length,
      availableStrategies: this.getAvailableStrategies(),
      currentStrategy: this.config.defaultStrategy,
      metrics: this.getMetrics(),
      providers: providerStatuses
    };
  }

  public updateConfig(newConfig: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): RouterConfig {
    return { ...this.config };
  }

  // Task type classification helper
  public classifyTask(content: string, context?: any): TaskType {
    const lowerContent = content.toLowerCase();

    // Code generation patterns
    if (lowerContent.includes('write') || lowerContent.includes('create') || 
        lowerContent.includes('generate') || lowerContent.includes('implement')) {
      if (this.containsCodeKeywords(lowerContent)) {
        return 'code_generation';
      }
    }

    // Code explanation patterns
    if (lowerContent.includes('explain') || lowerContent.includes('what does') ||
        lowerContent.includes('how does') || lowerContent.includes('understand')) {
      if (this.containsCodeKeywords(lowerContent) || context?.selection) {
        return 'code_explanation';
      }
    }

    // Refactoring patterns
    if (lowerContent.includes('refactor') || lowerContent.includes('improve') ||
        lowerContent.includes('optimize') || lowerContent.includes('clean up')) {
      return 'code_refactoring';
    }

    // Bug fixing patterns
    if (lowerContent.includes('bug') || lowerContent.includes('error') ||
        lowerContent.includes('fix') || lowerContent.includes('debug')) {
      return 'bug_fixing';
    }

    // Testing patterns
    if (lowerContent.includes('test') || lowerContent.includes('unit test') ||
        lowerContent.includes('spec') || lowerContent.includes('assertion')) {
      return 'testing';
    }

    // Documentation patterns
    if (lowerContent.includes('document') || lowerContent.includes('comment') ||
        lowerContent.includes('readme') || lowerContent.includes('docs')) {
      return 'documentation';
    }

    // Optimization patterns
    if (lowerContent.includes('performance') || lowerContent.includes('faster') ||
        lowerContent.includes('efficient') || lowerContent.includes('memory')) {
      return 'optimization';
    }

    // Default to general chat
    return 'general_chat';
  }

  private containsCodeKeywords(content: string): boolean {
    const codeKeywords = [
      'function', 'class', 'method', 'variable', 'array', 'object',
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c++',
      'html', 'css', 'react', 'node', 'api', 'database', 'sql',
      'algorithm', 'data structure', 'loop', 'condition', 'import',
      'export', 'async', 'await', 'promise', 'callback'
    ];

    return codeKeywords.some(keyword => content.includes(keyword));
  }
}

