"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = exports.BaseAIProvider = void 0;
/**
 * Base abstract class for all AI providers
 * Implements common functionality and defines the interface
 */
class BaseAIProvider {
    constructor(name, type, config) {
        this.models = [];
        this.name = name;
        this.type = type;
        this.config = config;
    }
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    getModels() {
        return this.models;
    }
    getModel(modelId) {
        return this.models.find(model => model.id === modelId);
    }
    createError(code, message, retryable = false) {
        return {
            code,
            message,
            provider: this.name,
            retryable,
            details: null
        };
    }
    validateRequest(request) {
        if (!request.id) {
            throw this.createError('INVALID_REQUEST', 'Request ID is required');
        }
        if (!request.content) {
            throw this.createError('INVALID_REQUEST', 'Request content is required');
        }
        if (!request.type) {
            throw this.createError('INVALID_REQUEST', 'Request type is required');
        }
    }
    createResponse(requestId, content, model, tokensUsed, responseTime) {
        return {
            id: requestId,
            content,
            metadata: {
                tokensUsed,
                responseTime,
                model,
                provider: this.name,
                cached: false,
                quality: {
                    syntaxValid: true,
                    relevanceScore: 0.8,
                    completeness: 0.9,
                    coherence: 0.85
                }
            },
            confidence: 0.8,
            model,
            provider: this.name,
            timestamp: new Date().toISOString()
        };
    }
}
exports.BaseAIProvider = BaseAIProvider;
/**
 * Provider registry for managing all available AI providers
 */
class ProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    register(provider) {
        this.providers.set(provider.name, provider);
    }
    unregister(providerName) {
        this.providers.delete(providerName);
    }
    get(providerName) {
        return this.providers.get(providerName);
    }
    getAll() {
        return Array.from(this.providers.values());
    }
    getAvailable() {
        return Promise.all(Array.from(this.providers.values()).map(async (provider) => {
            const available = await provider.isAvailable();
            return available ? provider : null;
        })).then(results => results.filter(provider => provider !== null));
    }
    getAllModels() {
        return Array.from(this.providers.values())
            .flatMap(provider => provider.models);
    }
    findModel(modelId) {
        for (const provider of this.providers.values()) {
            const model = provider.getModel(modelId);
            if (model) {
                return { provider, model };
            }
        }
        return undefined;
    }
}
exports.ProviderRegistry = ProviderRegistry;
//# sourceMappingURL=base.js.map