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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const AIManager_1 = require("./ai/AIManager");
const BrowserManager_1 = require("./browser/BrowserManager");
const CLIManager_1 = require("./cli/CLIManager");
const SecurityManager_1 = require("./security/SecurityManager");
const ChatWebviewProvider_1 = require("./providers/ChatWebviewProvider");
const TreeProviders_1 = require("./providers/TreeProviders");
const CommandHandler_1 = require("./commands/CommandHandler");
function activate(context) {
    console.log('K3SS AI Coder Ultimate extension is now active!');
    // Initialize core managers (all self-contained)
    const aiManager = new AIManager_1.AIManager(context);
    const browserManager = new BrowserManager_1.BrowserManager(context);
    const cliManager = new CLIManager_1.CLIManager(context);
    const securityManager = new SecurityManager_1.SecurityManager(context);
    // Initialize providers
    const chatProvider = new ChatWebviewProvider_1.ChatWebviewProvider(context.extensionUri, context);
    const contextProvider = new TreeProviders_1.ContextTreeProvider();
    const statusProvider = new TreeProviders_1.StatusTreeProvider(aiManager, browserManager, cliManager, securityManager);
    const modelsProvider = new TreeProviders_1.ModelsTreeProvider(aiManager);
    // Initialize command handler
    const commandHandler = new CommandHandler_1.CommandHandler(aiManager, browserManager, cliManager, chatProvider);
    // Register webview providers
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('k3ss-ai.chatView', chatProvider));
    // Register tree data providers
    context.subscriptions.push(vscode.window.registerTreeDataProvider('k3ss-ai.contextView', contextProvider), vscode.window.registerTreeDataProvider('k3ss-ai.statusView', statusProvider), vscode.window.registerTreeDataProvider('k3ss-ai.modelsView', modelsProvider));
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
exports.activate = activate;
function deactivate() {
    console.log('K3SS AI Coder Ultimate extension is now deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map