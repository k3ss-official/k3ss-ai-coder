import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { BaseAIProvider } from '../providers/base';
import { 
  AIRequest, 
  AIResponse, 
  AIModel, 
  ProviderCapabilities, 
  ProviderConfig,
  LocalModelConfig,
  LocalModelParameters
} from '../types';

interface LlamaCppConfig extends LocalModelConfig {
  executablePath: string;
  modelPath: string;
  parameters: LlamaCppParameters;
}

interface LlamaCppParameters extends LocalModelParameters {
  nCtx?: number;        // Context length
  nBatch?: number;      // Batch size
  nThreads?: number;    // Number of threads
  nGpuLayers?: number;  // GPU layers
  mmap?: boolean;       // Use memory mapping
  mlock?: boolean;      // Lock memory
}

export class LlamaCppProvider extends BaseAIProvider {
  private config: LlamaCppConfig;
  private processes: Map<string, ChildProcess> = new Map();

  constructor(config: LlamaCppConfig) {
    super('llama-cpp', 'local', config);
    this.config = config;
    this.loadModels();
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if llama.cpp executable exists
      await fs.access(this.config.executablePath);
      
      // Check if model file exists
      if (this.config.modelPath) {
        await fs.access(this.config.modelPath);
      }
      
      return true;
    } catch (error) {
      console.error('llama.cpp not available:', error);
      return false;
    }
  }

  async loadModels(): Promise<void> {
    if (!this.config.modelPath) {
      this.models = [];
      return;
    }

    try {
      const modelName = path.basename(this.config.modelPath, path.extname(this.config.modelPath));
      const stats = await fs.stat(this.config.modelPath);
      
      this.models = [{
        id: modelName,
        name: modelName,
        provider: 'llama-cpp',
        type: 'chat',
        capabilities: {
          languages: this.isCodeModel(modelName) 
            ? ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby']
            : ['text'],
          tasks: this.isCodeModel(modelName)
            ? ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'general_chat']
            : ['general_chat'],
          maxTokens: this.config.parameters.contextLength || 2048,
          supportsStreaming: true,
          supportsImages: false,
          supportsCode: this.isCodeModel(modelName)
        },
        contextWindow: this.config.parameters.contextLength || 2048,
        performance: {
          averageResponseTime: 8000, // llama.cpp can be slower
          reliability: 0.93,
          accuracy: this.getModelAccuracy(modelName),
          throughput: 15
        }
      }];
    } catch (error) {
      console.error('Error loading llama.cpp model:', error);
      this.models = [];
    }
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request);
    
    if (this.models.length === 0) {
      throw this.createError('NO_MODEL', 'No llama.cpp models available');
    }

    const startTime = Date.now();
    const model = this.models[0]; // llama.cpp typically runs one model at a time
    
    try {
      const prompt = this.buildPrompt(request);
      const response = await this.executeModel(prompt, request);
      const responseTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(prompt + response);

      return this.createResponse(request.id, response, model.id, tokensUsed, responseTime);
    } catch (error: any) {
      throw this.createError(
        'REQUEST_FAILED',
        `llama.cpp request failed: ${error.message}`,
        true
      );
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxConcurrentRequests: 1, // llama.cpp typically handles one request at a time
      supportedModels: this.models.map(m => m.id),
      features: ['local_execution', 'no_api_key', 'privacy', 'gpu_acceleration'],
      rateLimits: []
    };
  }

  private async executeModel(prompt: string, request: AIRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = this.buildArgs(prompt, request);
      
      const process = spawn(this.config.executablePath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Extract the response from the output
          const response = this.extractResponse(output, prompt);
          resolve(response);
        } else {
          reject(new Error(`llama.cpp process exited with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Set timeout
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error('llama.cpp request timeout'));
      }, this.config.timeout || 60000);

      process.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  private buildArgs(prompt: string, request: AIRequest): string[] {
    const args = [
      '--model', this.config.modelPath,
      '--prompt', prompt,
      '--n-predict', (request.options?.maxTokens || 512).toString(),
      '--temp', (request.options?.temperature || 0.7).toString(),
      '--top-p', (request.options?.topP || 1).toString(),
      '--ctx-size', (this.config.parameters.nCtx || 2048).toString(),
      '--batch-size', (this.config.parameters.nBatch || 512).toString(),
      '--threads', (this.config.parameters.nThreads || 4).toString()
    ];

    if (this.config.parameters.nGpuLayers) {
      args.push('--n-gpu-layers', this.config.parameters.nGpuLayers.toString());
    }

    if (this.config.parameters.mmap !== false) {
      args.push('--mmap');
    }

    if (this.config.parameters.mlock) {
      args.push('--mlock');
    }

    // Add interactive mode for better control
    args.push('--interactive-first');

    return args;
  }

  private extractResponse(output: string, prompt: string): string {
    // Remove the prompt from the output and clean up
    let response = output;
    
    // Find where the actual response starts (after the prompt)
    const promptIndex = response.indexOf(prompt);
    if (promptIndex !== -1) {
      response = response.substring(promptIndex + prompt.length);
    }

    // Clean up common llama.cpp output artifacts
    response = response
      .replace(/^[\s\n]*/, '') // Remove leading whitespace
      .replace(/\[end of text\].*$/s, '') // Remove end markers
      .replace(/^>.*$/gm, '') // Remove prompt indicators
      .trim();

    return response;
  }

  private buildPrompt(request: AIRequest): string {
    let prompt = '';

    // Add system instruction
    const systemInstruction = this.getSystemInstruction(request.type);
    if (systemInstruction) {
      prompt += `System: ${systemInstruction}\n\n`;
    }

    // Add context if available
    if (request.context && request.context.files.length > 0) {
      const contextContent = this.buildContextContent(request.context);
      if (contextContent) {
        prompt += `Context:\n${contextContent}\n\n`;
      }
    }

    // Add main user request
    prompt += `Human: ${request.content}\n\nAssistant:`;

    return prompt;
  }

  private getSystemInstruction(type: string): string {
    const instructions: Record<string, string> = {
      'code_generation': 'You are an expert software developer. Generate clean, efficient code.',
      'code_explanation': 'You are an expert code reviewer. Explain code clearly.',
      'code_refactoring': 'You are an expert software architect. Refactor code to improve quality.',
      'bug_fixing': 'You are an expert debugger. Identify and fix bugs.',
      'documentation': 'You are a technical writer. Create clear documentation.',
      'testing': 'You are a QA engineer. Write comprehensive tests.',
      'optimization': 'You are a performance engineer. Optimize code.',
      'general_chat': 'You are a helpful AI assistant for software development.'
    };
    return instructions[type] || instructions['general_chat'];
  }

  private buildContextContent(context: any): string {
    let content = '';
    
    if (context.currentFile) {
      content += `Current file: ${context.currentFile}\n`;
    }
    
    if (context.selection) {
      content += `Selected code:\n${context.selection.text}\n`;
    }
    
    if (context.files && context.files.length > 0) {
      content += '\nRelevant files:\n';
      context.files.slice(0, 2).forEach((file: any) => {
        content += `${file.path}: ${file.content?.substring(0, 300) || 'No content'}\n`;
      });
    }
    
    return content;
  }

  private isCodeModel(modelName: string): boolean {
    const codeModels = ['code', 'codellama', 'starcoder', 'deepseek'];
    return codeModels.some(name => modelName.toLowerCase().includes(name));
  }

  private getModelAccuracy(modelName: string): number {
    if (modelName.includes('70b')) return 0.90;
    if (modelName.includes('34b')) return 0.86;
    if (modelName.includes('13b')) return 0.83;
    if (modelName.includes('7b')) return 0.80;
    return 0.78;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Utility methods for model management
  async loadModel(modelPath: string): Promise<boolean> {
    try {
      await fs.access(modelPath);
      this.config.modelPath = modelPath;
      await this.loadModels();
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }

  async unloadModel(): Promise<void> {
    // Kill any running processes
    for (const [id, process] of this.processes) {
      process.kill();
      this.processes.delete(id);
    }
  }

  getModelInfo(): any {
    if (this.models.length === 0) return null;
    
    return {
      model: this.models[0],
      config: this.config,
      status: 'loaded'
    };
  }
}

