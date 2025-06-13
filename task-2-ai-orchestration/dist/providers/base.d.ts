import { AIProvider, AIRequest, AIResponse, AIModel, ProviderCapabilities, ProviderConfig, AIError } from '../types';
/**
 * Base abstract class for all AI providers
 * Implements common functionality and defines the interface
 */
export declare abstract class BaseAIProvider implements AIProvider {
    readonly name: string;
    readonly type: 'cloud' | 'local';
    protected config: ProviderConfig;
    protected models: AIModel[];
    constructor(name: string, type: 'cloud' | 'local', config: ProviderConfig);
    abstract isAvailable(): Promise<boolean>;
    abstract sendRequest(request: AIRequest): Promise<AIResponse>;
    abstract getCapabilities(): ProviderCapabilities;
    abstract loadModels(): Promise<void>;
    configure(config: ProviderConfig): void;
    getModels(): AIModel[];
    getModel(modelId: string): AIModel | undefined;
    protected createError(code: string, message: string, retryable?: boolean): AIError;
    protected validateRequest(request: AIRequest): void;
    protected createResponse(requestId: string, content: string, model: string, tokensUsed: number, responseTime: number): AIResponse;
}
/**
 * Provider registry for managing all available AI providers
 */
export declare class ProviderRegistry {
    private providers;
    register(provider: AIProvider): void;
    unregister(providerName: string): void;
    get(providerName: string): AIProvider | undefined;
    getAll(): AIProvider[];
    getAvailable(): Promise<AIProvider[]>;
    getAllModels(): AIModel[];
    findModel(modelId: string): {
        provider: AIProvider;
        model: AIModel;
    } | undefined;
}
//# sourceMappingURL=base.d.ts.map