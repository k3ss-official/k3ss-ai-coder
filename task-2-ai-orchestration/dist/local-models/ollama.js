"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const base_1 = require("../providers/base");
class OllamaProvider extends base_1.BaseAIProvider {
    constructor(config) {
        super('ollama', 'local', config);
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.timeout = config.timeout || 60000;
        this.loadModels();
    }
    async isAvailable() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        }
        catch (error) {
            console.error('Ollama not available:', error);
            return false;
        }
    }
    async loadModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                console.warn('Could not load Ollama models');
                return;
            }
            const data = await response.json();
            this.models = data.models?.map((model) => this.mapOllamaModel(model)) || [];
        }
        catch (error) {
            console.error('Error loading Ollama models:', error);
            this.models = [];
        }
    }
    async sendRequest(request) {
        this.validateRequest(request);
        const startTime = Date.now();
        const model = request.model || this.getDefaultModel();
        if (!model) {
            throw this.createError('NO_MODEL', 'No Ollama models available');
        }
        try {
            const prompt = this.buildPrompt(request);
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: request.options?.temperature || 0.7,
                        top_p: request.options?.topP || 1,
                        top_k: 40,
                        num_predict: request.options?.maxTokens || 2048
                    }
                }),
                signal: AbortSignal.timeout(this.timeout)
            });
            if (!response.ok) {
                throw new Error(`Ollama request failed: ${response.statusText}`);
            }
            const data = await response.json();
            const responseTime = Date.now() - startTime;
            // Estimate tokens (Ollama doesn't provide exact counts)
            const tokensUsed = this.estimateTokens(prompt + data.response);
            return this.createResponse(request.id, data.response, model, tokensUsed, responseTime);
        }
        catch (error) {
            throw this.createError('REQUEST_FAILED', `Ollama request failed: ${error.message}`, true);
        }
    }
    getCapabilities() {
        return {
            maxConcurrentRequests: 10, // Local models typically handle fewer concurrent requests
            supportedModels: this.models.map(m => m.id),
            features: ['local_execution', 'no_api_key', 'privacy'],
            rateLimits: [] // No rate limits for local models
        };
    }
    async pullModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: modelName
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to pull model: ${response.statusText}`);
            }
            // Reload models after pulling
            await this.loadModels();
            return true;
        }
        catch (error) {
            console.error('Error pulling Ollama model:', error);
            return false;
        }
    }
    async deleteModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: modelName
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to delete model: ${response.statusText}`);
            }
            // Reload models after deletion
            await this.loadModels();
            return true;
        }
        catch (error) {
            console.error('Error deleting Ollama model:', error);
            return false;
        }
    }
    async getModelInfo(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: modelName
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to get model info: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error getting Ollama model info:', error);
            return null;
        }
    }
    mapOllamaModel(ollamaModel) {
        const isCodeModel = this.isCodeModel(ollamaModel.name);
        const contextWindow = this.getContextWindow(ollamaModel.name);
        return {
            id: ollamaModel.name,
            name: ollamaModel.name,
            provider: 'ollama',
            type: 'chat',
            capabilities: {
                languages: isCodeModel
                    ? ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby']
                    : ['text'],
                tasks: isCodeModel
                    ? ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'general_chat']
                    : ['general_chat'],
                maxTokens: 2048,
                supportsStreaming: true,
                supportsImages: ollamaModel.name.includes('vision') || ollamaModel.name.includes('llava'),
                supportsCode: isCodeModel
            },
            contextWindow,
            performance: {
                averageResponseTime: 5000, // Local models are typically slower
                reliability: 0.95,
                accuracy: this.getModelAccuracy(ollamaModel.name),
                throughput: 20
            }
        };
    }
    isCodeModel(modelName) {
        const codeModels = ['codellama', 'codegemma', 'starcoder', 'deepseek-coder', 'phind-codellama'];
        return codeModels.some(name => modelName.toLowerCase().includes(name));
    }
    getContextWindow(modelName) {
        // Common context windows for popular models
        if (modelName.includes('llama2'))
            return 4096;
        if (modelName.includes('llama3'))
            return 8192;
        if (modelName.includes('codellama'))
            return 16384;
        if (modelName.includes('mistral'))
            return 8192;
        if (modelName.includes('gemma'))
            return 8192;
        return 4096; // Default
    }
    getModelAccuracy(modelName) {
        // Rough accuracy estimates based on model type
        if (modelName.includes('70b'))
            return 0.92;
        if (modelName.includes('34b'))
            return 0.88;
        if (modelName.includes('13b'))
            return 0.85;
        if (modelName.includes('7b'))
            return 0.82;
        return 0.80; // Default for smaller models
    }
    getDefaultModel() {
        if (this.models.length === 0)
            return null;
        // Prefer code models if available
        const codeModel = this.models.find(m => this.isCodeModel(m.id));
        if (codeModel)
            return codeModel.id;
        // Otherwise return the first available model
        return this.models[0].id;
    }
    buildPrompt(request) {
        let prompt = '';
        // Add system-like instruction
        const systemInstruction = this.getSystemInstruction(request.type);
        if (systemInstruction) {
            prompt += `${systemInstruction}\n\n`;
        }
        // Add context if available
        if (request.context && request.context.files.length > 0) {
            const contextContent = this.buildContextContent(request.context);
            if (contextContent) {
                prompt += `Context:\n${contextContent}\n\n`;
            }
        }
        // Add main user request
        prompt += `User: ${request.content}\n\nAssistant:`;
        return prompt;
    }
    getSystemInstruction(type) {
        const instructions = {
            'code_generation': 'You are an expert software developer. Generate clean, efficient, and well-documented code.',
            'code_explanation': 'You are an expert code reviewer. Explain code clearly and thoroughly.',
            'code_refactoring': 'You are an expert software architect. Refactor code to improve quality and maintainability.',
            'bug_fixing': 'You are an expert debugger. Identify and fix bugs while explaining the root cause.',
            'documentation': 'You are a technical writer. Create clear, comprehensive documentation.',
            'testing': 'You are a QA engineer. Write comprehensive tests.',
            'optimization': 'You are a performance engineer. Optimize code for speed and efficiency.',
            'general_chat': 'You are a helpful AI assistant specialized in software development.'
        };
        return instructions[type] || instructions['general_chat'];
    }
    buildContextContent(context) {
        let content = '';
        if (context.currentFile) {
            content += `Current file: ${context.currentFile}\n`;
        }
        if (context.selection) {
            content += `Selected code:\n\`\`\`\n${context.selection.text}\n\`\`\`\n`;
        }
        if (context.files && context.files.length > 0) {
            content += '\nRelevant files:\n';
            context.files.slice(0, 2).forEach((file, index) => {
                content += `\n${index + 1}. ${file.path}:\n\`\`\`${file.language || ''}\n`;
                content += file.content?.substring(0, 500) || 'No content available';
                content += '\n```\n';
            });
        }
        return content;
    }
    estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollama.js.map