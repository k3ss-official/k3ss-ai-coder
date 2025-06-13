import { AIRequest, AIModel, AIProvider, RoutingConstraints, ModelSelection } from '../types';
export interface RoutingStrategy {
    name: string;
    description: string;
    selectModel(request: AIRequest, availableModels: AIModel[], providers: Map<string, AIProvider>, constraints?: RoutingConstraints): ModelSelection;
}
export declare class PerformanceBasedStrategy implements RoutingStrategy {
    name: string;
    description: string;
    selectModel(request: AIRequest, availableModels: AIModel[], providers: Map<string, AIProvider>, constraints?: RoutingConstraints): ModelSelection;
    private filterByConstraints;
    private filterByTaskCompatibility;
    private calculateModelScore;
    private isCodeTask;
    private isLocalModel;
    private estimateContextSize;
    private getProviderReliabilityBonus;
    private getReasoningForModel;
}
export declare class CostOptimizedStrategy implements RoutingStrategy {
    name: string;
    description: string;
    selectModel(request: AIRequest, availableModels: AIModel[], providers: Map<string, AIProvider>, constraints?: RoutingConstraints): ModelSelection;
}
export declare class LatencyOptimizedStrategy implements RoutingStrategy {
    name: string;
    description: string;
    selectModel(request: AIRequest, availableModels: AIModel[], providers: Map<string, AIProvider>, constraints?: RoutingConstraints): ModelSelection;
}
export declare class QualityOptimizedStrategy implements RoutingStrategy {
    name: string;
    description: string;
    selectModel(request: AIRequest, availableModels: AIModel[], providers: Map<string, AIProvider>, constraints?: RoutingConstraints): ModelSelection;
}
//# sourceMappingURL=strategies.d.ts.map