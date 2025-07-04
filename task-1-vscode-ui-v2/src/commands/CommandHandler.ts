import * as vscode from 'vscode';
import { AIManager } from '../ai/AIManager';
import { BrowserManager } from '../browser/BrowserManager';
import { CLIManager } from '../cli/CLIManager';

/**
 * Command Handler for all K3SS AI extension commands
 */
export class CommandHandler {
    private aiManager: AIManager;
    private browserManager: BrowserManager;
    private cliManager: CLIManager;
    private chatProvider: any;

    constructor(
        aiManager: AIManager,
        browserManager: BrowserManager,
        cliManager: CLIManager,
        chatProvider: any
    ) {
        this.aiManager = aiManager;
        this.browserManager = browserManager;
        this.cliManager = cliManager;
        this.chatProvider = chatProvider;
    }

    async openChat(): Promise<void> {
        try {
            await vscode.commands.executeCommand('k3ss-ai.chatView.focus');
            vscode.window.showInformationMessage('K3SS AI Chat opened');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open chat: ${error}`);
        }
    }

    async generateCode(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const prompt = await vscode.window.showInputBox({
                prompt: 'Describe the code you want to generate',
                placeHolder: 'e.g., Create a function that validates email addresses'
            });

            if (!prompt) {
                return;
            }

            const language = editor.document.languageId;
            const generatedCode = await this.aiManager.generateCode(prompt, language);

            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, generatedCode);
            });

            vscode.window.showInformationMessage('Code generated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Code generation failed: ${error}`);
        }
    }

    async analyzeCode(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showWarningMessage('Please select code to analyze');
                return;
            }

            const language = editor.document.languageId;
            const analysis = await this.aiManager.analyzeCode(selectedText, language);

            // Show analysis in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: `# Code Analysis Results\n\n${analysis.analysis}`,
                language: 'markdown'
            });
            
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('Code analysis complete!');
        } catch (error) {
            vscode.window.showErrorMessage(`Code analysis failed: ${error}`);
        }
    }

    async refactorCode(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showWarningMessage('Please select code to refactor');
                return;
            }

            const instructions = await vscode.window.showInputBox({
                prompt: 'How would you like to refactor this code?',
                placeHolder: 'e.g., Make it more efficient, add error handling, use modern syntax'
            });

            if (!instructions) {
                return;
            }

            const language = editor.document.languageId;
            const refactoredCode = await this.aiManager.refactorCode(selectedText, instructions, language);

            await editor.edit(editBuilder => {
                editBuilder.replace(selection, refactoredCode);
            });

            vscode.window.showInformationMessage('Code refactored successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Code refactoring failed: ${error}`);
        }
    }

    async researchWeb(): Promise<void> {
        try {
            const query = await vscode.window.showInputBox({
                prompt: 'What would you like to research?',
                placeHolder: 'e.g., React hooks best practices, Python async/await examples'
            });

            if (!query) {
                return;
            }

            const results = await this.browserManager.researchWeb(query);

            // Show results in a new document
            const content = this.formatResearchResults(results);
            const doc = await vscode.workspace.openTextDocument({
                content: content,
                language: 'markdown'
            });
            
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('Web research complete!');
        } catch (error) {
            vscode.window.showErrorMessage(`Web research failed: ${error}`);
        }
    }

    async runCliCommand(): Promise<void> {
        try {
            const availableCommands = this.cliManager.getAvailableCommands();
            
            const command = await vscode.window.showQuickPick(availableCommands, {
                placeHolder: 'Select a command to run'
            });

            if (!command) {
                return;
            }

            let args: string[] = [];
            if (command === 'generate') {
                const type = await vscode.window.showQuickPick(['component', 'function', 'class'], {
                    placeHolder: 'What would you like to generate?'
                });
                
                if (!type) {
                    return;
                }

                const name = await vscode.window.showInputBox({
                    prompt: `Enter ${type} name`,
                    placeHolder: `My${type.charAt(0).toUpperCase() + type.slice(1)}`
                });

                if (!name) {
                    return;
                }

                args = [type, name];
            }

            const result = await this.cliManager.executeCommand(command, args);

            // Show result in output channel
            const outputChannel = vscode.window.createOutputChannel('K3SS AI CLI');
            outputChannel.clear();
            outputChannel.appendLine(`Command: ${command} ${args.join(' ')}`);
            outputChannel.appendLine('Result:');
            outputChannel.appendLine(JSON.stringify(result, null, 2));
            outputChannel.show();

            vscode.window.showInformationMessage(`Command '${command}' executed successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`CLI command failed: ${error}`);
        }
    }

    async openSettings(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'k3ss-ai');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open settings: ${error}`);
        }
    }

    async showStatus(): Promise<void> {
        try {
            const status = {
                aiManager: this.aiManager.isReady() ? 'Ready' : 'Not Ready',
                browserManager: this.browserManager.isReady() ? 'Ready' : 'Not Ready',
                cliManager: this.cliManager.isReady() ? 'Ready' : 'Not Ready',
                availableModels: this.aiManager.getAvailableModels(),
                browserCapabilities: this.browserManager.getCapabilities(),
                cliCommands: this.cliManager.getAvailableCommands()
            };

            const content = this.formatStatusReport(status);
            const doc = await vscode.workspace.openTextDocument({
                content: content,
                language: 'markdown'
            });
            
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show status: ${error}`);
        }
    }

    private formatResearchResults(results: any): string {
        if (results.error) {
            return `# Web Research Error\n\n${results.error}\n\nQuery: ${results.query}`;
        }

        let content = `# Web Research Results\n\n**Query:** ${results.query}\n\n`;
        
        if (results.results && results.results.length > 0) {
            content += '## Results\n\n';
            results.results.forEach((result: any, index: number) => {
                content += `### ${index + 1}. ${result.title}\n\n`;
                content += `**URL:** ${result.url}\n\n`;
                content += `${result.snippet}\n\n---\n\n`;
            });
        } else {
            content += 'No results found.\n\n';
        }

        content += `**Source:** ${results.source}\n`;
        content += `**Timestamp:** ${results.timestamp}\n`;

        return content;
    }

    private formatStatusReport(status: any): string {
        return `# K3SS AI Coder Status Report

## System Status
- **AI Manager:** ${status.aiManager}
- **Browser Manager:** ${status.browserManager}
- **CLI Manager:** ${status.cliManager}

## Available AI Models
${status.availableModels.map((model: string) => `- ${model}`).join('\n')}

## Browser Capabilities
${status.browserCapabilities.map((cap: string) => `- ${cap}`).join('\n')}

## CLI Commands
${status.cliCommands.map((cmd: string) => `- ${cmd}`).join('\n')}

## Configuration
Access settings via: File > Preferences > Settings > K3SS AI

## Quick Actions
- **Open Chat:** Ctrl+Shift+K
- **Generate Code:** Ctrl+Shift+G
- **Analyze Code:** Right-click selected code
- **Research Web:** Command Palette > K3SS AI: Research Web

---
*Generated at: ${new Date().toISOString()}*`;
    }
}

