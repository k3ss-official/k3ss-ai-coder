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
exports.AIAssistantProvider = void 0;
const vscode = __importStar(require("vscode"));
class AIAssistantProvider {
    constructor(integrationManager) {
        this.integrationManager = integrationManager;
    }
    async chat(message, context) {
        try {
            const response = await this.integrationManager.sendChatMessage(message, context);
            return response;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Chat error: ${error}`);
            throw error;
        }
    }
    async generateCode(prompt, language) {
        try {
            const response = await this.integrationManager.generateCode(prompt, language);
            return response.code || '';
        }
        catch (error) {
            vscode.window.showErrorMessage(`Code generation error: ${error}`);
            throw error;
        }
    }
    async analyzeCode(code, language) {
        try {
            const response = await this.integrationManager.analyzeCode(code, language);
            return response;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Code analysis error: ${error}`);
            throw error;
        }
    }
    async refactorCode(code, instructions, language) {
        try {
            const response = await this.integrationManager.refactorCode(code, instructions, language);
            return response.code || '';
        }
        catch (error) {
            vscode.window.showErrorMessage(`Code refactoring error: ${error}`);
            throw error;
        }
    }
    async researchWeb(query) {
        try {
            const response = await this.integrationManager.researchWeb(query);
            return response;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Web research error: ${error}`);
            throw error;
        }
    }
    async getContext() {
        const editor = vscode.window.activeTextEditor;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        return {
            activeFile: editor?.document.fileName,
            selection: editor?.selection,
            selectedText: editor?.document.getText(editor?.selection),
            language: editor?.document.languageId,
            workspaceRoot: workspaceFolder?.uri.fsPath,
            openFiles: vscode.workspace.textDocuments.map(doc => doc.fileName)
        };
    }
}
exports.AIAssistantProvider = AIAssistantProvider;
//# sourceMappingURL=AIAssistantProvider.js.map