import * as vscode from 'vscode';

export class ContextTreeProvider implements vscode.TreeDataProvider<ContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextItem | undefined | null | void> = new vscode.EventEmitter<ContextItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ContextItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ContextItem): Thenable<ContextItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): ContextItem[] {
        const items: ContextItem[] = [];
        
        // Current file context
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            items.push(new ContextItem(
                `📄 ${editor.document.fileName.split('/').pop()}`,
                `Language: ${editor.document.languageId}`,
                vscode.TreeItemCollapsibleState.None
            ));
        }

        // Workspace context
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            items.push(new ContextItem(
                `📁 ${workspaceFolder.name}`,
                workspaceFolder.uri.fsPath,
                vscode.TreeItemCollapsibleState.None
            ));
        }

        // Selection context
        if (editor?.selection && !editor.selection.isEmpty) {
            const selectedText = editor.document.getText(editor.selection);
            items.push(new ContextItem(
                `✂️ Selected Text`,
                `${selectedText.length} characters`,
                vscode.TreeItemCollapsibleState.None
            ));
        }

        return items;
    }
}

export class StatusTreeProvider implements vscode.TreeDataProvider<StatusItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusItem | undefined | null | void> = new vscode.EventEmitter<StatusItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private aiManager: any,
        private browserManager: any,
        private cliManager: any,
        private securityManager: any
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatusItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatusItem): Thenable<StatusItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): StatusItem[] {
        const items: StatusItem[] = [];
        
        // AI Manager status
        const aiStatus = this.aiManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(
            `${aiStatus} AI Manager`,
            this.aiManager.isReady() ? 'Ready' : 'Not Ready',
            vscode.TreeItemCollapsibleState.None
        ));

        // Browser Manager status
        const browserStatus = this.browserManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(
            `${browserStatus} Browser Manager`,
            this.browserManager.isReady() ? 'Ready' : 'Not Ready',
            vscode.TreeItemCollapsibleState.None
        ));

        // CLI Manager status
        const cliStatus = this.cliManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(
            `${cliStatus} CLI Manager`,
            this.cliManager.isReady() ? 'Ready' : 'Not Ready',
            vscode.TreeItemCollapsibleState.None
        ));

        // Security Manager status
        const securityStatus = this.securityManager.isReady() ? '✅' : '❌';
        items.push(new StatusItem(
            `${securityStatus} Security Manager`,
            this.securityManager.isReady() ? 'Ready' : 'Not Ready',
            vscode.TreeItemCollapsibleState.None
        ));

        return items;
    }
}

export class ModelsTreeProvider implements vscode.TreeDataProvider<ModelItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ModelItem | undefined | null | void> = new vscode.EventEmitter<ModelItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ModelItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private aiManager: any) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ModelItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ModelItem): Thenable<ModelItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): ModelItem[] {
        const items: ModelItem[] = [];
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const currentProvider = config.get('aiProvider', 'built-in');
        
        const models = this.aiManager.getAvailableModels();
        
        models.forEach((model: string) => {
            const isActive = model.includes(currentProvider) || (currentProvider === 'built-in' && model === 'built-in-assistant');
            const icon = isActive ? '🟢' : '⚪';
            
            items.push(new ModelItem(
                `${icon} ${model}`,
                isActive ? 'Active' : 'Available',
                vscode.TreeItemCollapsibleState.None
            ));
        });

        return items;
    }
}

class ContextItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
    }
}

class StatusItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
    }
}

class ModelItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
    }
}

