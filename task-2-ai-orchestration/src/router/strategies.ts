import { 
  AIRequest, 
  AIModel, 
  AIProvider, 
  TaskType, 
  RoutingConstraints, 
  ModelSelection,
  PerformanceMetrics
} from '../types';

export interface RoutingStrategy {
  name: string;
  description: string;
  selectModel(
    request: AIRequest, 
    availableModels: AIModel[], 
    providers: Map<string, AIProvider>,
    constraints?: RoutingConstraints
  ): ModelSelection;
}

export class PerformanceBasedStrategy implements RoutingStrategy {
  name = 'performance';
  description = 'Selects models based on performance metrics and task suitability';

  selectModel(
    request: AIRequest, 
    availableModels: AIModel[], 
    providers: Map<string, AIProvider>,
    constraints?: RoutingConstraints
  ): ModelSelection {
    
    // Filter models based on constraints
    let candidateModels = this.filterByConstraints(availableModels, constraints);
    
    // Filter by task compatibility
    candidateModels = this.filterByTaskCompatibility(candidateModels, request.type);
    
    if (candidateModels.length === 0) {
      throw new Error('No suitable models found for the request');
    }

    // Score models based on multiple factors
    const scoredModels = candidateModels.map(model => ({
      model,
      score: this.calculateModelScore(model, request, constraints),
      provider: providers.get(model.provider)!
    }));

    // Sort by score (highest first)
    scoredModels.sort((a, b) => b.score - a.score);

    const best = scoredModels[0];
    const fallbacks = scoredModels.slice(1, 4).map(sm => ({
      model: sm.model,
      provider: sm.provider,
      confidence: sm.score,
      reasoning: this.getReasoningForModel(sm.model, request),
      fallbacks: []
    }));

    return {
      model: best.model,
      provider: best.provider,
      confidence: best.score,
      reasoning: this.getReasoningForModel(best.model, request),
      fallbacks
    };
  }

  private filterByConstraints(models: AIModel[], constraints?: RoutingConstraints): AIModel[] {
    if (!constraints) return models;

    return models.filter(model => {
      // Check cost constraint
      if (constraints.maxCost && model.costPerToken && model.costPerToken > constraints.maxCost) {
        return false;
      }

      // Check latency constraint
      if (constraints.maxLatency && model.performance.averageResponseTime > constraints.maxLatency) {
        return false;
      }

      // Check local requirement
      if (constraints.requiresLocal && !this.isLocalModel(model)) {
        return false;
      }

      // Check preferred provider
      if (constraints.preferredProvider && model.provider !== constraints.preferredProvider) {
        return false;
      }

      // Check excluded providers
      if (constraints.excludeProviders && constraints.excludeProviders.includes(model.provider)) {
        return false;
      }

      // Check minimum quality
      if (constraints.minQuality && model.performance.accuracy < constraints.minQuality) {
        return false;
      }

      return true;
    });
  }

  private filterByTaskCompatibility(models: AIModel[], taskType: TaskType): AIModel[] {
    return models.filter(model => {
      // Check if model supports the task type
      if (!model.capabilities.tasks.includes(taskType)) {
        // Allow general_chat as fallback for most tasks
        if (taskType !== 'general_chat' && !model.capabilities.tasks.includes('general_chat')) {
          return false;
        }
      }

      // Special requirements for code tasks
      if (this.isCodeTask(taskType) && !model.capabilities.supportsCode) {
        return false;
      }

      return true;
    });
  }

  private calculateModelScore(model: AIModel, request: AIRequest, constraints?: RoutingConstraints): number {
    let score = 0;

    // Base score from accuracy
    score += model.performance.accuracy * 40;

    // Task compatibility bonus
    if (model.capabilities.tasks.includes(request.type)) {
      score += 20;
    }

    // Code capability bonus for code tasks
    if (this.isCodeTask(request.type) && model.capabilities.supportsCode) {
      score += 15;
    }

    // Performance factors
    score += (1 - model.performance.averageResponseTime / 10000) * 10; // Prefer faster models
    score += model.performance.reliability * 10;
    score += (model.performance.throughput / 200) * 5; // Normalize throughput

    // Context window bonus for large contexts
    const contextSize = this.estimateContextSize(request);
    if (contextSize > model.contextWindow * 0.8) {
      score -= 20; // Penalty for near-limit context
    } else if (model.contextWindow > contextSize * 2) {
      score += 5; // Bonus for ample context space
    }

    // Cost efficiency (if cost is a factor)
    if (model.costPerToken) {
      const costEfficiency = 1 / (model.costPerToken * 1000000); // Normalize cost
      score += costEfficiency * 5;
    } else {
      score += 10; // Bonus for free local models
    }

    // Local model preference (privacy/speed)
    if (this.isLocalModel(model)) {
      score += 8;
    }

    // Provider reliability bonus
    score += this.getProviderReliabilityBonus(model.provider);

    return Math.max(0, Math.min(100, score)); // Clamp to 0-100
  }

  private isCodeTask(taskType: TaskType): boolean {
    const codeTasks: TaskType[] = [
      'code_generation',
      'code_explanation', 
      'code_refactoring',
      'bug_fixing',
      'testing',
      'optimization'
    ];
    return codeTasks.includes(taskType);
  }

  private isLocalModel(model: AIModel): boolean {
    const localProviders = ['ollama', 'llama-cpp', 'lm-studio', 'huggingface'];
    return localProviders.includes(model.provider);
  }

  private estimateContextSize(request: AIRequest): number {
    let size = request.content.length;
    
    if (request.context) {
      size += request.context.files.reduce((sum, file) => 
        sum + (file.content?.length || 0), 0
      );
    }

    // Rough token estimation (1 token ≈ 4 characters)
    return Math.ceil(size / 4);
  }

  private getProviderReliabilityBonus(provider: string): number {
    const reliabilityScores: Record<string, number> = {
      'openai': 5,
      'anthropic': 5,
      'google': 4,
      'ollama': 4,
      'lm-studio': 3,
      'llama-cpp': 3,
      'huggingface': 2
    };
    return reliabilityScores[provider] || 0;
  }

  private getReasoningForModel(model: AIModel, request: AIRequest): string {
    const reasons: string[] = [];

    if (model.capabilities.tasks.includes(request.type)) {
      reasons.push(`Optimized for ${request.type.replace('_', ' ')}`);
    }

    if (this.isCodeTask(request.type) && model.capabilities.supportsCode) {
      reasons.push('Excellent code understanding');
    }

    if (model.performance.accuracy > 0.9) {
      reasons.push('High accuracy');
    }

    if (model.performance.averageResponseTime < 2000) {
      reasons.push('Fast response time');
    }

    if (this.isLocalModel(model)) {
      reasons.push('Local execution (privacy)');
    }

    if (model.contextWindow > 50000) {
      reasons.push('Large context window');
    }

    return reasons.join(', ') || 'General purpose model';
  }
}

export class CostOptimizedStrategy implements RoutingStrategy {
  name = 'cost-optimized';
  description = 'Prioritizes cost-effective models while maintaining quality';

  selectModel(
    request: AIRequest, 
    availableModels: AIModel[], 
    providers: Map<string, AIProvider>,
    constraints?: RoutingConstraints
  ): ModelSelection {
    
    let candidateModels = availableModels.filter(model => 
      model.capabilities.tasks.includes(request.type) || 
      model.capabilities.tasks.includes('general_chat')
    );

    if (candidateModels.length === 0) {
      throw new Error('No suitable models found');
    }

    // Prefer free local models first
    const localModels = candidateModels.filter(model => 
      ['ollama', 'llama-cpp', 'lm-studio', 'huggingface'].includes(model.provider)
    );

    if (localModels.length > 0) {
      // Select best local model by accuracy
      const bestLocal = localModels.reduce((best, current) => 
        current.performance.accuracy > best.performance.accuracy ? current : best
      );

      return {
        model: bestLocal,
        provider: providers.get(bestLocal.provider)!,
        confidence: 0.8,
        reasoning: 'Cost-optimized: Free local execution',
        fallbacks: []
      };
    }

    // Fall back to cheapest cloud model
    const cloudModels = candidateModels
      .filter(model => model.costPerToken)
      .sort((a, b) => (a.costPerToken || 0) - (b.costPerToken || 0));

    if (cloudModels.length > 0) {
      const cheapest = cloudModels[0];
      return {
        model: cheapest,
        provider: providers.get(cheapest.provider)!,
        confidence: 0.7,
        reasoning: 'Cost-optimized: Lowest cost cloud model',
        fallbacks: []
      };
    }

    // Last resort: any available model
    const fallback = candidateModels[0];
    return {
      model: fallback,
      provider: providers.get(fallback.provider)!,
      confidence: 0.6,
      reasoning: 'Fallback: Only available model',
      fallbacks: []
    };
  }
}

export class LatencyOptimizedStrategy implements RoutingStrategy {
  name = 'latency-optimized';
  description = 'Prioritizes fastest response times';

  selectModel(
    request: AIRequest, 
    availableModels: AIModel[], 
    providers: Map<string, AIProvider>,
    constraints?: RoutingConstraints
  ): ModelSelection {
    
    let candidateModels = availableModels.filter(model => 
      model.capabilities.tasks.includes(request.type) || 
      model.capabilities.tasks.includes('general_chat')
    );

    if (candidateModels.length === 0) {
      throw new Error('No suitable models found');
    }

    // Sort by response time (fastest first)
    candidateModels.sort((a, b) => 
      a.performance.averageResponseTime - b.performance.averageResponseTime
    );

    const fastest = candidateModels[0];
    
    return {
      model: fastest,
      provider: providers.get(fastest.provider)!,
      confidence: 0.85,
      reasoning: `Latency-optimized: ${fastest.performance.averageResponseTime}ms average response`,
      fallbacks: candidateModels.slice(1, 3).map(model => ({
        model,
        provider: providers.get(model.provider)!,
        confidence: 0.7,
        reasoning: `Fallback: ${model.performance.averageResponseTime}ms response time`,
        fallbacks: []
      }))
    };
  }
}

export class QualityOptimizedStrategy implements RoutingStrategy {
  name = 'quality-optimized';
  description = 'Prioritizes highest quality and accuracy';

  selectModel(
    request: AIRequest, 
    availableModels: AIModel[], 
    providers: Map<string, AIProvider>,
    constraints?: RoutingConstraints
  ): ModelSelection {
    
    let candidateModels = availableModels.filter(model => 
      model.capabilities.tasks.includes(request.type) || 
      model.capabilities.tasks.includes('general_chat')
    );

    if (candidateModels.length === 0) {
      throw new Error('No suitable models found');
    }

    // Sort by accuracy (highest first)
    candidateModels.sort((a, b) => b.performance.accuracy - a.performance.accuracy);

    const best = candidateModels[0];
    
    return {
      model: best,
      provider: providers.get(best.provider)!,
      confidence: 0.95,
      reasoning: `Quality-optimized: ${(best.performance.accuracy * 100).toFixed(1)}% accuracy`,
      fallbacks: candidateModels.slice(1, 3).map(model => ({
        model,
        provider: providers.get(model.provider)!,
        confidence: model.performance.accuracy,
        reasoning: `Fallback: ${(model.performance.accuracy * 100).toFixed(1)}% accuracy`,
        fallbacks: []
      }))
    };
  }
}

