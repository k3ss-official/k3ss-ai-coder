import * as vscode from 'vscode';
import { AIAssistantProvider } from './providers/AIAssistantProvider';
import { ChatWebviewProvider } from './providers/ChatWebviewProvider';
import { ContextTreeProvider } from './providers/ContextTreeProvider';
import { StatusTreeProvider } from './providers/StatusTreeProvider';
import { CommandHandler } from './commands/CommandHandler';
import { IntegrationManager } from './integration/IntegrationManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('K3SS AI Coder extension is now active!');

    // Initialize core providers
    const integrationManager = new IntegrationManager();
    const aiAssistant = new AIAssistantProvider(integrationManager);
    const chatProvider = new ChatWebviewProvider(context.extensionUri, aiAssistant);
    const contextProvider = new ContextTreeProvider();
    const statusProvider = new StatusTreeProvider(integrationManager);
    const commandHandler = new CommandHandler(aiAssistant, chatProvider);

    // Register webview providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('k3ss-ai.chatView', chatProvider)
    );

    // Register tree data providers
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('k3ss-ai.contextView', contextProvider),
        vscode.window.registerTreeDataProvider('k3ss-ai.statusView', statusProvider)
    );

    // Register commands
    const commands = [
        vscode.commands.registerCommand('k3ss-ai.openChat', () => commandHandler.openChat()),
        vscode.commands.registerCommand('k3ss-ai.generateCode', () => commandHandler.generateCode()),
        vscode.commands.registerCommand('k3ss-ai.analyzeCode', () => commandHandler.analyzeCode()),
        vscode.commands.registerCommand('k3ss-ai.refactorCode', () => commandHandler.refactorCode()),
        vscode.commands.registerCommand('k3ss-ai.researchWeb', () => commandHandler.researchWeb()),
        vscode.commands.registerCommand('k3ss-ai.openSettings', () => commandHandler.openSettings()),
        vscode.commands.registerCommand('k3ss-ai.showStatus', () => commandHandler.showStatus())
    ];

    context.subscriptions.push(...commands);

    // Initialize integration with backend services
    integrationManager.initialize().then(() => {
        vscode.window.showInformationMessage('K3SS AI Coder: Connected to backend services!');
        statusProvider.refresh();
    }).catch((error) => {
        vscode.window.showErrorMessage(`K3SS AI Coder: Failed to connect to backend services: ${error.message}`);
    });

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(robot) K3SS AI";
    statusBarItem.tooltip = "K3SS AI Coder - Click to open chat";
    statusBarItem.command = 'k3ss-ai.openChat';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Auto-refresh status every 30 seconds
    const statusInterval = setInterval(() => {
        statusProvider.refresh();
    }, 30000);

    context.subscriptions.push({
        dispose: () => clearInterval(statusInterval)
    });
}

export function deactivate() {
    console.log('K3SS AI Coder extension is now deactivated');
}

