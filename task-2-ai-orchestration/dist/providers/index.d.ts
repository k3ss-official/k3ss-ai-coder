export { BaseAIProvider, ProviderRegistry } from './base';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GoogleAIProvider } from './google';
import { AIProvider, ProviderConfig } from '../types';
export declare class ProviderFactory {
    static createProvider(name: string, config: ProviderConfig): AIProvider;
    static getSupportedProviders(): string[];
}
//# sourceMappingURL=index.d.ts.map