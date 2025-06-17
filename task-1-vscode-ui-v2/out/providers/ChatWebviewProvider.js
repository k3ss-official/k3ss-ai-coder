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
exports.ChatWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const AIManager_1 = require("../ai/AIManager");
const BrowserManager_1 = require("../browser/BrowserManager");
const CLIManager_1 = require("../cli/CLIManager");
const SecurityManager_1 = require("../security/SecurityManager");
class ChatWebviewProvider {
    constructor(_extensionUri, context) {
        this._extensionUri = _extensionUri;
        this.context = context;
        this.aiManager = new AIManager_1.AIManager(context);
        this.browserManager = new BrowserManager_1.BrowserManager(context);
        this.cliManager = new CLIManager_1.CLIManager(context);
        this.securityManager = new SecurityManager_1.SecurityManager(context);
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'chat':
                    await this.handleChatMessage(data.message, data.settings, data.history);
                    break;
                case 'saveSettings':
                    await this.saveSettings(data.settings);
                    break;
                case 'loadSettings':
                    await this.loadSettings();
                    break;
                case 'generateCode':
                    await this.handleGenerateCode(data.prompt, data.language);
                    break;
                case 'researchWeb':
                    await this.handleWebResearch(data.query);
                    break;
                case 'runCommand':
                    await this.handleRunCommand(data.command, data.args);
                    break;
            }
        });
    }
    async handleChatMessage(message, settings, history) {
        try {
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: true
            });
            let response = '';
            if (settings?.aiProvider && settings.aiProvider !== 'built-in') {
                response = await this.getAIResponse(message, settings, history || []);
            }
            else {
                response = await this.getBuiltInResponse(message, history || []);
            }
            this._view?.webview.postMessage({
                type: 'response',
                content: response,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                content: `Chat error: ${error}`
            });
        }
        finally {
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: false
            });
        }
    }
    async getAIResponse(message, settings, history) {
        const { aiProvider } = settings;
        try {
            switch (aiProvider) {
                case 'openai':
                    return await this.callOpenAI(message, settings, history);
                case 'anthropic':
                    return await this.callAnthropic(message, settings, history);
                case 'ollama':
                    return await this.callOllama(message, settings, history);
                default:
                    return await this.getBuiltInResponse(message, history);
            }
        }
        catch (error) {
            return await this.getBuiltInResponse(message, history);
        }
    }
    async callOpenAI(message, settings, history) {
        const { openaiApiKey, openaiModel = 'gpt-4', temperature = 0.7, systemPrompt } = settings;
        if (!openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }
        const messages = [
            { role: 'system', content: systemPrompt || 'You are a helpful coding assistant.' },
            ...history.slice(-5).map((h) => ({
                role: h.isUser ? 'user' : 'assistant',
                content: h.content
            })),
            { role: 'user', content: message }
        ];
        const response = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openaiModel,
                messages: messages,
                temperature: temperature,
                max_tokens: 2000
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response from OpenAI';
    }
    async callAnthropic(message, settings, history) {
        const { anthropicApiKey, anthropicModel = 'claude-3-sonnet-20240229', temperature = 0.7, systemPrompt } = settings;
        if (!anthropicApiKey) {
            throw new Error('Anthropic API key not configured');
        }
        const messages = [
            ...history.slice(-5).map((h) => ({
                role: h.isUser ? 'user' : 'assistant',
                content: h.content
            })),
            { role: 'user', content: message }
        ];
        const response = await globalThis.fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': anthropicApiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: anthropicModel,
                max_tokens: 2000,
                temperature: temperature,
                system: systemPrompt || 'You are a helpful coding assistant.',
                messages: messages
            })
        });
        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.content[0]?.text || 'No response from Anthropic';
    }
    async callOllama(message, settings, history) {
        const { ollamaEndpoint = 'http://localhost:11434', ollamaModel = 'llama2', temperature = 0.7, systemPrompt } = settings;
        const messages = [
            { role: 'system', content: systemPrompt || 'You are a helpful coding assistant.' },
            ...history.slice(-5).map((h) => ({
                role: h.isUser ? 'user' : 'assistant',
                content: h.content
            })),
            { role: 'user', content: message }
        ];
        const response = await globalThis.fetch(`${ollamaEndpoint}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: ollamaModel,
                messages: messages,
                options: {
                    temperature: temperature
                },
                stream: false
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.message?.content || 'No response from Ollama';
    }
    async getBuiltInResponse(message, history) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('write')) {
            if (lowerMessage.includes('function')) {
                return this.generateCodeExample('function', message);
            }
            else if (lowerMessage.includes('class')) {
                return this.generateCodeExample('class', message);
            }
            else if (lowerMessage.includes('component')) {
                return this.generateCodeExample('component', message);
            }
            else {
                return this.generateCodeExample('general', message);
            }
        }
        if (lowerMessage.includes('analyze') || lowerMessage.includes('review') || lowerMessage.includes('check')) {
            return this.analyzeCode(message);
        }
        if (lowerMessage.includes('research') || lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('best')) {
            return this.performWebResearch(message);
        }
        if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
            return this.provideHelp(message);
        }
        return this.getContextualResponse(message, history);
    }
    generateCodeExample(type, request) {
        const examples = {
            function: `Here's a function example based on your request:

\`\`\`javascript
function processData(input) {
    // Validate input
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid input provided');
    }
    
    // Process the data
    const result = {
        processed: true,
        timestamp: new Date().toISOString(),
        data: input
    };
    
    return result;
}

// Usage example
const data = { name: 'example', value: 42 };
const processed = processData(data);
console.log(processed);
\`\`\`

This function includes input validation, processing logic, and returns a structured result. Would you like me to modify it for your specific use case?`,
            class: `Here's a class example:

\`\`\`typescript
class DataProcessor {
    private config: ProcessorConfig;
    
    constructor(config: ProcessorConfig) {
        this.config = config;
    }
    
    public async process(data: any[]): Promise<ProcessedData[]> {
        const results: ProcessedData[] = [];
        
        for (const item of data) {
            try {
                const processed = await this.processItem(item);
                results.push(processed);
            } catch (error) {
                console.error('Processing failed:', error);
            }
        }
        
        return results;
    }
    
    private async processItem(item: any): Promise<ProcessedData> {
        return {
            id: item.id,
            processed: true,
            result: item
        };
    }
}
\`\`\`

This class provides a structured approach to data processing with error handling and async support.`,
            component: `Here's a React component example:

\`\`\`tsx
import React, { useState, useEffect } from 'react';

interface ComponentProps {
    title: string;
    data?: any[];
    onUpdate?: (data: any) => void;
}

const DataComponent: React.FC<ComponentProps> = ({ title, data = [], onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState(data);
    
    useEffect(() => {
        setItems(data);
    }, [data]);
    
    const handleUpdate = async (newItem: any) => {
        setLoading(true);
        try {
            const updatedItems = [...items, newItem];
            setItems(updatedItems);
            onUpdate?.(updatedItems);
        } catch (error) {
            console.error('Update failed:', error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="data-component">
            <h2>{title}</h2>
            {loading && <div>Loading...</div>}
            <ul>
                {items.map((item, index) => (
                    <li key={index}>{JSON.stringify(item)}</li>
                ))}
            </ul>
        </div>
    );
};

export default DataComponent;
\`\`\`

This component includes state management, effects, and proper TypeScript typing.`,
            general: `I can help you generate code! Here's a general template:

\`\`\`javascript
function handleRequest(input) {
    // 1. Validate input
    if (!input) {
        return { error: 'Input required' };
    }
    
    // 2. Process the request
    const result = {
        success: true,
        data: input,
        timestamp: Date.now()
    };
    
    // 3. Return result
    return result;
}
\`\`\`

Could you provide more specific details about what you'd like me to generate?`
        };
        return examples[type] || examples.general;
    }
    analyzeCode(request) {
        return `## Code Analysis

I can help analyze your code for:

### 🔍 **Security Issues**
- SQL injection vulnerabilities
- XSS prevention
- Input validation
- Authentication flaws

### ⚡ **Performance**
- Algorithm efficiency
- Memory usage
- Database queries
- Caching opportunities

### 🏗️ **Code Quality**
- Design patterns
- SOLID principles
- Code organization
- Error handling

### 🧪 **Testing**
- Test coverage
- Edge cases
- Mock strategies
- Integration tests

**To analyze your code:**
1. Select the code you want analyzed
2. Right-click and choose "K3SS AI: Analyze Code"
3. Or paste your code here and I'll review it

What specific aspect would you like me to focus on?`;
    }
    performWebResearch(request) {
        return `## Web Research Results

I can help you research:

### 📚 **Documentation & Tutorials**
- Official documentation
- Best practices guides
- Tutorial resources
- Code examples

### 🔧 **Tools & Libraries**
- Framework comparisons
- Library recommendations
- Tool evaluations
- Integration guides

### 🐛 **Problem Solving**
- Error solutions
- Stack Overflow discussions
- GitHub issues
- Community solutions

### 📈 **Trends & Updates**
- Latest versions
- Breaking changes
- Migration guides
- Industry trends

**Example searches I can perform:**
- "Best React state management 2024"
- "Node.js performance optimization"
- "TypeScript migration guide"
- "Docker deployment best practices"

What would you like me to research for you?`;
    }
    provideHelp(request) {
        return `## K3SS AI Assistant Help

### 🚀 **Quick Actions**
- **Generate Code**: "Create a function that..."
- **Analyze Code**: "Review this code for issues"
- **Research**: "Find the best way to..."
- **Explain**: "How does this work?"

### 💬 **Chat Commands**
- Type naturally - I understand context
- Use \`code blocks\` for code snippets
- Ask follow-up questions
- Request specific examples

### ⚙️ **Settings**
- Click the ⚙️ button to configure
- Add API keys for enhanced responses
- Customize system instructions
- Adjust temperature and behavior

### 🔧 **Features**
- **Code Generation**: Functions, classes, components
- **Code Analysis**: Security, performance, quality
- **Web Research**: Documentation, best practices
- **CLI Integration**: Development commands
- **Security Scanning**: Vulnerability detection

### 📝 **Tips**
- Be specific in your requests
- Provide context when possible
- Use the quick action buttons
- Configure external AI providers for better responses

How can I help you with your coding today?`;
    }
    getContextualResponse(message, history) {
        const recentMessages = history.slice(-3);
        const hasCodeContext = recentMessages.some(h => h.content && h.content.includes('```'));
        const isFollowUp = message.length < 50 && (message.includes('yes') || message.includes('no') || message.includes('thanks'));
        if (isFollowUp) {
            return "I'm here to help! What would you like to work on next? I can assist with code generation, analysis, research, or any other development tasks.";
        }
        if (hasCodeContext) {
            return `I see we've been working with code. I can help you:

- **Improve** the existing code
- **Debug** any issues
- **Optimize** for performance
- **Add features** or functionality
- **Write tests** for the code
- **Document** the implementation

What would you like to do next with the code?`;
        }
        return `I understand you're asking about: "${message}"

I can help you with:

### 💻 **Development Tasks**
- Code generation and examples
- Debugging and troubleshooting
- Architecture and design patterns
- Performance optimization

### 📖 **Learning & Research**
- Explain concepts and technologies
- Find documentation and resources
- Compare tools and frameworks
- Best practices and standards

### 🛠️ **Practical Help**
- CLI commands and automation
- Configuration and setup
- Testing strategies
- Deployment guidance

Could you provide more specific details about what you're trying to accomplish?`;
    }
    async handleGenerateCode(prompt, language) {
        try {
            const code = await this.aiManager.generateCode(prompt, language);
            this._view?.webview.postMessage({
                type: 'codeGenerated',
                code: code,
                language: language
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Code generation error: ${error}`
            });
        }
    }
    async handleWebResearch(query) {
        try {
            const results = await this.browserManager.researchWeb(query);
            this._view?.webview.postMessage({
                type: 'researchResults',
                results: results
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Web research error: ${error}`
            });
        }
    }
    async handleRunCommand(command, args) {
        try {
            const result = await this.cliManager.executeCommand(command, args);
            this._view?.webview.postMessage({
                type: 'commandResult',
                result: result
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Command execution error: ${error}`
            });
        }
    }
    async saveSettings(settings) {
        try {
            const config = vscode.workspace.getConfiguration('k3ss-ai');
            for (const [key, value] of Object.entries(settings)) {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
            }
            this._view?.webview.postMessage({
                type: 'settingsSaved'
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                content: 'Failed to save settings'
            });
        }
    }
    async loadSettings() {
        try {
            const config = vscode.workspace.getConfiguration('k3ss-ai');
            const settings = {
                aiProvider: config.get('aiProvider', 'built-in'),
                temperature: config.get('temperature', 0.7),
                systemPrompt: config.get('systemPrompt', ''),
                enableWebResearch: config.get('enableWebResearch', true),
                enableCodeExecution: config.get('enableCodeExecution', true),
                openaiApiKey: config.get('openaiApiKey', ''),
                openaiModel: config.get('openaiModel', 'gpt-4'),
                anthropicApiKey: config.get('anthropicApiKey', ''),
                anthropicModel: config.get('anthropicModel', 'claude-3-sonnet-20240229'),
                ollamaEndpoint: config.get('ollamaEndpoint', 'http://localhost:11434'),
                ollamaModel: config.get('ollamaModel', 'llama2')
            };
            this._view?.webview.postMessage({
                type: 'settingsLoaded',
                settings: settings
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                content: 'Failed to load settings'
            });
        }
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K3SS AI Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-sideBar-background);
        }
        
        .title {
            font-weight: 600;
            font-size: 14px;
        }
        
        .settings-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            font-size: 16px;
        }
        
        .settings-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .message {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .message.user {
            align-items: flex-end;
        }
        
        .message.assistant {
            align-items: flex-start;
        }
        
        .message-content {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 12px;
            word-wrap: break-word;
        }
        
        .message.user .message-content {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .message.assistant .message-content {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }
        
        .message-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin: 0 16px;
        }
        
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .input-container {
            padding: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-sideBar-background);
        }
        
        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        .message-input {
            flex: 1;
            min-height: 36px;
            max-height: 120px;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: none;
            outline: none;
        }
        
        .message-input:focus {
            border-color: var(--vscode-focusBorder);
        }
        
        .send-btn {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            height: 36px;
        }
        
        .send-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .quick-actions {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        
        .quick-action {
            padding: 6px 12px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 16px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
        }
        
        .quick-action:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .settings-panel {
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--vscode-editor-background);
            z-index: 1000;
            overflow-y: auto;
        }
        
        .settings-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .settings-content {
            padding: 16px;
        }
        
        .setting-group {
            margin-bottom: 24px;
        }
        
        .setting-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .setting-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
        }
        
        .setting-select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
        }
        
        .setting-textarea {
            width: 100%;
            min-height: 80px;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            resize: vertical;
        }
        
        .setting-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        
        .save-settings-btn {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        
        .close-settings-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            font-size: 16px;
        }
        
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 8px 0;
        }
        
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        
        .copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        
        .code-block {
            position: relative;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🤖 K3SS AI Assistant</div>
        <button class="settings-btn" onclick="toggleSettings()">⚙️</button>
    </div>
    
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                <div class="message-content">
                    <strong>🤖 K3SS AI Coder Ultimate</strong><br><br>
                    I'm your intelligent coding assistant! I can help with:
                    <br><br>
                    <strong>🔧 Code Operations:</strong><br>
                    • Generate functions, classes, and components<br>
                    • Analyze code for security and performance<br>
                    • Refactor and improve existing code<br>
                    • Review code quality and best practices<br><br>
                    
                    <strong>🌐 Web Research:</strong><br>
                    • Find documentation and tutorials<br>
                    • Research best practices and solutions<br>
                    • Compare tools and frameworks<br><br>
                    
                    <strong>⚡ CLI Integration:</strong><br>
                    • Run development commands<br>
                    • Git operations and automation<br>
                    • Build and test workflows<br><br>
                    
                    <strong>💡 Tips:</strong><br>
                    • Use the quick action buttons below<br>
                    • Configure AI providers in settings (⚙️) for enhanced responses<br>
                    • Ask specific questions for better results<br><br>
                    
                    How can I help you code better today?
                </div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            🤖 AI is thinking...
        </div>
        
        <div class="input-container">
            <div class="quick-actions">
                <button class="quick-action" onclick="quickAction('Help')">❓ Help</button>
                <button class="quick-action" onclick="quickAction('Generate')">🔧 Generate</button>
                <button class="quick-action" onclick="quickAction('Analyze')">🔍 Analyze</button>
                <button class="quick-action" onclick="quickAction('Research')">🌐 Research</button>
            </div>
            <div class="input-wrapper">
                <textarea 
                    id="messageInput" 
                    class="message-input" 
                    placeholder="Ask me anything about coding..."
                    rows="1"
                ></textarea>
                <button id="sendBtn" class="send-btn" onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>
    
    <div class="settings-panel" id="settingsPanel">
        <div class="settings-header">
            <h3>⚙️ Settings</h3>
            <button class="close-settings-btn" onclick="toggleSettings()">✕</button>
        </div>
        <div class="settings-content">
            <div class="setting-group">
                <label class="setting-label">AI Provider</label>
                <select id="aiProvider" class="setting-select">
                    <option value="built-in">Built-in (Offline)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="ollama">Ollama (Local)</option>
                </select>
                <div class="setting-description">Choose your AI provider. Built-in works offline with intelligent responses.</div>
            </div>
            
            <div class="setting-group">
                <label class="setting-label">System Instructions</label>
                <textarea id="systemPrompt" class="setting-textarea" placeholder="You are a helpful coding assistant..."></textarea>
                <div class="setting-description">Custom instructions for the AI assistant behavior.</div>
            </div>
            
            <div class="setting-group">
                <label class="setting-label">Temperature</label>
                <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.7" class="setting-input">
                <div class="setting-description">Controls creativity (0 = focused, 1 = creative). Current: <span id="tempValue">0.7</span></div>
            </div>
            
            <div class="setting-group" id="openaiSettings" style="display: none;">
                <label class="setting-label">OpenAI API Key</label>
                <input type="password" id="openaiApiKey" class="setting-input" placeholder="sk-...">
                <div class="setting-description">Your OpenAI API key for GPT models.</div>
                
                <label class="setting-label" style="margin-top: 12px;">OpenAI Model</label>
                <select id="openaiModel" class="setting-select">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
            </div>
            
            <div class="setting-group" id="anthropicSettings" style="display: none;">
                <label class="setting-label">Anthropic API Key</label>
                <input type="password" id="anthropicApiKey" class="setting-input" placeholder="sk-ant-...">
                <div class="setting-description">Your Anthropic API key for Claude models.</div>
                
                <label class="setting-label" style="margin-top: 12px;">Claude Model</label>
                <select id="anthropicModel" class="setting-select">
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                </select>
            </div>
            
            <div class="setting-group" id="ollamaSettings" style="display: none;">
                <label class="setting-label">Ollama Endpoint</label>
                <input type="text" id="ollamaEndpoint" class="setting-input" value="http://localhost:11434" placeholder="http://localhost:11434">
                <div class="setting-description">Your local Ollama server endpoint.</div>
                
                <label class="setting-label" style="margin-top: 12px;">Ollama Model</label>
                <input type="text" id="ollamaModel" class="setting-input" value="llama2" placeholder="llama2">
                <div class="setting-description">The Ollama model to use (e.g., llama2, codellama, mistral).</div>
            </div>
            
            <button class="save-settings-btn" onclick="saveSettings()">Save Settings</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let chatHistory = [];
        let currentSettings = {};

        // Load settings on startup
        vscode.postMessage({ type: 'loadSettings' });

        function toggleSettings() {
            const panel = document.getElementById('settingsPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        function quickAction(action) {
            const input = document.getElementById('messageInput');
            const prompts = {
                'Help': 'How can you help me with coding?',
                'Generate': 'Generate a function that ',
                'Analyze': 'Analyze this code for issues: ',
                'Research': 'Research the best way to '
            };
            input.value = prompts[action] || '';
            input.focus();
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            addMessage(message, true);
            input.value = '';
            
            showTyping(true);
            
            vscode.postMessage({
                type: 'chat',
                message: message,
                settings: currentSettings,
                history: chatHistory
            });
        }

        function addMessage(content, isUser = false) {
            const messagesContainer = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user' : 'assistant'}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            if (isUser) {
                contentDiv.textContent = content;
            } else {
                contentDiv.innerHTML = formatMessage(content);
            }
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = new Date().toLocaleTimeString();
            
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(timeDiv);
            messagesContainer.appendChild(messageDiv);
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            chatHistory.push({
                content: content,
                isUser: isUser,
                timestamp: new Date().toISOString()
            });
        }

        function formatMessage(content) {
            // Convert markdown-style code blocks to HTML
            content = content.replace(/\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g, (match, lang, code) => {
                return \`<div class="code-block"><pre><code>\${escapeHtml(code.trim())}</code></pre><button class="copy-btn" onclick="copyCode(this)">Copy</button></div>\`;
            });
            
            // Convert inline code
            content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            
            // Convert line breaks
            content = content.replace(/\n/g, '<br>');
            
            return content;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function copyCode(button) {
            const codeBlock = button.parentElement.querySelector('code');
            navigator.clipboard.writeText(codeBlock.textContent);
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = 'Copy', 2000);
        }

        function showTyping(show) {
            const indicator = document.getElementById('typingIndicator');
            indicator.style.display = show ? 'block' : 'none';
        }

        function saveSettings() {
            const settings = {
                aiProvider: document.getElementById('aiProvider').value,
                systemPrompt: document.getElementById('systemPrompt').value,
                temperature: parseFloat(document.getElementById('temperature').value),
                openaiApiKey: document.getElementById('openaiApiKey').value,
                openaiModel: document.getElementById('openaiModel').value,
                anthropicApiKey: document.getElementById('anthropicApiKey').value,
                anthropicModel: document.getElementById('anthropicModel').value,
                ollamaEndpoint: document.getElementById('ollamaEndpoint').value,
                ollamaModel: document.getElementById('ollamaModel').value
            };
            
            currentSettings = settings;
            vscode.postMessage({ type: 'saveSettings', settings: settings });
        }

        // Event listeners
        document.getElementById('messageInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        document.getElementById('aiProvider').addEventListener('change', function() {
            const provider = this.value;
            document.getElementById('openaiSettings').style.display = provider === 'openai' ? 'block' : 'none';
            document.getElementById('anthropicSettings').style.display = provider === 'anthropic' ? 'block' : 'none';
            document.getElementById('ollamaSettings').style.display = provider === 'ollama' ? 'block' : 'none';
        });

        document.getElementById('temperature').addEventListener('input', function() {
            document.getElementById('tempValue').textContent = this.value;
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'response':
                    showTyping(false);
                    addMessage(message.content, false);
                    break;
                case 'error':
                    showTyping(false);
                    addMessage(\`❌ Error: \${message.content}\`, false);
                    break;
                case 'typing':
                    showTyping(message.isTyping);
                    break;
                case 'settingsLoaded':
                    currentSettings = message.settings;
                    loadSettingsToUI(message.settings);
                    break;
                case 'settingsSaved':
                    // Show success message or close settings
                    break;
            }
        });

        function loadSettingsToUI(settings) {
            document.getElementById('aiProvider').value = settings.aiProvider || 'built-in';
            document.getElementById('systemPrompt').value = settings.systemPrompt || '';
            document.getElementById('temperature').value = settings.temperature || 0.7;
            document.getElementById('tempValue').textContent = settings.temperature || 0.7;
            document.getElementById('openaiApiKey').value = settings.openaiApiKey || '';
            document.getElementById('openaiModel').value = settings.openaiModel || 'gpt-4';
            document.getElementById('anthropicApiKey').value = settings.anthropicApiKey || '';
            document.getElementById('anthropicModel').value = settings.anthropicModel || 'claude-3-sonnet-20240229';
            document.getElementById('ollamaEndpoint').value = settings.ollamaEndpoint || 'http://localhost:11434';
            document.getElementById('ollamaModel').value = settings.ollamaModel || 'llama2';
            
            // Trigger provider change to show/hide relevant settings
            document.getElementById('aiProvider').dispatchEvent(new Event('change'));
        }
    </script>
</body>
</html>`;
    }
}
exports.ChatWebviewProvider = ChatWebviewProvider;
ChatWebviewProvider.viewType = 'k3ss-ai-chat';
//# sourceMappingURL=ChatWebviewProvider.js.map