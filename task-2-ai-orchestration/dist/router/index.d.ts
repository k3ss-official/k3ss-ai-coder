import { AIRequest, AIResponse, AIProvider, TaskType, RoutingConstraints, ModelSelection } from '../types';
import { RoutingStrategy } from './strategies';
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
export declare class ModelRouter {
    private providers;
    private strategies;
    private config;
    private metrics;
    private performanceHistory;
    constructor(config: RouterConfig);
    private initializeStrategies;
    registerProvider(provider: AIProvider): void;
    unregisterProvider(providerName: string): void;
    routeRequest(request: AIRequest, constraints?: RoutingConstraints, strategyName?: string): Promise<AIResponse>;
    selectOptimalModel(request: AIRequest, constraints?: RoutingConstraints, strategyName?: string): Promise<ModelSelection>;
    private getAvailableModels;
    private selectStrategy;
    private executeWithFallback;
    private updateSuccessMetrics;
    private updateStrategyUsage;
    private updatePerformanceHistory;
    private createRoutingError;
    private delay;
    getMetrics(): RoutingMetrics;
    getPerformanceHistory(modelId?: string): Map<string, number[]> | number[];
    resetMetrics(): void;
    getAvailableStrategies(): string[];
    addCustomStrategy(name: string, strategy: RoutingStrategy): void;
    removeStrategy(name: string): void;
    getSystemStatus(): Promise<any>;
    updateConfig(newConfig: Partial<RouterConfig>): void;
    getConfig(): RouterConfig;
    classifyTask(content: string, context?: any): TaskType;
    private containsCodeKeywords;
}
//# sourceMappingURL=index.d.ts.map