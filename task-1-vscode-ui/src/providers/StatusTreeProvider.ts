import * as vscode from 'vscode';
import { IntegrationManager } from '../integration/IntegrationManager';

export class StatusTreeProvider implements vscode.TreeDataProvider<StatusItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusItem | undefined | null | void> = new vscode.EventEmitter<StatusItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private integrationManager: IntegrationManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatusItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: StatusItem): Promise<StatusItem[]> {
        if (!element) {
            return this.getStatusItems();
        }
        return [];
    }

    private async getStatusItems(): Promise<StatusItem[]> {
        const items: StatusItem[] = [];
        
        try {
            // Connection status
            const isConnected = this.integrationManager.isServiceConnected();
            items.push(new StatusItem(
                `Gateway: ${isConnected ? 'Connected' : 'Disconnected'}`,
                vscode.TreeItemCollapsibleState.None,
                isConnected ? 'connected' : 'disconnected',
                isConnected ? 'Integration gateway is online' : 'Integration gateway is offline'
            ));

            if (isConnected) {
                // Get service status
                const status = await this.integrationManager.getServiceStatus();
                
                if (status.services) {
                    Object.entries(status.services).forEach(([serviceName, serviceStatus]: [string, any]) => {
                        items.push(new StatusItem(
                            `${serviceName}: ${serviceStatus.status || 'Unknown'}`,
                            vscode.TreeItemCollapsibleState.None,
                            serviceStatus.status === 'online' ? 'service-online' : 'service-offline',
                            `${serviceName} service on port ${serviceStatus.port || 'unknown'}`
                        ));
                    });
                }

                // Available models
                try {
                    const models = await this.integrationManager.getAvailableModels();
                    items.push(new StatusItem(
                        `Models: ${models.length} available`,
                        vscode.TreeItemCollapsibleState.None,
                        'models',
                        models.join(', ') || 'No models available'
                    ));
                } catch (error) {
                    items.push(new StatusItem(
                        'Models: Error loading',
                        vscode.TreeItemCollapsibleState.None,
                        'error',
                        'Failed to load available models'
                    ));
                }
            }

            // Configuration status
            const config = vscode.workspace.getConfiguration('k3ss-ai');
            const apiEndpoint = config.get('apiEndpoint', 'http://localhost:9000');
            const preferredModel = config.get('preferredModel', 'auto');
            
            items.push(new StatusItem(
                `Endpoint: ${apiEndpoint}`,
                vscode.TreeItemCollapsibleState.None,
                'config',
                `API endpoint configuration`
            ));

            items.push(new StatusItem(
                `Model: ${preferredModel}`,
                vscode.TreeItemCollapsibleState.None,
                'config',
                `Preferred model setting`
            ));

            // Feature status
            const enableBrowser = config.get('enableBrowserAutomation', true);
            const enableResearch = config.get('enableWebResearch', true);
            const enableAutoComplete = config.get('enableAutoCompletion', true);

            items.push(new StatusItem(
                `Browser: ${enableBrowser ? 'Enabled' : 'Disabled'}`,
                vscode.TreeItemCollapsibleState.None,
                enableBrowser ? 'feature-enabled' : 'feature-disabled',
                'Browser automation feature'
            ));

            items.push(new StatusItem(
                `Research: ${enableResearch ? 'Enabled' : 'Disabled'}`,
                vscode.TreeItemCollapsibleState.None,
                enableResearch ? 'feature-enabled' : 'feature-disabled',
                'Web research feature'
            ));

            items.push(new StatusItem(
                `Auto-complete: ${enableAutoComplete ? 'Enabled' : 'Disabled'}`,
                vscode.TreeItemCollapsibleState.None,
                enableAutoComplete ? 'feature-enabled' : 'feature-disabled',
                'AI auto-completion feature'
            ));

        } catch (error) {
            items.push(new StatusItem(
                'Error loading status',
                vscode.TreeItemCollapsibleState.None,
                'error',
                `Failed to load status: ${error}`
            ));
        }

        return items;
    }
}

class StatusItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly statusType: string,
        public readonly description: string
    ) {
        super(label, collapsibleState);
        this.tooltip = description;
        
        // Set icons and colors based on status type
        switch (statusType) {
            case 'connected':
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
                break;
            case 'disconnected':
                this.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('charts.red'));
                break;
            case 'service-online':
                this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
                break;
            case 'service-offline':
                this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.red'));
                break;
            case 'models':
                this.iconPath = new vscode.ThemeIcon('brain');
                break;
            case 'config':
                this.iconPath = new vscode.ThemeIcon('settings');
                break;
            case 'feature-enabled':
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.blue'));
                break;
            case 'feature-disabled':
                this.iconPath = new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('charts.gray'));
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.orange'));
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}

