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
exports.ModelsTreeProvider = exports.StatusTreeProvider = exports.ContextTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class ContextTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }
    getRootItems() {
        const items = [];
        // Current file context
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            items.push(new ContextItem(`📄 ${editor.document.fileName.split('/').pop()}`, `Language: ${editor.document.languageId}`, vscode.TreeItemCollapsibleState.None));
        }
        // Workspace context
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            items.push(new ContextItem(`📁 ${workspaceFolder.name}`, workspaceFolder.uri.fsPath, vscode.TreeItemCollapsibleState.None));
        }
        // Selection context
        if (editor?.selection && !editor.selection.isEmpty) {
            const selectedText = editor.document.getText(editor.selection);
            items.push(new ContextItem(`✂️ Selected Text`, `${selectedText.length} characters`, vscode.TreeItemCollapsibleState.None));
        }
        return items;
    }
}
exports.ContextTreeProvider = ContextTreeProvider;
class StatusTreeProvider {
    constructor(aiManager, browserManager, cliManager, securityManager) {
        this.aiManager = aiManager;
        this.browserManager = browserManager;
        this.cliManager = cliManager;
        this.securityManager = securityManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }
    getRootItems() {
        const items = [];
        // AI Manager status
        const aiStatus = this.aiManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(`${aiStatus} AI Manager`, this.aiManager.isReady() ? 'Ready' : 'Not Ready', vscode.TreeItemCollapsibleState.None));
        // Browser Manager status
        const browserStatus = this.browserManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(`${browserStatus} Browser Manager`, this.browserManager.isReady() ? 'Ready' : 'Not Ready', vscode.TreeItemCollapsibleState.None));
        // CLI Manager status
        const cliStatus = this.cliManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(`${cliStatus} CLI Manager`, this.cliManager.isReady() ? 'Ready' : 'Not Ready', vscode.TreeItemCollapsibleState.None));
        // Security Manager status
        const securityStatus = this.securityManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(`${securityStatus} Security Manager`, this.securityManager.isReady() ? 'Ready' : 'Not Ready', vscode.TreeItemCollapsibleState.None));
        return items;
    }
}
exports.StatusTreeProvider = StatusTreeProvider;
class ModelsTreeProvider {
    constructor(aiManager) {
        this.aiManager = aiManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }
    getRootItems() {
        const items = [];
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const currentProvider = config.get('aiProvider', 'built-in');
        const models = this.aiManager.getAvailableModels();
        models.forEach((model) => {
            const isActive = model.includes(currentProvider) || (currentProvider === 'built-in' && model === 'built-in-assistant');
            const icon = isActive ? '🟢' : '⚪';
            items.push(new ModelItem(`${icon} ${model}`, isActive ? 'Active' : 'Available', vscode.TreeItemCollapsibleState.None));
        });
        return items;
    }
}
exports.ModelsTreeProvider = ModelsTreeProvider;
class ContextItem extends vscode.TreeItem {
    constructor(label, tooltip, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.tooltip = tooltip;
        this.collapsibleState = collapsibleState;
        this.tooltip = tooltip;
    }
}
class StatusItem extends vscode.TreeItem {
    constructor(label, tooltip, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.tooltip = tooltip;
        this.collapsibleState = collapsibleState;
        this.tooltip = tooltip;
    }
}
class ModelItem extends vscode.TreeItem {
    constructor(label, tooltip, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.tooltip = tooltip;
        this.collapsibleState = collapsibleState;
        this.tooltip = tooltip;
    }
}
//# sourceMappingURL=TreeProviders.js.map