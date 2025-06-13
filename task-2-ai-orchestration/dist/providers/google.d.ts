import { BaseAIProvider } from './base';
import { AIRequest, AIResponse, ProviderCapabilities, ProviderConfig } from '../types';
export declare class GoogleAIProvider extends BaseAIProvider {
    private client;
    constructor(config: ProviderConfig);
    isAvailable(): Promise<boolean>;
    loadModels(): Promise<void>;
    sendRequest(request: AIRequest): Promise<AIResponse>;
    getCapabilities(): ProviderCapabilities;
    private buildPrompt;
    private getSystemInstruction;
    private buildContextContent;
    private estimateTokens;
}
//# sourceMappingURL=google.d.ts.map