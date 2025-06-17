import * as vscode from 'vscode';
import { AIManager } from './ai/AIManager';
import { BrowserManager } from './browser/BrowserManager';
import { CLIManager } from './cli/CLIManager';
import { SecurityManager } from './security/SecurityManager';
import { ChatWebviewProvider } from './providers/ChatWebviewProvider';
import { ContextTreeProvider, StatusTreeProvider, ModelsTreeProvider } from './providers/TreeProviders';
import { CommandHandler } from './commands/CommandHandler';

export function activate(context: vscode.ExtensionContext) {
    console.log('K3SS AI Coder Ultimate extension is now active!');

    // Initialize core managers (all self-contained)
    const aiManager = new AIManager(context);
    const browserManager = new BrowserManager(context);
    const cliManager = new CLIManager(context);
    const securityManager = new SecurityManager(context);

    // Initialize providers
    const chatProvider = new ChatWebviewProvider(context.extensionUri, context);
    const contextProvider = new ContextTreeProvider();
    const statusProvider = new StatusTreeProvider(aiManager, browserManager, cliManager, securityManager);
    const modelsProvider = new ModelsTreeProvider(aiManager);
    
    // Initialize command handler
    const commandHandler = new CommandHandler(aiManager, browserManager, cliManager, chatProvider);

    // Register webview providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('k3ss-ai.chatView', chatProvider)
    );

    // Register tree data providers
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('k3ss-ai.contextView', contextProvider),
        vscode.window.registerTreeDataProvider('k3ss-ai.statusView', statusProvider),
        vscode.window.registerTreeDataProvider('k3ss-ai.modelsView', modelsProvider)
    );

    // Register commands
    const commands = [
        vscode.commands.registerCommand('k3ss-ai.openChat', () => commandHandler.openChat()),
        vscode.commands.registerCommand('k3ss-ai.generateCode', () => commandHandler.generateCode()),
        vscode.commands.registerCommand('k3ss-ai.analyzeCode', () => commandHandler.analyzeCode()),
        vscode.commands.registerCommand('k3ss-ai.refactorCode', () => commandHandler.refactorCode()),
        vscode.commands.registerCommand('k3ss-ai.researchWeb', () => commandHandler.researchWeb()),
        vscode.commands.registerCommand('k3ss-ai.runCliCommand', () => commandHandler.runCliCommand()),
        vscode.commands.registerCommand('k3ss-ai.openSettings', () => commandHandler.openSettings()),
        vscode.commands.registerCommand('k3ss-ai.showStatus', () => commandHandler.showStatus())
    ];

    context.subscriptions.push(...commands);

    // Initialize all managers
    Promise.all([
        aiManager.initialize(),
        browserManager.initialize(),
        cliManager.initialize(),
        securityManager.initialize()
    ]).then(() => {
        vscode.window.showInformationMessage('K3SS AI Coder Ultimate: All systems ready!');
        statusProvider.refresh();
        modelsProvider.refresh();
    }).catch((error) => {
        vscode.window.showErrorMessage(`K3SS AI Coder Ultimate: Initialization error: ${error.message}`);
    });

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(robot) K3SS AI Ultimate";
    statusBarItem.tooltip = "K3SS AI Coder Ultimate - All systems self-contained";
    statusBarItem.command = 'k3ss-ai.openChat';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Auto-refresh status every 30 seconds
    const statusInterval = setInterval(() => {
        statusProvider.refresh();
        modelsProvider.refresh();
    }, 30000);

    context.subscriptions.push({
        dispose: () => clearInterval(statusInterval)
    });
}

export function deactivate() {
    console.log('K3SS AI Coder Ultimate extension is now deactivated');
}

