import * as vscode from 'vscode';
import { AIAssistantProvider } from '../providers/AIAssistantProvider';
import { ChatWebviewProvider } from '../providers/ChatWebviewProvider';

export class CommandHandler {
    private aiAssistant: AIAssistantProvider;
    private chatProvider: ChatWebviewProvider;

    constructor(aiAssistant: AIAssistantProvider, chatProvider: ChatWebviewProvider) {
        this.aiAssistant = aiAssistant;
        this.chatProvider = chatProvider;
    }

    async openChat(): Promise<void> {
        // Focus on the chat view
        await vscode.commands.executeCommand('k3ss-ai.chatView.focus');
    }

    async generateCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const prompt = await vscode.window.showInputBox({
            prompt: 'What code would you like me to generate?',
            placeHolder: 'e.g., Create a React component for user authentication'
        });

        if (!prompt) return;

        try {
            const language = editor.document.languageId;
            const generatedCode = await this.aiAssistant.generateCode(prompt, language);
            
            // Insert generated code at cursor position
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, generatedCode);
            });

            // Show success message
            vscode.window.showInformationMessage('Code generated successfully!');
            
            // Also send to chat
            this.chatProvider.sendMessage(`Generated code for: ${prompt}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
        }
    }

    async analyzeCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText) {
            vscode.window.showWarningMessage('Please select some code to analyze');
            return;
        }

        try {
            const language = editor.document.languageId;
            const analysis = await this.aiAssistant.analyzeCode(selectedText, language);
            
            // Show analysis in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: JSON.stringify(analysis, null, 2),
                language: 'json'
            });
            
            await vscode.window.showTextDocument(doc);
            
            // Also send to chat
            this.chatProvider.sendMessage(`Code analysis completed for ${selectedText.length} characters of ${language} code`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
        }
    }

    async refactorCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText) {
            vscode.window.showWarningMessage('Please select some code to refactor');
            return;
        }

        const instructions = await vscode.window.showInputBox({
            prompt: 'How would you like to refactor this code?',
            placeHolder: 'e.g., Make it more efficient, add error handling, convert to async/await'
        });

        if (!instructions) return;

        try {
            const language = editor.document.languageId;
            const refactoredCode = await this.aiAssistant.refactorCode(selectedText, instructions, language);
            
            // Replace selected text with refactored code
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, refactoredCode);
            });

            vscode.window.showInformationMessage('Code refactored successfully!');
            
            // Send to chat
            this.chatProvider.sendMessage(`Refactored code: ${instructions}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
        }
    }

    async researchWeb(): Promise<void> {
        const query = await vscode.window.showInputBox({
            prompt: 'What would you like to research?',
            placeHolder: 'e.g., React hooks best practices, TypeScript error handling'
        });

        if (!query) return;

        try {
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Researching...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Searching the web...' });
                
                const results = await this.aiAssistant.researchWeb(query);
                
                progress.report({ increment: 100, message: 'Research complete!' });
                
                // Show results in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: JSON.stringify(results, null, 2),
                    language: 'json'
                });
                
                await vscode.window.showTextDocument(doc);
                
                // Send to chat
                this.chatProvider.sendMessage(`Web research completed for: ${query}`);
            });
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to research: ${error}`);
        }
    }

    async openSettings(): Promise<void> {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'k3ss-ai');
    }

    async showStatus(): Promise<void> {
        try {
            const context = await this.aiAssistant.getContext();
            const statusInfo = {
                activeFile: context.activeFile,
                language: context.language,
                workspaceRoot: context.workspaceRoot,
                openFiles: context.openFiles?.length || 0,
                hasSelection: !!context.selectedText,
                timestamp: new Date().toISOString()
            };

            // Show status in information message
            const message = `K3SS AI Status:
Active File: ${statusInfo.activeFile ? statusInfo.activeFile.split('/').pop() : 'None'}
Language: ${statusInfo.language || 'Unknown'}
Open Files: ${statusInfo.openFiles}
Has Selection: ${statusInfo.hasSelection ? 'Yes' : 'No'}`;

            vscode.window.showInformationMessage(message);
            
            // Send to chat
            this.chatProvider.sendMessage(`Status check: ${JSON.stringify(statusInfo, null, 2)}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get status: ${error}`);
        }
    }
}

