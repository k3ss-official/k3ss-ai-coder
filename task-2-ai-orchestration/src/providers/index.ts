// Provider exports
export { BaseAIProvider, ProviderRegistry } from './base';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GoogleAIProvider } from './google';

// Provider factory
import { AIProvider, ProviderConfig } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleAIProvider } from './google';

export class ProviderFactory {
  static createProvider(name: string, config: ProviderConfig): AIProvider {
    switch (name.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'google':
        return new GoogleAIProvider(config);
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'google'];
  }
}

