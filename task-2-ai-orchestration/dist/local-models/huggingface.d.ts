import { BaseAIProvider } from '../providers/base';
import { AIRequest, AIResponse, ProviderCapabilities, LocalModelConfig } from '../types';
interface HuggingFaceConfig extends LocalModelConfig {
    pythonPath?: string;
    modelName: string;
    modelPath?: string;
    device?: 'cpu' | 'cuda' | 'mps';
    quantization?: '4bit' | '8bit' | 'none';
}
export declare class HuggingFaceProvider extends BaseAIProvider {
    private config;
    private pythonScriptPath;
    private isModelLoaded;
    constructor(config: HuggingFaceConfig);
    isAvailable(): Promise<boolean>;
    loadModels(): Promise<void>;
    sendRequest(request: AIRequest): Promise<AIResponse>;
    getCapabilities(): ProviderCapabilities;
    loadModel(modelName: string): Promise<boolean>;
    unloadModel(): Promise<boolean>;
    private executeModel;
    private executePythonScript;
    private getModelInfo;
    private mapHuggingFaceModel;
    private initializePythonBridge;
    private buildPrompt;
    private getSystemInstruction;
    private buildContextContent;
    private isCodeModel;
    private getModelAccuracy;
    private estimateTokens;
}
export {};
//# sourceMappingURL=huggingface.d.ts.map