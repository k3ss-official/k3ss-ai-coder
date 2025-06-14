import * as vscode from 'vscode';
import { AIAssistantProvider } from './AIAssistantProvider';

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'k3ss-ai.chatView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly aiAssistant: AIAssistantProvider
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

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleChatMessage(data.message);
                    break;
                case 'generateCode':
                    await this.handleCodeGeneration(data.prompt, data.language);
                    break;
                case 'analyzeCode':
                    await this.handleCodeAnalysis(data.code, data.language);
                    break;
                case 'researchWeb':
                    await this.handleWebResearch(data.query);
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

            const context = await this.aiAssistant.getContext();
            const response = await this.aiAssistant.chat(message, context);

            // Send response back to webview
            this._view?.webview.postMessage({
                type: 'chatResponse',
                message: response.message || response,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Error: ${error}`
            });
        } finally {
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: false
            });
        }
    }

    private async handleCodeGeneration(prompt: string, language?: string) {
        try {
            const code = await this.aiAssistant.generateCode(prompt, language);
            
            this._view?.webview.postMessage({
                type: 'codeGenerated',
                code: code,
                language: language || 'javascript'
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Code generation error: ${error}`
            });
        }
    }

    private async handleCodeAnalysis(code: string, language?: string) {
        try {
            const analysis = await this.aiAssistant.analyzeCode(code, language);
            
            this._view?.webview.postMessage({
                type: 'codeAnalysis',
                analysis: analysis
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Code analysis error: ${error}`
            });
        }
    }

    private async handleWebResearch(query: string) {
        try {
            const results = await this.aiAssistant.researchWeb(query);
            
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

    public sendMessage(message: string) {
        this._view?.webview.postMessage({
            type: 'addMessage',
            message: message,
            sender: 'system',
            timestamp: new Date().toISOString()
        });
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
            max-width: 85%;
        }
        
        .message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
            text-align: right;
        }
        
        .message.assistant {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }
        
        .message.system {
            background-color: var(--vscode-notifications-background);
            border: 1px solid var(--vscode-notifications-border);
            font-style: italic;
            text-align: center;
            margin: 0 auto;
        }
        
        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .message-time {
            font-size: 0.8em;
            opacity: 0.7;
            margin-top: 5px;
        }
        
        .input-container {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        .input-area {
            flex: 1;
            min-height: 60px;
            max-height: 120px;
            resize: vertical;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
        }
        
        .send-button, .action-button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: inherit;
        }
        
        .send-button:hover, .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .action-buttons {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        
        .action-button {
            font-size: 0.9em;
            padding: 6px 12px;
        }
        
        .typing-indicator {
            display: none;
            font-style: italic;
            opacity: 0.7;
            margin: 10px 0;
        }
        
        .typing-indicator.show {
            display: block;
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
        
        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 8px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="action-buttons">
        <button class="action-button" onclick="quickAction('generate')">Generate Code</button>
        <button class="action-button" onclick="quickAction('analyze')">Analyze Code</button>
        <button class="action-button" onclick="quickAction('research')">Web Research</button>
        <button class="action-button" onclick="quickAction('refactor')">Refactor</button>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="message system">
            <div class="message-content">K3SS AI Assistant is ready! Ask me anything about your code or project.</div>
        </div>
    </div>
    
    <div class="typing-indicator" id="typingIndicator">AI is thinking...</div>
    
    <div class="input-container">
        <textarea 
            class="input-area" 
            id="messageInput" 
            placeholder="Ask me anything about your code..."
            rows="2"
        ></textarea>
        <button class="send-button" onclick="sendMessage()">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const typingIndicator = document.getElementById('typingIndicator');

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'chatResponse':
                    addMessage(message.message, 'assistant', message.timestamp);
                    break;
                case 'addMessage':
                    addMessage(message.message, message.sender, message.timestamp);
                    break;
                case 'typing':
                    showTyping(message.isTyping);
                    break;
                case 'codeGenerated':
                    addCodeBlock(message.code, message.language);
                    break;
                case 'codeAnalysis':
                    addMessage(JSON.stringify(message.analysis, null, 2), 'assistant');
                    break;
                case 'researchResults':
                    addMessage(JSON.stringify(message.results, null, 2), 'assistant');
                    break;
                case 'error':
                    addErrorMessage(message.message);
                    break;
            }
        });

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage(message, 'user');
            messageInput.value = '';
            
            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });
        }

        function quickAction(action) {
            let prompt = '';
            switch (action) {
                case 'generate':
                    prompt = 'Generate code for: ';
                    break;
                case 'analyze':
                    prompt = 'Analyze the current code selection';
                    break;
                case 'research':
                    prompt = 'Research: ';
                    break;
                case 'refactor':
                    prompt = 'Refactor the current code to: ';
                    break;
            }
            messageInput.value = prompt;
            messageInput.focus();
        }

        function addMessage(content, sender, timestamp) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
            
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(timeDiv);
            chatContainer.appendChild(messageDiv);
            
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function addCodeBlock(code, language) {
            const codeDiv = document.createElement('div');
            codeDiv.className = 'code-block';
            codeDiv.textContent = code;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';
            messageDiv.appendChild(codeDiv);
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function addErrorMessage(error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = error;
            
            chatContainer.appendChild(errorDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function showTyping(isTyping) {
            typingIndicator.className = isTyping ? 'typing-indicator show' : 'typing-indicator';
        }

        // Handle Enter key
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    </script>
</body>
</html>`;
    }
}

