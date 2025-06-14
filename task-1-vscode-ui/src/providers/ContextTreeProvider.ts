import * as vscode from 'vscode';

export class ContextTreeProvider implements vscode.TreeDataProvider<ContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextItem | undefined | null | void> = new vscode.EventEmitter<ContextItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ContextItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ContextItem): Thenable<ContextItem[]> {
        if (!element) {
            return Promise.resolve(this.getContextItems());
        }
        return Promise.resolve([]);
    }

    private getContextItems(): ContextItem[] {
        const items: ContextItem[] = [];
        
        // Active editor context
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            items.push(new ContextItem(
                `Active File: ${editor.document.fileName.split('/').pop()}`,
                vscode.TreeItemCollapsibleState.None,
                'file',
                editor.document.fileName
            ));
            
            items.push(new ContextItem(
                `Language: ${editor.document.languageId}`,
                vscode.TreeItemCollapsibleState.None,
                'language',
                editor.document.languageId
            ));

            if (editor.selection && !editor.selection.isEmpty) {
                const selectedText = editor.document.getText(editor.selection);
                items.push(new ContextItem(
                    `Selection: ${selectedText.length} chars`,
                    vscode.TreeItemCollapsibleState.None,
                    'selection',
                    selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '')
                ));
            }
        }

        // Workspace context
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            items.push(new ContextItem(
                `Workspace: ${workspaceFolder.name}`,
                vscode.TreeItemCollapsibleState.None,
                'workspace',
                workspaceFolder.uri.fsPath
            ));
        }

        // Open files
        const openFiles = vscode.workspace.textDocuments.length;
        items.push(new ContextItem(
            `Open Files: ${openFiles}`,
            vscode.TreeItemCollapsibleState.None,
            'files',
            `${openFiles} files currently open`
        ));

        return items;
    }
}

class ContextItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextType: string,
        public readonly value: string
    ) {
        super(label, collapsibleState);
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

