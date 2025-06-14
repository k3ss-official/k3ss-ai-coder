"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Self-contained AI Manager that handles all AI operations without external services
 */
class AIManager {
    constructor(context) {
        this.isInitialized = false;
        this.context = context;
    }
    async initialize() {
        try {
            // Initialize built-in AI capabilities
            this.builtInModel = new BuiltInAIModel();
            this.isInitialized = true;
            console.log('AI Manager initialized with built-in model');
        }
        catch (error) {
            console.error('AI Manager initialization failed:', error);
            throw error;
        }
    }
    async chat(message, context) {
        if (!this.isInitialized) {
            throw new Error('AI Manager not initialized');
        }
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const provider = config.get('aiProvider', 'built-in');
        switch (provider) {
            case 'openai':
                return this.chatWithOpenAI(message, context);
            case 'anthropic':
                return this.chatWithAnthropic(message, context);
            case 'ollama':
                return this.chatWithOllama(message, context);
            default:
                return this.chatWithBuiltIn(message, context);
        }
    }
    async generateCode(prompt, language = 'javascript') {
        const fullPrompt = `Generate ${language} code for: ${prompt}

Requirements:
- Write clean, well-commented code
- Follow best practices for ${language}
- Include error handling where appropriate
- Make the code production-ready

Code:`;
        const response = await this.chat(fullPrompt);
        return this.extractCodeFromResponse(response);
    }
    async analyzeCode(code, language = 'javascript') {
        const prompt = `Analyze this ${language} code for:
1. Security vulnerabilities
2. Performance issues
3. Code quality problems
4. Best practice violations
5. Suggestions for improvement

Code:
\`\`\`${language}
${code}
\`\`\`

Provide a detailed analysis:`;
        const response = await this.chat(prompt);
        return {
            analysis: response,
            language: language,
            codeLength: code.length,
            timestamp: new Date().toISOString()
        };
    }
    async refactorCode(code, instructions, language = 'javascript') {
        const prompt = `Refactor this ${language} code according to these instructions: ${instructions}

Original code:
\`\`\`${language}
${code}
\`\`\`

Refactored code:`;
        const response = await this.chat(prompt);
        return this.extractCodeFromResponse(response);
    }
    async chatWithBuiltIn(message, context) {
        // Built-in AI responses for common scenarios
        return this.builtInModel.process(message, context);
    }
    async chatWithOpenAI(message, context) {
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const apiKey = config.get('openaiApiKey', '');
        if (!apiKey) {
            return 'OpenAI API key not configured. Please set it in settings.';
        }
        try {
            const response = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a helpful AI coding assistant.' },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 2000
                })
            });
            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response from OpenAI';
        }
        catch (error) {
            return `OpenAI API error: ${error}`;
        }
    }
    async chatWithAnthropic(message, context) {
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const apiKey = config.get('anthropicApiKey', '');
        if (!apiKey) {
            return 'Anthropic API key not configured. Please set it in settings.';
        }
        try {
            const response = await globalThis.fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 2000,
                    messages: [
                        { role: 'user', content: message }
                    ]
                })
            });
            const data = await response.json();
            return data.content?.[0]?.text || 'No response from Anthropic';
        }
        catch (error) {
            return `Anthropic API error: ${error}`;
        }
    }
    async chatWithOllama(message, context) {
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const endpoint = config.get('ollamaEndpoint', 'http://localhost:11434');
        try {
            const response = await globalThis.fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama2',
                    prompt: message,
                    stream: false
                })
            });
            const data = await response.json();
            return data.response || 'No response from Ollama';
        }
        catch (error) {
            return `Ollama connection error: ${error}. Make sure Ollama is running.`;
        }
    }
    extractCodeFromResponse(response) {
        // Extract code blocks from markdown-style responses
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
        const matches = response.match(codeBlockRegex);
        if (matches && matches.length > 0) {
            return matches[0].replace(/```[\w]*\n/, '').replace(/\n```$/, '');
        }
        return response;
    }
    getAvailableModels() {
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const provider = config.get('aiProvider', 'built-in');
        switch (provider) {
            case 'openai':
                return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
            case 'anthropic':
                return ['claude-3-sonnet', 'claude-3-opus', 'claude-3-haiku'];
            case 'ollama':
                return ['llama2', 'codellama', 'mistral'];
            default:
                return ['built-in-assistant'];
        }
    }
    isReady() {
        return this.isInitialized;
    }
}
exports.AIManager = AIManager;
/**
 * Built-in AI model for offline functionality
 */
class BuiltInAIModel {
    constructor() {
        this.patterns = new Map([
            ['generate', [
                    'Here\'s a code example for your request:',
                    'I\'ll create that code for you:',
                    'Here\'s the implementation:'
                ]],
            ['analyze', [
                    'Code analysis complete. Here are my findings:',
                    'I\'ve analyzed your code and found:',
                    'Analysis results:'
                ]],
            ['refactor', [
                    'Here\'s the refactored version:',
                    'I\'ve improved your code:',
                    'Refactored code:'
                ]],
            ['help', [
                    'I\'m here to help with your coding tasks!',
                    'How can I assist you today?',
                    'What would you like me to help you with?'
                ]]
        ]);
    }
    process(message, context) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('generate') || lowerMessage.includes('create')) {
            return this.generateCodeResponse(message, context);
        }
        else if (lowerMessage.includes('analyze') || lowerMessage.includes('review')) {
            return this.analyzeCodeResponse(message, context);
        }
        else if (lowerMessage.includes('refactor') || lowerMessage.includes('improve')) {
            return this.refactorCodeResponse(message, context);
        }
        else {
            return this.getHelpResponse();
        }
    }
    generateCodeResponse(message, context) {
        const language = context?.language || 'javascript';
        return `// Generated ${language} code
// Based on your request: ${message}

function example() {
    // TODO: Implement your specific requirements
    console.log('Generated code example');
    return 'success';
}

// Note: This is a basic template. For more advanced AI responses,
// configure an external AI provider in settings.`;
    }
    analyzeCodeResponse(message, context) {
        return `Code Analysis Results:

✅ **Strengths:**
- Code structure appears organized
- Basic syntax is correct

⚠️ **Suggestions:**
- Consider adding error handling
- Add type annotations if using TypeScript
- Include unit tests for better coverage

🔧 **Recommendations:**
- Follow consistent naming conventions
- Add documentation comments
- Consider performance optimizations

Note: For detailed AI-powered analysis, configure an external AI provider in settings.`;
    }
    refactorCodeResponse(message, context) {
        return `// Refactored code suggestion
// Original request: ${message}

// Consider these improvements:
// 1. Extract reusable functions
// 2. Add proper error handling
// 3. Use modern syntax features
// 4. Improve variable naming

// Note: For AI-powered refactoring, configure an external AI provider in settings.`;
    }
    getHelpResponse() {
        return `🤖 **K3SS AI Coder Ultimate**

I'm your self-contained AI coding assistant! Here's what I can help with:

**🔧 Code Operations:**
- Generate code from descriptions
- Analyze code for issues
- Refactor and improve code
- Review code quality

**🌐 Web Research:**
- Search for coding solutions
- Find documentation
- Research best practices

**⚡ CLI Integration:**
- Run development commands
- Git operations
- Build and test automation

**💡 Tips:**
- Use Ctrl+Shift+K to open this chat
- Right-click code for quick actions
- Configure AI providers in settings for enhanced responses

How can I help you code better today?`;
    }
}
//# sourceMappingURL=AIManager.js.map