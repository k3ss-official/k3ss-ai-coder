import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

/**
 * Self-contained CLI Manager for command-line automation
 */
export class CLIManager {
    private context: vscode.ExtensionContext;
    private isInitialized: boolean = false;
    private availableCommands: Map<string, CLICommand>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.availableCommands = new Map();
    }

    async initialize(): Promise<void> {
        try {
            this.setupBuiltInCommands();
            this.isInitialized = true;
            console.log('CLI Manager initialized with built-in commands');
        } catch (error) {
            console.error('CLI Manager initialization failed:', error);
            throw error;
        }
    }

    async executeCommand(command: string, args: string[] = [], cwd?: string): Promise<any> {
        if (!this.isInitialized) {
            throw new Error('CLI Manager not initialized');
        }

        const config = vscode.workspace.getConfiguration('k3ss-ai');
        const enableCliIntegration = config.get('enableCliIntegration', true);
        
        if (!enableCliIntegration) {
            return {
                error: 'CLI integration is disabled in settings',
                command: command
            };
        }

        try {
            // Check if it's a built-in command
            if (this.availableCommands.has(command)) {
                return await this.executeBuiltInCommand(command, args, cwd);
            }
            
            // Execute system command
            return await this.executeSystemCommand(command, args, cwd);
        } catch (error) {
            return {
                error: `Command execution failed: ${error}`,
                command: command,
                args: args
            };
        }
    }

    async analyzeProject(): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { error: 'No workspace folder found' };
        }

        const projectPath = workspaceFolder.uri.fsPath;
        const analysis = {
            path: projectPath,
            name: path.basename(projectPath),
            files: await this.getProjectFiles(projectPath),
            packageJson: await this.getPackageJsonInfo(projectPath),
            gitInfo: await this.getGitInfo(projectPath),
            languages: await this.detectLanguages(projectPath),
            timestamp: new Date().toISOString()
        };

        return analysis;
    }

    async runGitCommand(gitCommand: string, args: string[] = []): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { error: 'No workspace folder found' };
        }

        const fullCommand = ['git', gitCommand, ...args];
        return await this.executeSystemCommand('git', [gitCommand, ...args], workspaceFolder.uri.fsPath);
    }

    async buildProject(): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { error: 'No workspace folder found' };
        }

        const projectPath = workspaceFolder.uri.fsPath;
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        try {
            // Check if it's a Node.js project
            const fs = require('fs');
            if (fs.existsSync(packageJsonPath)) {
                return await this.executeSystemCommand('npm', ['run', 'build'], projectPath);
            }
            
            // Check for other build systems
            const makefilePath = path.join(projectPath, 'Makefile');
            if (fs.existsSync(makefilePath)) {
                return await this.executeSystemCommand('make', [], projectPath);
            }
            
            return {
                message: 'No recognized build system found',
                suggestions: ['npm run build', 'make', 'cargo build', 'go build']
            };
        } catch (error) {
            return { error: `Build failed: ${error}` };
        }
    }

    private setupBuiltInCommands(): void {
        this.availableCommands.set('analyze', {
            name: 'analyze',
            description: 'Analyze code for security, performance, and quality issues',
            execute: async (args: string[], cwd?: string) => {
                return await this.analyzeProject();
            }
        });

        this.availableCommands.set('generate', {
            name: 'generate',
            description: 'Generate code, components, and project scaffolding',
            execute: async (args: string[], cwd?: string) => {
                const type = args[0] || 'component';
                const name = args[1] || 'example';
                return this.generateCode(type, name);
            }
        });

        this.availableCommands.set('git', {
            name: 'git',
            description: 'Git workflow integration and automation',
            execute: async (args: string[], cwd?: string) => {
                return await this.runGitCommand(args[0] || 'status', args.slice(1));
            }
        });

        this.availableCommands.set('build', {
            name: 'build',
            description: 'Build system integration and analysis',
            execute: async (args: string[], cwd?: string) => {
                return await this.buildProject();
            }
        });

        this.availableCommands.set('config', {
            name: 'config',
            description: 'Manage K3SS AI configuration',
            execute: async (args: string[], cwd?: string) => {
                return this.manageConfig(args);
            }
        });

        this.availableCommands.set('help', {
            name: 'help',
            description: 'Show help information',
            execute: async (args: string[], cwd?: string) => {
                return this.getHelpInfo();
            }
        });
    }

    private async executeBuiltInCommand(command: string, args: string[], cwd?: string): Promise<any> {
        const cmd = this.availableCommands.get(command);
        if (!cmd) {
            return { error: `Unknown built-in command: ${command}` };
        }

        try {
            return await cmd.execute(args, cwd);
        } catch (error) {
            return { error: `Built-in command failed: ${error}` };
        }
    }

    private async executeSystemCommand(command: string, args: string[], cwd?: string): Promise<any> {
        return new Promise((resolve) => {
            const workingDir = cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
            
            const child = cp.spawn(command, args, {
                cwd: workingDir,
                shell: true
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({
                    command: command,
                    args: args,
                    exitCode: code,
                    stdout: stdout,
                    stderr: stderr,
                    cwd: workingDir,
                    timestamp: new Date().toISOString()
                });
            });

            child.on('error', (error) => {
                resolve({
                    command: command,
                    args: args,
                    error: error.message,
                    cwd: workingDir,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }

    private async getProjectFiles(projectPath: string): Promise<string[]> {
        try {
            const fs = require('fs');
            const files = fs.readdirSync(projectPath);
            return files.filter((file: string) => !file.startsWith('.') && !file.includes('node_modules'));
        } catch (error) {
            return [];
        }
    }

    private async getPackageJsonInfo(projectPath: string): Promise<any> {
        try {
            const fs = require('fs');
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const content = fs.readFileSync(packageJsonPath, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    private async getGitInfo(projectPath: string): Promise<any> {
        try {
            const gitPath = path.join(projectPath, '.git');
            const fs = require('fs');
            if (fs.existsSync(gitPath)) {
                return {
                    isGitRepo: true,
                    gitPath: gitPath
                };
            }
        } catch (error) {
            return { isGitRepo: false };
        }
        return { isGitRepo: false };
    }

    private async detectLanguages(projectPath: string): Promise<string[]> {
        try {
            const fs = require('fs');
            const files = fs.readdirSync(projectPath);
            const extensions = new Set<string>();
            
            files.forEach((file: string) => {
                const ext = path.extname(file);
                if (ext) {
                    extensions.add(ext);
                }
            });

            const languageMap: { [key: string]: string } = {
                '.js': 'JavaScript',
                '.ts': 'TypeScript',
                '.py': 'Python',
                '.java': 'Java',
                '.cpp': 'C++',
                '.c': 'C',
                '.cs': 'C#',
                '.go': 'Go',
                '.rs': 'Rust',
                '.php': 'PHP',
                '.rb': 'Ruby'
            };

            return Array.from(extensions).map(ext => languageMap[ext] || ext).filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    private generateCode(type: string, name: string): any {
        const templates: { [key: string]: string } = {
            component: `// Generated ${name} component
export class ${name} {
    constructor() {
        console.log('${name} component created');
    }
    
    render() {
        return '<div>${name} Component</div>';
    }
}`,
            function: `// Generated ${name} function
export function ${name}() {
    // TODO: Implement ${name} functionality
    console.log('${name} function called');
    return true;
}`,
            class: `// Generated ${name} class
export class ${name} {
    constructor() {
        // Initialize ${name}
    }
    
    // Add methods here
}`
        };

        const template = templates[type] || templates.function;
        
        return {
            type: type,
            name: name,
            code: template,
            timestamp: new Date().toISOString()
        };
    }

    private manageConfig(args: string[]): any {
        const action = args[0] || 'show';
        const config = vscode.workspace.getConfiguration('k3ss-ai');
        
        switch (action) {
            case 'show':
                return {
                    action: 'show',
                    config: {
                        aiProvider: config.get('aiProvider'),
                        enableBrowserAutomation: config.get('enableBrowserAutomation'),
                        enableWebResearch: config.get('enableWebResearch'),
                        enableCliIntegration: config.get('enableCliIntegration')
                    }
                };
            case 'set':
                return {
                    action: 'set',
                    message: 'Use VS Code settings to modify configuration',
                    path: 'File > Preferences > Settings > K3SS AI'
                };
            default:
                return {
                    error: `Unknown config action: ${action}`,
                    availableActions: ['show', 'set']
                };
        }
    }

    private getHelpInfo(): any {
        const commands = Array.from(this.availableCommands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description
        }));

        return {
            title: 'K3SS AI CLI Commands',
            commands: commands,
            usage: 'Use the command palette or chat interface to run these commands',
            examples: [
                'analyze - Analyze current project',
                'generate component MyComponent - Generate a new component',
                'git status - Check git status',
                'build - Build the project'
            ]
        };
    }

    getAvailableCommands(): string[] {
        return Array.from(this.availableCommands.keys());
    }

    isReady(): boolean {
        return this.isInitialized;
    }
}

interface CLICommand {
    name: string;
    description: string;
    execute: (args: string[], cwd?: string) => Promise<any>;
}

