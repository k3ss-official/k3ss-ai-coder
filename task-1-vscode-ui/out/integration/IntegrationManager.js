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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationManager = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
class IntegrationManager {
    constructor() {
        this.isConnected = false;
        this.apiEndpoint = vscode.workspace.getConfiguration('k3ss-ai').get('apiEndpoint', 'http://localhost:9000');
    }
    async initialize() {
        try {
            // Test connection to integration gateway
            const response = await axios_1.default.get(`${this.apiEndpoint}/health`, { timeout: 5000 });
            this.isConnected = response.status === 200;
            if (this.isConnected) {
                console.log('K3SS AI: Connected to integration gateway');
            }
        }
        catch (error) {
            console.error('K3SS AI: Failed to connect to integration gateway:', error);
            this.isConnected = false;
            throw new Error('Failed to connect to K3SS AI backend services');
        }
    }
    async sendChatMessage(message, context) {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }
        try {
            const response = await axios_1.default.post(`${this.apiEndpoint}/ai/chat`, {
                message,
                context,
                timestamp: new Date().toISOString()
            });
            return response.data;
        }
        catch (error) {
            console.error('Chat API error:', error);
            throw new Error('Failed to send chat message');
        }
    }
    async generateCode(prompt, language) {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }
        try {
            const response = await axios_1.default.post(`${this.apiEndpoint}/ai/generate`, {
                prompt,
                language: language || 'javascript',
                type: 'code'
            });
            return response.data;
        }
        catch (error) {
            console.error('Code generation API error:', error);
            throw new Error('Failed to generate code');
        }
    }
    async analyzeCode(code, language) {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }
        try {
            const response = await axios_1.default.post(`${this.apiEndpoint}/ai/analyze`, {
                code,
                language: language || 'javascript'
            });
            return response.data;
        }
        catch (error) {
            console.error('Code analysis API error:', error);
            throw new Error('Failed to analyze code');
        }
    }
    async refactorCode(code, instructions, language) {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }
        try {
            const response = await axios_1.default.post(`${this.apiEndpoint}/ai/refactor`, {
                code,
                instructions,
                language: language || 'javascript'
            });
            return response.data;
        }
        catch (error) {
            console.error('Code refactoring API error:', error);
            throw new Error('Failed to refactor code');
        }
    }
    async researchWeb(query) {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }
        try {
            const response = await axios_1.default.post(`${this.apiEndpoint}/browser/research`, {
                query,
                timestamp: new Date().toISOString()
            });
            return response.data;
        }
        catch (error) {
            console.error('Web research API error:', error);
            throw new Error('Failed to perform web research');
        }
    }
    async executeCliCommand(command, args) {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }
        try {
            const response = await axios_1.default.post(`${this.apiEndpoint}/cli/execute`, {
                command,
                args: args || [],
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            });
            return response.data;
        }
        catch (error) {
            console.error('CLI execution API error:', error);
            throw new Error('Failed to execute CLI command');
        }
    }
    async getServiceStatus() {
        if (!this.isConnected) {
            return {
                gateway: 'disconnected',
                services: {}
            };
        }
        try {
            const response = await axios_1.default.get(`${this.apiEndpoint}/status`);
            return response.data;
        }
        catch (error) {
            console.error('Status API error:', error);
            return {
                gateway: 'error',
                services: {},
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async getAvailableModels() {
        if (!this.isConnected) {
            return [];
        }
        try {
            const response = await axios_1.default.get(`${this.apiEndpoint}/ai/models`);
            return response.data.models || [];
        }
        catch (error) {
            console.error('Models API error:', error);
            return [];
        }
    }
    isServiceConnected() {
        return this.isConnected;
    }
    updateApiEndpoint(endpoint) {
        this.apiEndpoint = endpoint;
        this.isConnected = false;
    }
}
exports.IntegrationManager = IntegrationManager;
//# sourceMappingURL=IntegrationManager.js.map