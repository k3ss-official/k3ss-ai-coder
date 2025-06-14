import * as vscode from 'vscode';
import { IntegrationManager } from '../integration/IntegrationManager';

export class AIAssistantProvider {
    private integrationManager: IntegrationManager;

    constructor(integrationManager: IntegrationManager) {
        this.integrationManager = integrationManager;
    }

    async chat(message: string, context?: any): Promise<any> {
        try {
            const response = await this.integrationManager.sendChatMessage(message, context);
            return response;
        } catch (error) {
            vscode.window.showErrorMessage(`Chat error: ${error}`);
            throw error;
        }
    }

    async generateCode(prompt: string, language?: string): Promise<string> {
        try {
            const response = await this.integrationManager.generateCode(prompt, language);
            return response.code || '';
        } catch (error) {
            vscode.window.showErrorMessage(`Code generation error: ${error}`);
            throw error;
        }
    }

    async analyzeCode(code: string, language?: string): Promise<any> {
        try {
            const response = await this.integrationManager.analyzeCode(code, language);
            return response;
        } catch (error) {
            vscode.window.showErrorMessage(`Code analysis error: ${error}`);
            throw error;
        }
    }

    async refactorCode(code: string, instructions: string, language?: string): Promise<string> {
        try {
            const response = await this.integrationManager.refactorCode(code, instructions, language);
            return response.code || '';
        } catch (error) {
            vscode.window.showErrorMessage(`Code refactoring error: ${error}`);
            throw error;
        }
    }

    async researchWeb(query: string): Promise<any> {
        try {
            const response = await this.integrationManager.researchWeb(query);
            return response;
        } catch (error) {
            vscode.window.showErrorMessage(`Web research error: ${error}`);
            throw error;
        }
    }

    async getContext(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        return {
            activeFile: editor?.document.fileName,
            selection: editor?.selection,
            selectedText: editor?.document.getText(editor?.selection),
            language: editor?.document.languageId,
            workspaceRoot: workspaceFolder?.uri.fsPath,
            openFiles: vscode.workspace.textDocuments.map(doc => doc.fileName)
        };
    }
}

