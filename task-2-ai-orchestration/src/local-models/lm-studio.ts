import { BaseAIProvider } from '../providers/base';
import { 
  AIRequest, 
  AIResponse, 
  AIModel, 
  ProviderCapabilities, 
  ProviderConfig
} from '../types';

interface LMStudioModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface LMStudioResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LMStudioProvider extends BaseAIProvider {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ProviderConfig) {
    super('lm-studio', 'local', config);
    this.baseUrl = config.baseUrl || 'http://localhost:1234';
    this.timeout = config.timeout || 60000;
    this.loadModels();
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error('LM Studio not available:', error);
      return false;
    }
  }

  async loadModels(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);
      if (!response.ok) {
        console.warn('Could not load LM Studio models');
        return;
      }

      const data = await response.json();
      this.models = data.data?.map((model: LMStudioModel) => this.mapLMStudioModel(model)) || [];
    } catch (error) {
      console.error('Error loading LM Studio models:', error);
      this.models = [];
    }
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const model = request.model || this.getDefaultModel();
    
    if (!model) {
      throw this.createError('NO_MODEL', 'No LM Studio models available');
    }

    try {
      const messages = this.buildMessages(request);
      
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: request.options?.temperature || 0.7,
          max_tokens: request.options?.maxTokens || 2048,
          top_p: request.options?.topP || 1,
          frequency_penalty: request.options?.frequencyPenalty || 0,
          presence_penalty: request.options?.presencePenalty || 0,
          stream: request.options?.stream || false
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`LM Studio request failed: ${response.statusText}`);
      }

      const data: LMStudioResponse = await response.json();
      const responseTime = Date.now() - startTime;
      const content = data.choices[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || this.estimateTokens(content);

      return this.createResponse(request.id, content, model, tokensUsed, responseTime);
    } catch (error: any) {
      throw this.createError(
        'REQUEST_FAILED',
        `LM Studio request failed: ${error.message}`,
        true
      );
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxConcurrentRequests: 5, // LM Studio can handle multiple requests but limited by local resources
      supportedModels: this.models.map(m => m.id),
      features: ['local_execution', 'no_api_key', 'privacy', 'openai_compatible'],
      rateLimits: []
    };
  }

  async getServerInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);
      if (!response.ok) {
        throw new Error(`Failed to get server info: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting LM Studio server info:', error);
      return null;
    }
  }

  async loadModel(modelPath: string): Promise<boolean> {
    try {
      // LM Studio doesn't have a direct API to load models
      // This would typically be done through the LM Studio UI
      console.warn('Model loading must be done through LM Studio UI');
      
      // Refresh the model list to see if it's available
      await this.loadModels();
      return this.models.some(m => m.id.includes(modelPath));
    } catch (error) {
      console.error('Error loading model in LM Studio:', error);
      return false;
    }
  }

  async unloadModel(): Promise<boolean> {
    try {
      // LM Studio doesn't have a direct API to unload models
      console.warn('Model unloading must be done through LM Studio UI');
      return true;
    } catch (error) {
      console.error('Error unloading model in LM Studio:', error);
      return false;
    }
  }

  private mapLMStudioModel(lmStudioModel: LMStudioModel): AIModel {
    const isCodeModel = this.isCodeModel(lmStudioModel.id);
    const contextWindow = this.getContextWindow(lmStudioModel.id);
    
    return {
      id: lmStudioModel.id,
      name: lmStudioModel.id,
      provider: 'lm-studio',
      type: 'chat',
      capabilities: {
        languages: isCodeModel 
          ? ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby']
          : ['text'],
        tasks: isCodeModel 
          ? ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'general_chat']
          : ['general_chat'],
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: false,
        supportsCode: isCodeModel
      },
      contextWindow,
      performance: {
        averageResponseTime: 4000, // Local models with good UI optimization
        reliability: 0.96,
        accuracy: this.getModelAccuracy(lmStudioModel.id),
        throughput: 25
      }
    };
  }

  private buildMessages(request: AIRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // Add system message based on request type
    const systemPrompt = this.getSystemPrompt(request.type);
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add context if available
    if (request.context && request.context.files.length > 0) {
      const contextContent = this.buildContextContent(request.context);
      if (contextContent) {
        messages.push({ role: 'user', content: `Context:\n${contextContent}` });
      }
    }

    // Add main user message
    messages.push({ role: 'user', content: request.content });

    return messages;
  }

  private getSystemPrompt(type: string): string {
    const prompts: Record<string, string> = {
      'code_generation': 'You are an expert software developer. Generate clean, efficient, and well-documented code following best practices.',
      'code_explanation': 'You are an expert code reviewer. Explain code clearly and thoroughly, breaking down complex concepts.',
      'code_refactoring': 'You are an expert software architect. Refactor code to improve quality, performance, and maintainability.',
      'bug_fixing': 'You are an expert debugger. Identify and fix bugs while explaining the root cause and prevention.',
      'documentation': 'You are a technical writer. Create clear, comprehensive documentation for developers.',
      'testing': 'You are a QA engineer. Write comprehensive tests that cover edge cases and ensure reliability.',
      'optimization': 'You are a performance engineer. Optimize code for speed and efficiency while maintaining readability.',
      'general_chat': 'You are a helpful AI assistant specialized in software development.'
    };
    return prompts[type] || prompts['general_chat'];
  }

  private buildContextContent(context: any): string {
    let content = '';
    
    if (context.currentFile) {
      content += `Current file: ${context.currentFile}\n`;
    }
    
    if (context.selection) {
      content += `Selected code:\n\`\`\`\n${context.selection.text}\n\`\`\`\n`;
    }
    
    if (context.files && context.files.length > 0) {
      content += '\nRelevant files:\n';
      context.files.slice(0, 3).forEach((file: any, index: number) => {
        content += `\n${index + 1}. ${file.path}:\n\`\`\`${file.language || ''}\n`;
        content += file.content?.substring(0, 600) || 'No content available';
        content += '\n```\n';
      });
    }
    
    if (context.dependencies && context.dependencies.length > 0) {
      content += '\nProject dependencies:\n';
      context.dependencies.slice(0, 8).forEach((dep: any) => {
        content += `- ${dep.name}@${dep.version}\n`;
      });
    }
    
    return content;
  }

  private isCodeModel(modelName: string): boolean {
    const codeModels = ['code', 'codellama', 'starcoder', 'deepseek-coder', 'phind-codellama', 'codegemma'];
    return codeModels.some(name => modelName.toLowerCase().includes(name));
  }

  private getContextWindow(modelName: string): number {
    // Common context windows for popular models in LM Studio
    if (modelName.includes('llama-2')) return 4096;
    if (modelName.includes('llama-3')) return 8192;
    if (modelName.includes('codellama')) return 16384;
    if (modelName.includes('mistral')) return 8192;
    if (modelName.includes('gemma')) return 8192;
    if (modelName.includes('phi')) return 4096;
    return 4096; // Default
  }

  private getModelAccuracy(modelName: string): number {
    // Accuracy estimates based on model size and type
    if (modelName.includes('70b')) return 0.91;
    if (modelName.includes('34b')) return 0.87;
    if (modelName.includes('13b')) return 0.84;
    if (modelName.includes('7b')) return 0.81;
    if (modelName.includes('3b')) return 0.78;
    return 0.80; // Default
  }

  private getDefaultModel(): string | null {
    if (this.models.length === 0) return null;
    
    // Prefer code models if available
    const codeModel = this.models.find(m => this.isCodeModel(m.id));
    if (codeModel) return codeModel.id;
    
    // Otherwise return the first available model
    return this.models[0].id;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

