import { BaseAIProvider } from '../providers/base';
import { AIRequest, AIResponse, ProviderCapabilities, ProviderConfig } from '../types';
export declare class OllamaProvider extends BaseAIProvider {
    private baseUrl;
    private timeout;
    constructor(config: ProviderConfig);
    isAvailable(): Promise<boolean>;
    loadModels(): Promise<void>;
    sendRequest(request: AIRequest): Promise<AIResponse>;
    getCapabilities(): ProviderCapabilities;
    pullModel(modelName: string): Promise<boolean>;
    deleteModel(modelName: string): Promise<boolean>;
    getModelInfo(modelName: string): Promise<any>;
    private mapOllamaModel;
    private isCodeModel;
    private getContextWindow;
    private getModelAccuracy;
    private getDefaultModel;
    private buildPrompt;
    private getSystemInstruction;
    private buildContextContent;
    private estimateTokens;
}
//# sourceMappingURL=ollama.d.ts.map