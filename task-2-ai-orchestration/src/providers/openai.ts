import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import { 
  AIRequest, 
  AIResponse, 
  AIModel, 
  ProviderCapabilities, 
  ProviderConfig,
  ModelCapabilities,
  PerformanceMetrics,
  TaskType
} from '../types';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super('openai', 'cloud', config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000
    });
    this.loadModels();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI provider not available:', error);
      return false;
    }
  }

  async loadModels(): Promise<void> {
    this.models = [
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        type: 'chat',
        capabilities: {
          languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
          tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'optimization', 'general_chat'],
          maxTokens: 4096,
          supportsStreaming: true,
          supportsImages: false,
          supportsCode: true
        },
        contextWindow: 128000,
        costPerToken: 0.00001,
        performance: {
          averageResponseTime: 2000,
          reliability: 0.99,
          accuracy: 0.95,
          throughput: 100
        }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        type: 'chat',
        capabilities: {
          languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
          tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'optimization', 'general_chat'],
          maxTokens: 4096,
          supportsStreaming: true,
          supportsImages: false,
          supportsCode: true
        },
        contextWindow: 8192,
        costPerToken: 0.00003,
        performance: {
          averageResponseTime: 3000,
          reliability: 0.99,
          accuracy: 0.94,
          throughput: 80
        }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        type: 'chat',
        capabilities: {
          languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
          tasks: ['code_generation', 'code_explanation', 'code_refactoring', 'bug_fixing', 'documentation', 'testing', 'general_chat'],
          maxTokens: 4096,
          supportsStreaming: true,
          supportsImages: false,
          supportsCode: true
        },
        contextWindow: 16384,
        costPerToken: 0.000001,
        performance: {
          averageResponseTime: 1000,
          reliability: 0.98,
          accuracy: 0.88,
          throughput: 150
        }
      },
      {
        id: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision',
        provider: 'openai',
        type: 'multimodal',
        capabilities: {
          languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
          tasks: ['code_generation', 'code_explanation', 'documentation', 'general_chat'],
          maxTokens: 4096,
          supportsStreaming: true,
          supportsImages: true,
          supportsCode: true
        },
        contextWindow: 128000,
        costPerToken: 0.00001,
        performance: {
          averageResponseTime: 4000,
          reliability: 0.97,
          accuracy: 0.92,
          throughput: 60
        }
      }
    ];
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const model = request.model || 'gpt-4-turbo-preview';
    
    try {
      const messages = this.buildMessages(request);
      
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: request.options?.temperature || 0.7,
        max_tokens: request.options?.maxTokens || 4096,
        top_p: request.options?.topP || 1,
        frequency_penalty: request.options?.frequencyPenalty || 0,
        presence_penalty: request.options?.presencePenalty || 0,
        stream: request.options?.stream || false
      });

      const responseTime = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      return this.createResponse(request.id, content, model, tokensUsed, responseTime);
    } catch (error: any) {
      throw this.createError(
        'REQUEST_FAILED',
        `OpenAI request failed: ${error.message}`,
        error.status >= 500
      );
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxConcurrentRequests: 100,
      supportedModels: this.models.map(m => m.id),
      features: ['streaming', 'vision', 'function_calling', 'json_mode'],
      rateLimits: [
        { requests: 3500, window: 60 }, // 3500 requests per minute
        { requests: 10000, window: 3600 } // 10000 requests per hour
      ]
    };
  }

  private buildMessages(request: AIRequest): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

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
      'code_generation': 'You are an expert software developer. Generate clean, efficient, and well-documented code.',
      'code_explanation': 'You are an expert code reviewer. Explain code clearly and thoroughly.',
      'code_refactoring': 'You are an expert software architect. Refactor code to improve quality, performance, and maintainability.',
      'bug_fixing': 'You are an expert debugger. Identify and fix bugs while explaining the root cause.',
      'documentation': 'You are a technical writer. Create clear, comprehensive documentation.',
      'testing': 'You are a QA engineer. Write comprehensive tests that cover edge cases.',
      'optimization': 'You are a performance engineer. Optimize code for speed and efficiency.',
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
      content += `Selected text: ${context.selection.text}\n`;
    }
    
    if (context.files && context.files.length > 0) {
      content += 'Relevant files:\n';
      context.files.slice(0, 5).forEach((file: any) => {
        content += `- ${file.path}: ${file.content?.substring(0, 500) || 'No content'}\n`;
      });
    }
    
    return content;
  }
}

