import { 
  AIProvider, 
  AIRequest, 
  AIResponse, 
  AIModel, 
  ProviderCapabilities, 
  ProviderConfig,
  AIError 
} from '../types';

/**
 * Base abstract class for all AI providers
 * Implements common functionality and defines the interface
 */
export abstract class BaseAIProvider implements AIProvider {
  public readonly name: string;
  public readonly type: 'cloud' | 'local';
  protected config: ProviderConfig;
  protected models: AIModel[] = [];

  constructor(name: string, type: 'cloud' | 'local', config: ProviderConfig) {
    this.name = name;
    this.type = type;
    this.config = config;
  }

  abstract isAvailable(): Promise<boolean>;
  abstract sendRequest(request: AIRequest): Promise<AIResponse>;
  abstract getCapabilities(): ProviderCapabilities;
  abstract loadModels(): Promise<void>;

  public configure(config: ProviderConfig): void {
    this.config = { ...this.config, ...config };
  }

  public getModels(): AIModel[] {
    return this.models;
  }

  public getModel(modelId: string): AIModel | undefined {
    return this.models.find(model => model.id === modelId);
  }

  protected createError(code: string, message: string, retryable: boolean = false): AIError {
    return {
      code,
      message,
      provider: this.name,
      retryable,
      details: null
    };
  }

  protected validateRequest(request: AIRequest): void {
    if (!request.id) {
      throw this.createError('INVALID_REQUEST', 'Request ID is required');
    }
    if (!request.content) {
      throw this.createError('INVALID_REQUEST', 'Request content is required');
    }
    if (!request.type) {
      throw this.createError('INVALID_REQUEST', 'Request type is required');
    }
  }

  protected createResponse(
    requestId: string,
    content: string,
    model: string,
    tokensUsed: number,
    responseTime: number
  ): AIResponse {
    return {
      id: requestId,
      content,
      metadata: {
        tokensUsed,
        responseTime,
        model,
        provider: this.name,
        cached: false,
        quality: {
          syntaxValid: true,
          relevanceScore: 0.8,
          completeness: 0.9,
          coherence: 0.85
        }
      },
      confidence: 0.8,
      model,
      provider: this.name,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Provider registry for managing all available AI providers
 */
export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  public register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  public unregister(providerName: string): void {
    this.providers.delete(providerName);
  }

  public get(providerName: string): AIProvider | undefined {
    return this.providers.get(providerName);
  }

  public getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public getAvailable(): Promise<AIProvider[]> {
    return Promise.all(
      Array.from(this.providers.values()).map(async provider => {
        const available = await provider.isAvailable();
        return available ? provider : null;
      })
    ).then(results => results.filter(provider => provider !== null) as AIProvider[]);
  }

  public getAllModels(): AIModel[] {
    return Array.from(this.providers.values())
      .flatMap(provider => provider.models);
  }

  public findModel(modelId: string): { provider: AIProvider; model: AIModel } | undefined {
    for (const provider of this.providers.values()) {
      const model = provider.getModel(modelId);
      if (model) {
        return { provider, model };
      }
    }
    return undefined;
  }
}

