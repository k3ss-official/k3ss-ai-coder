import { BaseAIProvider } from '../providers/base';
import { AIRequest, AIResponse, ProviderCapabilities, ProviderConfig } from '../types';
export declare class LMStudioProvider extends BaseAIProvider {
    private baseUrl;
    private timeout;
    constructor(config: ProviderConfig);
    isAvailable(): Promise<boolean>;
    loadModels(): Promise<void>;
    sendRequest(request: AIRequest): Promise<AIResponse>;
    getCapabilities(): ProviderCapabilities;
    getServerInfo(): Promise<any>;
    loadModel(modelPath: string): Promise<boolean>;
    unloadModel(): Promise<boolean>;
    private mapLMStudioModel;
    private buildMessages;
    private getSystemPrompt;
    private buildContextContent;
    private isCodeModel;
    private getContextWindow;
    private getModelAccuracy;
    private getDefaultModel;
    private estimateTokens;
}
//# sourceMappingURL=lm-studio.d.ts.map