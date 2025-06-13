"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = exports.GoogleAIProvider = exports.AnthropicProvider = exports.OpenAIProvider = exports.ProviderRegistry = exports.BaseAIProvider = void 0;
// Provider exports
var base_1 = require("./base");
Object.defineProperty(exports, "BaseAIProvider", { enumerable: true, get: function () { return base_1.BaseAIProvider; } });
Object.defineProperty(exports, "ProviderRegistry", { enumerable: true, get: function () { return base_1.ProviderRegistry; } });
var openai_1 = require("./openai");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_1.OpenAIProvider; } });
var anthropic_1 = require("./anthropic");
Object.defineProperty(exports, "AnthropicProvider", { enumerable: true, get: function () { return anthropic_1.AnthropicProvider; } });
var google_1 = require("./google");
Object.defineProperty(exports, "GoogleAIProvider", { enumerable: true, get: function () { return google_1.GoogleAIProvider; } });
const openai_2 = require("./openai");
const anthropic_2 = require("./anthropic");
const google_2 = require("./google");
class ProviderFactory {
    static createProvider(name, config) {
        switch (name.toLowerCase()) {
            case 'openai':
                return new openai_2.OpenAIProvider(config);
            case 'anthropic':
                return new anthropic_2.AnthropicProvider(config);
            case 'google':
                return new google_2.GoogleAIProvider(config);
            default:
                throw new Error(`Unknown provider: ${name}`);
        }
    }
    static getSupportedProviders() {
        return ['openai', 'anthropic', 'google'];
    }
}
exports.ProviderFactory = ProviderFactory;
//# sourceMappingURL=index.js.map