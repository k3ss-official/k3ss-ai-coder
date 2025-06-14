import * as vscode from 'vscode';
import { AIManager } from '../ai/AIManager';
import { BrowserManager } from '../browser/BrowserManager';
import { CLIManager } from '../cli/CLIManager';

/**
 * Chat Webview Provider for AI interaction
 */
export class ChatWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'k3ss-ai.chatView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private aiManager: AIManager,
        private browserManager: BrowserManager,
        private cliManager: CLIManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'chat':
                    await this.handleChatMessage(data.message);
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

    private async handleChatMessage(message: string) {
        try {
            // Show typing indicator
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: true
            });

            const response = await this.aiManager.chat(message);
            
            this._view?.webview.postMessage({
                type: 'response',
                message: response,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Chat error: ${error}`
            });
        } finally {
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: false
            });
        }
    }

    private async handleGenerateCode(prompt: string, language: string) {
        try {
            const code = await this.aiManager.generateCode(prompt, language);
            
            this._view?.webview.postMessage({
                type: 'codeGenerated',
                code: code,
                language: language
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Code generation error: ${error}`
            });
        }
    }

    private async handleWebResearch(query: string) {
        try {
            const results = await this.browserManager.researchWeb(query);
            
            this._view?.webview.postMessage({
                type: 'researchResults',
                results: results
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Web research error: ${error}`
            });
        }
    }

    private async handleRunCommand(command: string, args: string[]) {
        try {
            const result = await this.cliManager.executeCommand(command, args);
            
            this._view?.webview.postMessage({
                type: 'commandResult',
                result: result
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Command execution error: ${error}`
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K3SS AI Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 90%;
        }
        
        .user-message {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
            text-align: right;
        }
        
        .ai-message {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }
        
        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            overflow-x: auto;
        }
        
        .input-container {
            display: flex;
            gap: 5px;
        }
        
        .input-field {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
        }
        
        .send-button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .send-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .typing-indicator {
            font-style: italic;
            color: var(--vscode-descriptionForeground);
            margin: 10px 0;
        }
        
        .quick-actions {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        
        .quick-action {
            padding: 4px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .quick-action:hover {
            opacity: 0.8;
        }
        
        .timestamp {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="quick-actions">
        <button class="quick-action" onclick="sendQuickMessage('Help me with coding')">💡 Help</button>
        <button class="quick-action" onclick="sendQuickMessage('Analyze my code')">🔍 Analyze</button>
        <button class="quick-action" onclick="sendQuickMessage('Generate a function')">⚡ Generate</button>
        <button class="quick-action" onclick="sendQuickMessage('Research best practices')">🌐 Research</button>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="ai-message">
            <div>🤖 <strong>K3SS AI Assistant</strong></div>
            <div>Hello! I'm your self-contained AI coding assistant. I can help you with:</div>
            <ul>
                <li>💻 Code generation and analysis</li>
                <li>🔍 Web research and documentation</li>
                <li>⚡ CLI commands and automation</li>
                <li>🛡️ Security scanning and best practices</li>
            </ul>
            <div>How can I help you today?</div>
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        </div>
    </div>
    
    <div class="typing-indicator" id="typingIndicator" style="display: none;">
        AI is thinking...
    </div>
    
    <div class="input-container">
        <input type="text" id="messageInput" class="input-field" placeholder="Ask me anything about coding..." />
        <button id="sendButton" class="send-button">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const typingIndicator = document.getElementById('typingIndicator');

        function addMessage(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = isUser ? 'message user-message' : 'message ai-message';
            
            if (typeof content === 'string' && content.includes('\`\`\`')) {
                // Handle code blocks
                const parts = content.split(/(\`\`\`[\\s\\S]*?\`\`\`)/);
                let html = '';
                
                parts.forEach(part => {
                    if (part.startsWith('\`\`\`')) {
                        const code = part.replace(/\`\`\`[\\w]*\\n?/, '').replace(/\\n?\`\`\`$/, '');
                        html += \`<div class="code-block">\${code}</div>\`;
                    } else {
                        html += part.replace(/\\n/g, '<br>');
                    }
                });
                
                messageDiv.innerHTML = html;
            } else {
                messageDiv.textContent = content;
            }
            
            const timestamp = document.createElement('div');
            timestamp.className = 'timestamp';
            timestamp.textContent = new Date().toLocaleTimeString();
            messageDiv.appendChild(timestamp);
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage(message, true);
            messageInput.value = '';
            sendButton.disabled = true;

            vscode.postMessage({
                type: 'chat',
                message: message
            });
        }

        function sendQuickMessage(message) {
            messageInput.value = message;
            sendMessage();
        }

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        sendButton.addEventListener('click', sendMessage);

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'response':
                    addMessage(message.message);
                    sendButton.disabled = false;
                    break;
                    
                case 'error':
                    addMessage(\`❌ \${message.message}\`);
                    sendButton.disabled = false;
                    break;
                    
                case 'typing':
                    typingIndicator.style.display = message.isTyping ? 'block' : 'none';
                    break;
                    
                case 'codeGenerated':
                    addMessage(\`Generated \${message.language} code:\\n\\\`\\\`\\\`\${message.language}\\n\${message.code}\\n\\\`\\\`\\\`\`);
                    break;
                    
                case 'researchResults':
                    let resultsText = \`Research results for: \${message.results.query}\\n\\n\`;
                    if (message.results.results) {
                        message.results.results.forEach((result, index) => {
                            resultsText += \`\${index + 1}. **\${result.title}**\\n\${result.snippet}\\n\${result.url}\\n\\n\`;
                        });
                    }
                    addMessage(resultsText);
                    break;
                    
                case 'commandResult':
                    addMessage(\`Command result:\\n\\\`\\\`\\\`json\\n\${JSON.stringify(message.result, null, 2)}\\n\\\`\\\`\\\`\`);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

