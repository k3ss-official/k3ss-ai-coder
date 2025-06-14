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
exports.StatusTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class StatusTreeProvider {
    constructor(integrationManager) {
        this.integrationManager = integrationManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            return this.getStatusItems();
        }
        return [];
    }
    async getStatusItems() {
        const items = [];
        try {
            // Connection status
            const isConnected = this.integrationManager.isServiceConnected();
            items.push(new StatusItem(`Gateway: ${isConnected ? 'Connected' : 'Disconnected'}`, vscode.TreeItemCollapsibleState.None, isConnected ? 'connected' : 'disconnected', isConnected ? 'Integration gateway is online' : 'Integration gateway is offline'));
            if (isConnected) {
                // Get service status
                const status = await this.integrationManager.getServiceStatus();
                if (status.services) {
                    Object.entries(status.services).forEach(([serviceName, serviceStatus]) => {
                        items.push(new StatusItem(`${serviceName}: ${serviceStatus.status || 'Unknown'}`, vscode.TreeItemCollapsibleState.None, serviceStatus.status === 'online' ? 'service-online' : 'service-offline', `${serviceName} service on port ${serviceStatus.port || 'unknown'}`));
                    });
                }
                // Available models
                try {
                    const models = await this.integrationManager.getAvailableModels();
                    items.push(new StatusItem(`Models: ${models.length} available`, vscode.TreeItemCollapsibleState.None, 'models', models.join(', ') || 'No models available'));
                }
                catch (error) {
                    items.push(new StatusItem('Models: Error loading', vscode.TreeItemCollapsibleState.None, 'error', 'Failed to load available models'));
                }
            }
            // Configuration status
            const config = vscode.workspace.getConfiguration('k3ss-ai');
            const apiEndpoint = config.get('apiEndpoint', 'http://localhost:9000');
            const preferredModel = config.get('preferredModel', 'auto');
            items.push(new StatusItem(`Endpoint: ${apiEndpoint}`, vscode.TreeItemCollapsibleState.None, 'config', `API endpoint configuration`));
            items.push(new StatusItem(`Model: ${preferredModel}`, vscode.TreeItemCollapsibleState.None, 'config', `Preferred model setting`));
            // Feature status
            const enableBrowser = config.get('enableBrowserAutomation', true);
            const enableResearch = config.get('enableWebResearch', true);
            const enableAutoComplete = config.get('enableAutoCompletion', true);
            items.push(new StatusItem(`Browser: ${enableBrowser ? 'Enabled' : 'Disabled'}`, vscode.TreeItemCollapsibleState.None, enableBrowser ? 'feature-enabled' : 'feature-disabled', 'Browser automation feature'));
            items.push(new StatusItem(`Research: ${enableResearch ? 'Enabled' : 'Disabled'}`, vscode.TreeItemCollapsibleState.None, enableResearch ? 'feature-enabled' : 'feature-disabled', 'Web research feature'));
            items.push(new StatusItem(`Auto-complete: ${enableAutoComplete ? 'Enabled' : 'Disabled'}`, vscode.TreeItemCollapsibleState.None, enableAutoComplete ? 'feature-enabled' : 'feature-disabled', 'AI auto-completion feature'));
        }
        catch (error) {
            items.push(new StatusItem('Error loading status', vscode.TreeItemCollapsibleState.None, 'error', `Failed to load status: ${error}`));
        }
        return items;
    }
}
exports.StatusTreeProvider = StatusTreeProvider;
class StatusItem extends vscode.TreeItem {
    constructor(label, collapsibleState, statusType, description) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.statusType = statusType;
        this.description = description;
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
//# sourceMappingURL=StatusTreeProvider.js.map