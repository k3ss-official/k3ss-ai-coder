export { OllamaProvider } from './ollama';
export { LlamaCppProvider } from './llama-cpp';
export { LMStudioProvider } from './lm-studio';
export { HuggingFaceProvider } from './huggingface';
import { AIProvider, LocalModelConfig, ProviderConfig } from '../types';
export interface LocalModelManagerConfig {
    ollama?: ProviderConfig;
    llamaCpp?: LocalModelConfig & {
        executablePath: string;
    };
    lmStudio?: ProviderConfig;
    huggingFace?: LocalModelConfig & {
        modelName: string;
    };
}
export declare class LocalModelManager {
    private providers;
    private config;
    constructor(config: LocalModelManagerConfig);
    private initializeProviders;
    getProvider(name: string): AIProvider | undefined;
    getAllProviders(): AIProvider[];
    getAvailableProviders(): Promise<AIProvider[]>;
    refreshProviders(): Promise<void>;
    getSystemStatus(): Promise<any>;
    installModel(framework: string, modelName: string): Promise<boolean>;
    uninstallModel(framework: string, modelName: string): Promise<boolean>;
    getRecommendedModels(): Array<{
        framework: string;
        modelName: string;
        description: string;
        size: string;
        useCase: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map