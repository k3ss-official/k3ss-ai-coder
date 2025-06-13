// Local model exports
export { OllamaProvider } from './ollama';
export { LlamaCppProvider } from './llama-cpp';
export { LMStudioProvider } from './lm-studio';
export { HuggingFaceProvider } from './huggingface';

// Local model manager
import { AIProvider, LocalModelConfig, ProviderConfig } from '../types';
import { OllamaProvider } from './ollama';
import { LlamaCppProvider } from './llama-cpp';
import { LMStudioProvider } from './lm-studio';
import { HuggingFaceProvider } from './huggingface';

export interface LocalModelManagerConfig {
  ollama?: ProviderConfig;
  llamaCpp?: LocalModelConfig & { executablePath: string };
  lmStudio?: ProviderConfig;
  huggingFace?: LocalModelConfig & { modelName: string };
}

export class LocalModelManager {
  private providers: Map<string, AIProvider> = new Map();
  private config: LocalModelManagerConfig;

  constructor(config: LocalModelManagerConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    // Initialize Ollama if configured
    if (this.config.ollama) {
      try {
        const ollama = new OllamaProvider(this.config.ollama);
        if (await ollama.isAvailable()) {
          this.providers.set('ollama', ollama);
          console.log('Ollama provider initialized');
        }
      } catch (error) {
        console.warn('Failed to initialize Ollama provider:', error);
      }
    }

    // Initialize llama.cpp if configured
    if (this.config.llamaCpp) {
      try {
        const llamaCpp = new LlamaCppProvider(this.config.llamaCpp);
        if (await llamaCpp.isAvailable()) {
          this.providers.set('llama-cpp', llamaCpp);
          console.log('llama.cpp provider initialized');
        }
      } catch (error) {
        console.warn('Failed to initialize llama.cpp provider:', error);
      }
    }

    // Initialize LM Studio if configured
    if (this.config.lmStudio) {
      try {
        const lmStudio = new LMStudioProvider(this.config.lmStudio);
        if (await lmStudio.isAvailable()) {
          this.providers.set('lm-studio', lmStudio);
          console.log('LM Studio provider initialized');
        }
      } catch (error) {
        console.warn('Failed to initialize LM Studio provider:', error);
      }
    }

    // Initialize Hugging Face if configured
    if (this.config.huggingFace) {
      try {
        const huggingFace = new HuggingFaceProvider(this.config.huggingFace);
        if (await huggingFace.isAvailable()) {
          this.providers.set('huggingface', huggingFace);
          console.log('Hugging Face provider initialized');
        }
      } catch (error) {
        console.warn('Failed to initialize Hugging Face provider:', error);
      }
    }
  }

  public getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public getAvailableProviders(): Promise<AIProvider[]> {
    return Promise.all(
      Array.from(this.providers.values()).map(async provider => {
        const available = await provider.isAvailable();
        return available ? provider : null;
      })
    ).then(results => results.filter(provider => provider !== null) as AIProvider[]);
  }

  public async refreshProviders(): Promise<void> {
    // Reload models for all providers
    const refreshPromises = Array.from(this.providers.values()).map(async provider => {
      try {
        await provider.loadModels();
      } catch (error) {
        console.warn(`Failed to refresh provider ${provider.name}:`, error);
      }
    });

    await Promise.all(refreshPromises);
  }

  public getSystemStatus(): Promise<any> {
    return Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        const available = await provider.isAvailable();
        const capabilities = provider.getCapabilities();
        const models = provider.models;

        return {
          name,
          available,
          modelCount: models.length,
          models: models.map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            contextWindow: m.contextWindow
          })),
          capabilities: {
            maxConcurrentRequests: capabilities.maxConcurrentRequests,
            features: capabilities.features
          }
        };
      })
    ).then(statuses => ({
      totalProviders: this.providers.size,
      availableProviders: statuses.filter(s => s.available).length,
      totalModels: statuses.reduce((sum, s) => sum + s.modelCount, 0),
      providers: statuses
    }));
  }

  public async installModel(framework: string, modelName: string): Promise<boolean> {
    const provider = this.providers.get(framework);
    if (!provider) {
      throw new Error(`Provider ${framework} not available`);
    }

    switch (framework) {
      case 'ollama':
        const ollama = provider as OllamaProvider;
        return await ollama.pullModel(modelName);
      
      case 'huggingface':
        const hf = provider as HuggingFaceProvider;
        return await hf.loadModel(modelName);
      
      case 'llama-cpp':
        const llamaCpp = provider as LlamaCppProvider;
        return await llamaCpp.loadModel(modelName);
      
      default:
        throw new Error(`Model installation not supported for ${framework}`);
    }
  }

  public async uninstallModel(framework: string, modelName: string): Promise<boolean> {
    const provider = this.providers.get(framework);
    if (!provider) {
      throw new Error(`Provider ${framework} not available`);
    }

    switch (framework) {
      case 'ollama':
        const ollama = provider as OllamaProvider;
        return await ollama.deleteModel(modelName);
      
      case 'huggingface':
        const hf = provider as HuggingFaceProvider;
        return await hf.unloadModel();
      
      case 'llama-cpp':
        const llamaCpp = provider as LlamaCppProvider;
        await llamaCpp.unloadModel();
        return true;
      
      default:
        throw new Error(`Model uninstallation not supported for ${framework}`);
    }
  }

  public getRecommendedModels(): Array<{
    framework: string;
    modelName: string;
    description: string;
    size: string;
    useCase: string;
  }> {
    return [
      {
        framework: 'ollama',
        modelName: 'codellama:7b',
        description: 'Code Llama 7B - Fast code generation',
        size: '3.8GB',
        useCase: 'General code assistance'
      },
      {
        framework: 'ollama',
        modelName: 'deepseek-coder:6.7b',
        description: 'DeepSeek Coder - Excellent for code tasks',
        size: '3.7GB',
        useCase: 'Code generation and debugging'
      },
      {
        framework: 'ollama',
        modelName: 'llama3:8b',
        description: 'Llama 3 8B - General purpose model',
        size: '4.7GB',
        useCase: 'General chat and explanation'
      },
      {
        framework: 'huggingface',
        modelName: 'microsoft/DialoGPT-medium',
        description: 'DialoGPT Medium - Conversational AI',
        size: '350MB',
        useCase: 'Chat and conversation'
      },
      {
        framework: 'huggingface',
        modelName: 'Salesforce/codegen-350M-mono',
        description: 'CodeGen 350M - Lightweight code model',
        size: '350MB',
        useCase: 'Fast code completion'
      }
    ];
  }
}

