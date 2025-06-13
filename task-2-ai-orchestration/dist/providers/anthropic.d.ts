import { BaseAIProvider } from './base';
import { AIRequest, AIResponse, ProviderCapabilities, ProviderConfig } from '../types';
export declare class AnthropicProvider extends BaseAIProvider {
    private client;
    constructor(config: ProviderConfig);
    isAvailable(): Promise<boolean>;
    loadModels(): Promise<void>;
    sendRequest(request: AIRequest): Promise<AIResponse>;
    getCapabilities(): ProviderCapabilities;
    private buildMessages;
    private getSystemPrompt;
    private buildContextContent;
}
//# sourceMappingURL=anthropic.d.ts.map