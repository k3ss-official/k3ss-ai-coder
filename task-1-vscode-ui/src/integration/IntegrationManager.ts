import axios from 'axios';
import * as vscode from 'vscode';

export class IntegrationManager {
    private apiEndpoint: string;
    private isConnected: boolean = false;

    constructor() {
        this.apiEndpoint = vscode.workspace.getConfiguration('k3ss-ai').get('apiEndpoint', 'http://localhost:9000');
    }

    async initialize(): Promise<void> {
        try {
            // Test connection to integration gateway
            const response = await axios.get(`${this.apiEndpoint}/health`, { timeout: 5000 });
            this.isConnected = response.status === 200;
            
            if (this.isConnected) {
                console.log('K3SS AI: Connected to integration gateway');
            }
        } catch (error) {
            console.error('K3SS AI: Failed to connect to integration gateway:', error);
            this.isConnected = false;
            throw new Error('Failed to connect to K3SS AI backend services');
        }
    }

    async sendChatMessage(message: string, context?: any): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/ai/chat`, {
                message,
                context,
                timestamp: new Date().toISOString()
            });
            
            return response.data;
        } catch (error) {
            console.error('Chat API error:', error);
            throw new Error('Failed to send chat message');
        }
    }

    async generateCode(prompt: string, language?: string): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/ai/generate`, {
                prompt,
                language: language || 'javascript',
                type: 'code'
            });
            
            return response.data;
        } catch (error) {
            console.error('Code generation API error:', error);
            throw new Error('Failed to generate code');
        }
    }

    async analyzeCode(code: string, language?: string): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/ai/analyze`, {
                code,
                language: language || 'javascript'
            });
            
            return response.data;
        } catch (error) {
            console.error('Code analysis API error:', error);
            throw new Error('Failed to analyze code');
        }
    }

    async refactorCode(code: string, instructions: string, language?: string): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/ai/refactor`, {
                code,
                instructions,
                language: language || 'javascript'
            });
            
            return response.data;
        } catch (error) {
            console.error('Code refactoring API error:', error);
            throw new Error('Failed to refactor code');
        }
    }

    async researchWeb(query: string): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/browser/research`, {
                query,
                timestamp: new Date().toISOString()
            });
            
            return response.data;
        } catch (error) {
            console.error('Web research API error:', error);
            throw new Error('Failed to perform web research');
        }
    }

    async executeCliCommand(command: string, args?: string[]): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Not connected to backend services');
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/cli/execute`, {
                command,
                args: args || [],
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            });
            
            return response.data;
        } catch (error) {
            console.error('CLI execution API error:', error);
            throw new Error('Failed to execute CLI command');
        }
    }

    async getServiceStatus(): Promise<any> {
        if (!this.isConnected) {
            return {
                gateway: 'disconnected',
                services: {}
            };
        }

        try {
            const response = await axios.get(`${this.apiEndpoint}/status`);
            return response.data;
        } catch (error) {
            console.error('Status API error:', error);
            return {
                gateway: 'error',
                services: {},
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async getAvailableModels(): Promise<string[]> {
        if (!this.isConnected) {
            return [];
        }

        try {
            const response = await axios.get(`${this.apiEndpoint}/ai/models`);
            return response.data.models || [];
        } catch (error) {
            console.error('Models API error:', error);
            return [];
        }
    }

    isServiceConnected(): boolean {
        return this.isConnected;
    }

    updateApiEndpoint(endpoint: string): void {
        this.apiEndpoint = endpoint;
        this.isConnected = false;
    }
}

