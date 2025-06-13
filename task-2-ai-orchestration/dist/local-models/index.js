"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalModelManager = exports.HuggingFaceProvider = exports.LMStudioProvider = exports.LlamaCppProvider = exports.OllamaProvider = void 0;
// Local model exports
var ollama_1 = require("./ollama");
Object.defineProperty(exports, "OllamaProvider", { enumerable: true, get: function () { return ollama_1.OllamaProvider; } });
var llama_cpp_1 = require("./llama-cpp");
Object.defineProperty(exports, "LlamaCppProvider", { enumerable: true, get: function () { return llama_cpp_1.LlamaCppProvider; } });
var lm_studio_1 = require("./lm-studio");
Object.defineProperty(exports, "LMStudioProvider", { enumerable: true, get: function () { return lm_studio_1.LMStudioProvider; } });
var huggingface_1 = require("./huggingface");
Object.defineProperty(exports, "HuggingFaceProvider", { enumerable: true, get: function () { return huggingface_1.HuggingFaceProvider; } });
const ollama_2 = require("./ollama");
const llama_cpp_2 = require("./llama-cpp");
const lm_studio_2 = require("./lm-studio");
const huggingface_2 = require("./huggingface");
class LocalModelManager {
    constructor(config) {
        this.providers = new Map();
        this.config = config;
        this.initializeProviders();
    }
    async initializeProviders() {
        // Initialize Ollama if configured
        if (this.config.ollama) {
            try {
                const ollama = new ollama_2.OllamaProvider(this.config.ollama);
                if (await ollama.isAvailable()) {
                    this.providers.set('ollama', ollama);
                    console.log('Ollama provider initialized');
                }
            }
            catch (error) {
                console.warn('Failed to initialize Ollama provider:', error);
            }
        }
        // Initialize llama.cpp if configured
        if (this.config.llamaCpp) {
            try {
                const llamaCpp = new llama_cpp_2.LlamaCppProvider(this.config.llamaCpp);
                if (await llamaCpp.isAvailable()) {
                    this.providers.set('llama-cpp', llamaCpp);
                    console.log('llama.cpp provider initialized');
                }
            }
            catch (error) {
                console.warn('Failed to initialize llama.cpp provider:', error);
            }
        }
        // Initialize LM Studio if configured
        if (this.config.lmStudio) {
            try {
                const lmStudio = new lm_studio_2.LMStudioProvider(this.config.lmStudio);
                if (await lmStudio.isAvailable()) {
                    this.providers.set('lm-studio', lmStudio);
                    console.log('LM Studio provider initialized');
                }
            }
            catch (error) {
                console.warn('Failed to initialize LM Studio provider:', error);
            }
        }
        // Initialize Hugging Face if configured
        if (this.config.huggingFace) {
            try {
                const huggingFace = new huggingface_2.HuggingFaceProvider(this.config.huggingFace);
                if (await huggingFace.isAvailable()) {
                    this.providers.set('huggingface', huggingFace);
                    console.log('Hugging Face provider initialized');
                }
            }
            catch (error) {
                console.warn('Failed to initialize Hugging Face provider:', error);
            }
        }
    }
    getProvider(name) {
        return this.providers.get(name);
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    getAvailableProviders() {
        return Promise.all(Array.from(this.providers.values()).map(async (provider) => {
            const available = await provider.isAvailable();
            return available ? provider : null;
        })).then(results => results.filter(provider => provider !== null));
    }
    async refreshProviders() {
        // Reload models for all providers
        const refreshPromises = Array.from(this.providers.values()).map(async (provider) => {
            try {
                await provider.loadModels();
            }
            catch (error) {
                console.warn(`Failed to refresh provider ${provider.name}:`, error);
            }
        });
        await Promise.all(refreshPromises);
    }
    getSystemStatus() {
        return Promise.all(Array.from(this.providers.entries()).map(async ([name, provider]) => {
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
        })).then(statuses => ({
            totalProviders: this.providers.size,
            availableProviders: statuses.filter(s => s.available).length,
            totalModels: statuses.reduce((sum, s) => sum + s.modelCount, 0),
            providers: statuses
        }));
    }
    async installModel(framework, modelName) {
        const provider = this.providers.get(framework);
        if (!provider) {
            throw new Error(`Provider ${framework} not available`);
        }
        switch (framework) {
            case 'ollama':
                const ollama = provider;
                return await ollama.pullModel(modelName);
            case 'huggingface':
                const hf = provider;
                return await hf.loadModel(modelName);
            case 'llama-cpp':
                const llamaCpp = provider;
                return await llamaCpp.loadModel(modelName);
            default:
                throw new Error(`Model installation not supported for ${framework}`);
        }
    }
    async uninstallModel(framework, modelName) {
        const provider = this.providers.get(framework);
        if (!provider) {
            throw new Error(`Provider ${framework} not available`);
        }
        switch (framework) {
            case 'ollama':
                const ollama = provider;
                return await ollama.deleteModel(modelName);
            case 'huggingface':
                const hf = provider;
                return await hf.unloadModel();
            case 'llama-cpp':
                const llamaCpp = provider;
                await llamaCpp.unloadModel();
                return true;
            default:
                throw new Error(`Model uninstallation not supported for ${framework}`);
        }
    }
    getRecommendedModels() {
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
exports.LocalModelManager = LocalModelManager;
//# sourceMappingURL=index.js.map