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
exports.ContextTreeProvider = void 0;
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
            return Promise.resolve(this.getContextItems());
        }
        return Promise.resolve([]);
    }
    getContextItems() {
        const items = [];
        // Active editor context
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            items.push(new ContextItem(`Active File: ${editor.document.fileName.split('/').pop()}`, vscode.TreeItemCollapsibleState.None, 'file', editor.document.fileName));
            items.push(new ContextItem(`Language: ${editor.document.languageId}`, vscode.TreeItemCollapsibleState.None, 'language', editor.document.languageId));
            if (editor.selection && !editor.selection.isEmpty) {
                const selectedText = editor.document.getText(editor.selection);
                items.push(new ContextItem(`Selection: ${selectedText.length} chars`, vscode.TreeItemCollapsibleState.None, 'selection', selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '')));
            }
        }
        // Workspace context
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            items.push(new ContextItem(`Workspace: ${workspaceFolder.name}`, vscode.TreeItemCollapsibleState.None, 'workspace', workspaceFolder.uri.fsPath));
        }
        // Open files
        const openFiles = vscode.workspace.textDocuments.length;
        items.push(new ContextItem(`Open Files: ${openFiles}`, vscode.TreeItemCollapsibleState.None, 'files', `${openFiles} files currently open`));
        return items;
    }
}
exports.ContextTreeProvider = ContextTreeProvider;
class ContextItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextType, value) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextType = contextType;
        this.value = value;
        this.tooltip = value;
        this.description = contextType;
        // Set icons based on context type
        switch (contextType) {
            case 'file':
                this.iconPath = new vscode.ThemeIcon('file');
                break;
            case 'language':
                this.iconPath = new vscode.ThemeIcon('symbol-keyword');
                break;
            case 'selection':
                this.iconPath = new vscode.ThemeIcon('selection');
                break;
            case 'workspace':
                this.iconPath = new vscode.ThemeIcon('folder');
                break;
            case 'files':
                this.iconPath = new vscode.ThemeIcon('files');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}
//# sourceMappingURL=ContextTreeProvider.js.map