"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAIProvider = void 0;
const generative_ai_1 = require("@google/generative-ai");
const base_1 = require("./base");
class GoogleAIProvider extends base_1.BaseAIProvider {
    constructor(config) {
        super('google', 'cloud', config);
        this.client = new generative_ai_1.GoogleGenerativeAI(config.apiKey || '');
        this.loadModels();
    }
    async isAvailable() {
        try {
            const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
            await model.generateContent('test');
            return true;
        }
        catch (error) {
            console.error('Google AI provider not available:', error);
            return false;
        }
    }
    async loadModels() {
        this.models = [
            {
                id: 'gemini-pro',
                name: 'Gemini Pro',
                provider: 'google',
                type: 'chat',
                capabilities: {
                    languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
                    tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'optimization', 'general_chat'],
                    maxTokens: 8192,
                    supportsStreaming: true,
                    supportsImages: false,
                    supportsCode: true
                },
                contextWindow: 32768,
                costPerToken: 0.0000005,
                performance: {
                    averageResponseTime: 1500,
                    reliability: 0.97,
                    accuracy: 0.91,
                    throughput: 120
                }
            },
            {
                id: 'gemini-pro-vision',
                name: 'Gemini Pro Vision',
                provider: 'google',
                type: 'multimodal',
                capabilities: {
                    languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
                    tasks: ['code_generation', 'code_explanation', 'documentation', 'general_chat'],
                    maxTokens: 8192,
                    supportsStreaming: true,
                    supportsImages: true,
                    supportsCode: true
                },
                contextWindow: 32768,
                costPerToken: 0.0000005,
                performance: {
                    averageResponseTime: 2500,
                    reliability: 0.96,
                    accuracy: 0.89,
                    throughput: 80
                }
            },
            {
                id: 'gemini-1.5-pro',
                name: 'Gemini 1.5 Pro',
                provider: 'google',
                type: 'chat',
                capabilities: {
                    languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
                    tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'optimization', 'general_chat'],
                    maxTokens: 8192,
                    supportsStreaming: true,
                    supportsImages: true,
                    supportsCode: true
                },
                contextWindow: 1000000, // 1M tokens
                costPerToken: 0.000001,
                performance: {
                    averageResponseTime: 2000,
                    reliability: 0.98,
                    accuracy: 0.93,
                    throughput: 100
                }
            }
        ];
    }
    async sendRequest(request) {
        this.validateRequest(request);
        const startTime = Date.now();
        const modelId = request.model || 'gemini-pro';
        try {
            const model = this.client.getGenerativeModel({
                model: modelId,
                generationConfig: {
                    temperature: request.options?.temperature || 0.7,
                    maxOutputTokens: request.options?.maxTokens || 8192,
                    topP: request.options?.topP || 1
                }
            });
            const prompt = this.buildPrompt(request);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseTime = Date.now() - startTime;
            const content = response.text();
            const tokensUsed = this.estimateTokens(prompt + content);
            return this.createResponse(request.id, content, modelId, tokensUsed, responseTime);
        }
        catch (error) {
            throw this.createError('REQUEST_FAILED', `Google AI request failed: ${error.message}`, error.status >= 500);
        }
    }
    getCapabilities() {
        return {
            maxConcurrentRequests: 60,
            supportedModels: this.models.map(m => m.id),
            features: ['streaming', 'vision', 'large_context', 'function_calling'],
            rateLimits: [
                { requests: 60, window: 60 }, // 60 requests per minute
                { requests: 1000, window: 3600 } // 1000 requests per hour
            ]
        };
    }
    buildPrompt(request) {
        let prompt = '';
        // Add system-like instruction based on request type
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
        prompt += `Request: ${request.content}`;
        return prompt;
    }
    getSystemInstruction(type) {
        const instructions = {
            'code_generation': 'You are an expert software developer. Generate clean, efficient, and well-documented code following best practices.',
            'code_explanation': 'You are an expert code reviewer. Explain code clearly and thoroughly, making complex concepts easy to understand.',
            'code_refactoring': 'You are an expert software architect. Refactor code to improve quality, performance, and maintainability.',
            'bug_fixing': 'You are an expert debugger. Identify and fix bugs while explaining the root cause and prevention strategies.',
            'documentation': 'You are a technical writer. Create clear, comprehensive documentation that helps developers.',
            'testing': 'You are a QA engineer. Write comprehensive tests that cover edge cases and ensure reliability.',
            'optimization': 'You are a performance engineer. Optimize code for speed and efficiency while maintaining readability.',
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
            context.files.slice(0, 3).forEach((file, index) => {
                content += `\n${index + 1}. ${file.path}:\n\`\`\`${file.language || ''}\n`;
                content += file.content?.substring(0, 800) || 'No content available';
                content += '\n```\n';
            });
        }
        if (context.dependencies && context.dependencies.length > 0) {
            content += '\nProject dependencies:\n';
            context.dependencies.slice(0, 10).forEach((dep) => {
                content += `- ${dep.name}@${dep.version}\n`;
            });
        }
        return content;
    }
    estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }
}
exports.GoogleAIProvider = GoogleAIProvider;
//# sourceMappingURL=google.js.map