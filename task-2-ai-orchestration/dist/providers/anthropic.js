"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const base_1 = require("./base");
class AnthropicProvider extends base_1.BaseAIProvider {
    constructor(config) {
        super('anthropic', 'cloud', config);
        this.client = new sdk_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000
        });
        this.loadModels();
    }
    async isAvailable() {
        try {
            // Test with a minimal request
            await this.client.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }]
            });
            return true;
        }
        catch (error) {
            console.error('Anthropic provider not available:', error);
            return false;
        }
    }
    async loadModels() {
        this.models = [
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                provider: 'anthropic',
                type: 'chat',
                capabilities: {
                    languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
                    tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'optimization', 'general_chat'],
                    maxTokens: 4096,
                    supportsStreaming: true,
                    supportsImages: true,
                    supportsCode: true
                },
                contextWindow: 200000,
                costPerToken: 0.000015,
                performance: {
                    averageResponseTime: 3000,
                    reliability: 0.99,
                    accuracy: 0.96,
                    throughput: 80
                }
            },
            {
                id: 'claude-3-sonnet-20240229',
                name: 'Claude 3 Sonnet',
                provider: 'anthropic',
                type: 'chat',
                capabilities: {
                    languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
                    tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'optimization', 'general_chat'],
                    maxTokens: 4096,
                    supportsStreaming: true,
                    supportsImages: true,
                    supportsCode: true
                },
                contextWindow: 200000,
                costPerToken: 0.000003,
                performance: {
                    averageResponseTime: 2000,
                    reliability: 0.98,
                    accuracy: 0.94,
                    throughput: 100
                }
            },
            {
                id: 'claude-3-haiku-20240307',
                name: 'Claude 3 Haiku',
                provider: 'anthropic',
                type: 'chat',
                capabilities: {
                    languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
                    tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'general_chat'],
                    maxTokens: 4096,
                    supportsStreaming: true,
                    supportsImages: true,
                    supportsCode: true
                },
                contextWindow: 200000,
                costPerToken: 0.00000025,
                performance: {
                    averageResponseTime: 800,
                    reliability: 0.97,
                    accuracy: 0.90,
                    throughput: 200
                }
            }
        ];
    }
    async sendRequest(request) {
        this.validateRequest(request);
        const startTime = Date.now();
        const model = request.model || 'claude-3-sonnet-20240229';
        try {
            const messages = this.buildMessages(request);
            const systemPrompt = this.getSystemPrompt(request.type);
            const response = await this.client.messages.create({
                model,
                max_tokens: request.options?.maxTokens || 4096,
                temperature: request.options?.temperature || 0.7,
                system: systemPrompt,
                messages,
                stream: request.options?.stream || false
            });
            const responseTime = Date.now() - startTime;
            const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
            const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
            return this.createResponse(request.id, content, model, tokensUsed, responseTime);
        }
        catch (error) {
            throw this.createError('REQUEST_FAILED', `Anthropic request failed: ${error.message}`, error.status >= 500);
        }
    }
    getCapabilities() {
        return {
            maxConcurrentRequests: 50,
            supportedModels: this.models.map(m => m.id),
            features: ['streaming', 'vision', 'large_context', 'system_prompts'],
            rateLimits: [
                { requests: 1000, window: 60 }, // 1000 requests per minute
                { requests: 5000, window: 3600 } // 5000 requests per hour
            ]
        };
    }
    buildMessages(request) {
        const messages = [];
        // Add context if available
        if (request.context && request.context.files.length > 0) {
            const contextContent = this.buildContextContent(request.context);
            if (contextContent) {
                messages.push({ role: 'user', content: `Context:\n${contextContent}` });
                messages.push({ role: 'assistant', content: 'I understand the context. How can I help you?' });
            }
        }
        // Add main user message
        messages.push({ role: 'user', content: request.content });
        return messages;
    }
    getSystemPrompt(type) {
        const prompts = {
            'code_generation': 'You are Claude, an expert software developer. Generate clean, efficient, and well-documented code. Follow best practices and explain your approach.',
            'code_explanation': 'You are Claude, an expert code reviewer. Explain code clearly and thoroughly, breaking down complex concepts into understandable parts.',
            'code_refactoring': 'You are Claude, an expert software architect. Refactor code to improve quality, performance, and maintainability while preserving functionality.',
            'bug_fixing': 'You are Claude, an expert debugger. Identify and fix bugs systematically, explaining the root cause and prevention strategies.',
            'documentation': 'You are Claude, a technical writer. Create clear, comprehensive documentation that helps developers understand and use the code effectively.',
            'testing': 'You are Claude, a QA engineer. Write comprehensive tests that cover edge cases and ensure code reliability.',
            'optimization': 'You are Claude, a performance engineer. Optimize code for speed, memory usage, and efficiency while maintaining readability.',
            'general_chat': 'You are Claude, a helpful AI assistant specialized in software development. Provide accurate, helpful responses.'
        };
        return prompts[type] || prompts['general_chat'];
    }
    buildContextContent(context) {
        let content = '';
        if (context.currentFile) {
            content += `Current file: ${context.currentFile}\n`;
        }
        if (context.selection) {
            content += `Selected text:\n${context.selection.text}\n\n`;
        }
        if (context.files && context.files.length > 0) {
            content += 'Relevant files:\n';
            context.files.slice(0, 5).forEach((file) => {
                content += `\n--- ${file.path} ---\n`;
                content += file.content?.substring(0, 1000) || 'No content available';
                content += '\n';
            });
        }
        if (context.gitInfo) {
            content += `\nGit context: Branch ${context.gitInfo.branch}, Commit ${context.gitInfo.commit}\n`;
        }
        return content;
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropic.js.map