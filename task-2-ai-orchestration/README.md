# AI Orchestration & Model Integration Engine

A comprehensive TypeScript-based system for orchestrating multiple AI providers, managing local models, intelligent routing, context management, and response processing for the K3SS Ultimate AI Code Assistant.

## 🚀 Features

### Multi-Provider AI Integration
- **Cloud Providers**: OpenAI, Anthropic, Google AI
- **Local Models**: Ollama, llama.cpp, LM Studio, Hugging Face Transformers
- **Unified API**: Single interface for all providers
- **Automatic Failover**: Seamless switching between providers

### Intelligent Model Routing
- **Performance-Based**: Selects optimal models based on accuracy, speed, and reliability
- **Cost-Optimized**: Prioritizes cost-effective models while maintaining quality
- **Latency-Optimized**: Fastest response times for real-time applications
- **Quality-Optimized**: Highest accuracy for critical tasks
- **Adaptive Learning**: Improves routing decisions over time

### Advanced Context Management
- **Large Project Support**: Handles 100k+ files efficiently
- **Intelligent Context Selection**: Relevance-based file selection
- **Relationship Mapping**: Analyzes file dependencies and relationships
- **Context Compression**: Optimizes context for token limits
- **Real-time Updates**: Tracks file changes and updates context

### Response Processing & Validation
- **Syntax Validation**: Checks code syntax across multiple languages
- **Quality Scoring**: Comprehensive quality metrics
- **Content Formatting**: Task-specific response formatting
- **Caching System**: Intelligent response caching for performance
- **Error Detection**: Identifies and reports potential issues

## 📦 Installation

```bash
npm install @k3ss/ai-orchestration
```

## 🔧 Quick Start

```typescript
import { AIOrchestrationEngine, createDefaultConfig } from '@k3ss/ai-orchestration';

// Create engine with default configuration
const config = createDefaultConfig();
const engine = new AIOrchestrationEngine(config);

// Configure providers and models
const orchestrationConfig = {
  providers: [
    {
      name: 'openai',
      type: 'cloud',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1'
    },
    {
      name: 'anthropic',
      type: 'cloud',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  ],
  localModels: [
    {
      framework: 'ollama',
      enabled: true,
      baseURL: 'http://localhost:11434'
    }
  ]
};

// Initialize and start
await engine.initialize(orchestrationConfig);
await engine.start();

console.log('AI Orchestration Engine running on http://localhost:3000');
```

## 🌐 API Endpoints

### Core AI Operations
- `POST /ai/request` - Process AI requests with intelligent routing
- `POST /ai/select-model` - Get optimal model selection for a request

### Context Management
- `POST /context/initialize` - Initialize project context
- `GET /context/stats` - Get context analysis statistics

### Provider Management
- `GET /providers` - List all registered providers
- `GET /models` - List all available models

### Local Model Management
- `GET /local-models/status` - Get local model system status
- `POST /local-models/install` - Install new local models

### System Monitoring
- `GET /health` - System health check
- `GET /router/metrics` - Routing performance metrics
- `GET /processing/cache-stats` - Response cache statistics

## 🔧 Configuration

### Router Configuration
```typescript
const routerConfig = {
  defaultStrategy: 'performance', // 'performance' | 'cost-optimized' | 'latency-optimized' | 'quality-optimized'
  fallbackEnabled: true,
  maxRetries: 3,
  retryDelay: 1000,
  performanceTracking: true,
  adaptiveLearning: true
};
```

### Context Management Configuration
```typescript
const contextConfig = {
  maxFiles: 100,
  maxTokens: 50000,
  relevanceThreshold: 0.3,
  compressionEnabled: true,
  cacheEnabled: true,
  analysisDepth: 'medium', // 'shallow' | 'medium' | 'deep'
  autoRefresh: false,
  refreshInterval: 30
};
```

### Processing Configuration
```typescript
const processingConfig = {
  cacheEnabled: true,
  cacheSize: 1000,
  cacheTTL: 60, // minutes
  formatEnabled: true,
  optimizationEnabled: true,
  qualityThreshold: 0.7
};
```

## 🤖 Supported Models

### Cloud Providers
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google**: Gemini Pro, Gemini 1.5 Pro

### Local Models
- **Ollama**: Code Llama, DeepSeek Coder, Llama 3, Mistral
- **llama.cpp**: Direct GGUF model execution
- **LM Studio**: Local API-compatible models
- **Hugging Face**: Transformers library integration

## 📊 Routing Strategies

### Performance-Based (Default)
Balances accuracy, speed, cost, and reliability for optimal overall performance.

### Cost-Optimized
Prioritizes free local models and cheapest cloud options while maintaining quality.

### Latency-Optimized
Selects fastest responding models for real-time applications.

### Quality-Optimized
Chooses highest accuracy models regardless of cost or speed.

## 🔍 Context Analysis

The system automatically analyzes project structure to provide relevant context:

- **File Relationships**: Import/export dependencies, inheritance, composition
- **Code Patterns**: Function calls, class definitions, variable usage
- **Project Clusters**: Groups of related files
- **Entry Points**: Main application files
- **Language Detection**: Automatic programming language identification

## 📈 Performance Monitoring

Built-in metrics and monitoring:

- **Request Metrics**: Success rate, response times, error rates
- **Model Usage**: Usage statistics per model and provider
- **Cache Performance**: Hit rates, memory usage, cleanup cycles
- **Context Efficiency**: Relevance scores, compression ratios

## 🛠️ Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Linting
```bash
npm run lint
```

## 🔒 Security

- **API Key Management**: Secure storage and rotation
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Configurable rate limits per provider
- **Error Handling**: Graceful error handling and logging

## 🌟 Advanced Features

### WebSocket Support
Real-time AI request processing with WebSocket connections.

### Adaptive Learning
The system learns from usage patterns to improve routing decisions.

### Context Compression
Intelligent context compression for large projects exceeding token limits.

### Multi-Language Support
Comprehensive support for all major programming languages.

## 📝 Examples

See the `examples/` directory for comprehensive usage examples:

- `test-integration.ts` - Basic integration test
- `advanced-routing.ts` - Custom routing strategies
- `context-management.ts` - Project context handling
- `local-models.ts` - Local model management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- GitHub Issues: [k3ss-official/k3ss-ai-coder](https://github.com/k3ss-official/k3ss-ai-coder)
- Documentation: [docs.k3ss.dev](https://docs.k3ss.dev)

---

Built with ❤️ by the K3SS Team

