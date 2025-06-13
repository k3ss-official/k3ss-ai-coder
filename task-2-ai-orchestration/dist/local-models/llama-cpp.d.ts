import { BaseAIProvider } from '../providers/base';
import { AIRequest, AIResponse, ProviderCapabilities, LocalModelConfig, LocalModelParameters } from '../types';
interface LlamaCppConfig extends LocalModelConfig {
    executablePath: string;
    modelPath: string;
    parameters: LlamaCppParameters;
}
interface LlamaCppParameters extends LocalModelParameters {
    nCtx?: number;
    nBatch?: number;
    nThreads?: number;
    nGpuLayers?: number;
    mmap?: boolean;
    mlock?: boolean;
}
export declare class LlamaCppProvider extends BaseAIProvider {
    private config;
    private processes;
    constructor(config: LlamaCppConfig);
    isAvailable(): Promise<boolean>;
    loadModels(): Promise<void>;
    sendRequest(request: AIRequest): Promise<AIResponse>;
    getCapabilities(): ProviderCapabilities;
    private executeModel;
    private buildArgs;
    private extractResponse;
    private buildPrompt;
    private getSystemInstruction;
    private buildContextContent;
    private isCodeModel;
    private getModelAccuracy;
    private estimateTokens;
    loadModel(modelPath: string): Promise<boolean>;
    unloadModel(): Promise<void>;
    getModelInfo(): any;
}
export {};
//# sourceMappingURL=llama-cpp.d.ts.map