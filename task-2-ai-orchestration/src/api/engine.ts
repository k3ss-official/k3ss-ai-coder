import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { 
  AIRequest, 
  AIResponse, 
  AIOrchestrationConfig,
  HealthStatus,
  APIResponse
} from '../types';

import { ProviderRegistry, ProviderFactory } from '../providers';
import { LocalModelManager } from '../local-models';
import { ModelRouter, RouterConfig } from '../router';
import { ContextManager, ContextManagerConfig } from '../context';
import { ResponseProcessor, ProcessingConfig } from '../processing';

export interface OrchestrationEngineConfig {
  port: number;
  host: string;
  cors: boolean;
  websocket: boolean;
  router: RouterConfig;
  context: ContextManagerConfig;
  processing: ProcessingConfig;
}

export class AIOrchestrationEngine {
  private app: express.Application;
  private server: any;
  private wsServer: WebSocketServer | null = null;
  
  private providerRegistry: ProviderRegistry;
  private localModelManager: LocalModelManager;
  private modelRouter: ModelRouter;
  private contextManager: ContextManager;
  private responseProcessor: ResponseProcessor;
  
  private config: OrchestrationEngineConfig;
  private isInitialized: boolean = false;

  constructor(config: OrchestrationEngineConfig) {
    this.config = config;
    this.app = express();
    
    // Initialize components
    this.providerRegistry = new ProviderRegistry();
    this.localModelManager = new LocalModelManager({});
    this.modelRouter = new ModelRouter(config.router);
    this.contextManager = new ContextManager(config.context);
    this.responseProcessor = new ResponseProcessor(config.processing);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  public async initialize(orchestrationConfig: AIOrchestrationConfig): Promise<void> {
    console.log('Initializing AI Orchestration Engine...');

    try {
      // Initialize cloud providers
      for (const providerConfig of orchestrationConfig.providers) {
        const provider = ProviderFactory.createProvider(providerConfig.name, providerConfig);
        this.providerRegistry.register(provider);
        this.modelRouter.registerProvider(provider);
        console.log(`Registered provider: ${providerConfig.name}`);
      }

      // Initialize local models
      this.localModelManager = new LocalModelManager({
        ollama: orchestrationConfig.localModels.find(m => m.framework === 'ollama'),
        llamaCpp: orchestrationConfig.localModels.find(m => m.framework === 'llama-cpp'),
        lmStudio: orchestrationConfig.localModels.find(m => m.framework === 'lm-studio'),
        huggingFace: orchestrationConfig.localModels.find(m => m.framework === 'transformers')
      });

      // Register local providers with router
      const localProviders = this.localModelManager.getAllProviders();
      for (const provider of localProviders) {
        this.modelRouter.registerProvider(provider);
        console.log(`Registered local provider: ${provider.name}`);
      }

      this.isInitialized = true;
      console.log('AI Orchestration Engine initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize AI Orchestration Engine:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        console.log(`AI Orchestration Engine listening on ${this.config.host}:${this.config.port}`);
        
        if (this.config.websocket) {
          this.setupWebSocket();
        }
        
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }

    if (this.wsServer) {
      this.wsServer.close();
    }

    // Cleanup components
    this.contextManager.destroy();
    this.responseProcessor.destroy();
    
    console.log('AI Orchestration Engine stopped');
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    if (this.config.cors) {
      this.app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }));
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('API Error:', error);
      res.status(500).json(this.createErrorResponse('Internal server error', error.message));
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.getHealthStatus();
        res.json(this.createSuccessResponse(health));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Health check failed', error.message));
      }
    });

    // Main AI request endpoint
    this.app.post('/ai/request', async (req, res) => {
      try {
        const request: AIRequest = req.body;
        const response = await this.processAIRequest(request);
        res.json(this.createSuccessResponse(response));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('AI request failed', error.message));
      }
    });

    // Model selection endpoint
    this.app.post('/ai/select-model', async (req, res) => {
      try {
        const { request, constraints, strategy } = req.body;
        const selection = await this.modelRouter.selectOptimalModel(request, constraints, strategy);
        res.json(this.createSuccessResponse(selection));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Model selection failed', error.message));
      }
    });

    // Context management endpoints
    this.app.post('/context/initialize', async (req, res) => {
      try {
        const { projectRoot } = req.body;
        await this.contextManager.initializeProject(projectRoot);
        res.json(this.createSuccessResponse({ message: 'Project initialized' }));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Context initialization failed', error.message));
      }
    });

    this.app.get('/context/stats', async (req, res) => {
      try {
        const stats = this.contextManager.getProjectStats();
        res.json(this.createSuccessResponse(stats));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get context stats', error.message));
      }
    });

    // Provider management endpoints
    this.app.get('/providers', async (req, res) => {
      try {
        const providers = this.providerRegistry.getAll().map(p => ({
          name: p.name,
          type: p.type,
          modelCount: p.models.length,
          capabilities: p.getCapabilities()
        }));
        res.json(this.createSuccessResponse(providers));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get providers', error.message));
      }
    });

    this.app.get('/models', async (req, res) => {
      try {
        const models = this.providerRegistry.getAllModels();
        res.json(this.createSuccessResponse(models));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get models', error.message));
      }
    });

    // Local model management
    this.app.get('/local-models/status', async (req, res) => {
      try {
        const status = await this.localModelManager.getSystemStatus();
        res.json(this.createSuccessResponse(status));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get local model status', error.message));
      }
    });

    this.app.post('/local-models/install', async (req, res) => {
      try {
        const { framework, modelName } = req.body;
        const success = await this.localModelManager.installModel(framework, modelName);
        res.json(this.createSuccessResponse({ success, message: success ? 'Model installed' : 'Installation failed' }));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Model installation failed', error.message));
      }
    });

    // Router metrics
    this.app.get('/router/metrics', async (req, res) => {
      try {
        const metrics = this.modelRouter.getMetrics();
        res.json(this.createSuccessResponse(metrics));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get router metrics', error.message));
      }
    });

    this.app.get('/router/status', async (req, res) => {
      try {
        const status = await this.modelRouter.getSystemStatus();
        res.json(this.createSuccessResponse(status));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get router status', error.message));
      }
    });

    // Processing cache management
    this.app.get('/processing/cache-stats', async (req, res) => {
      try {
        const stats = this.responseProcessor.getCacheStats();
        res.json(this.createSuccessResponse(stats));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to get cache stats', error.message));
      }
    });

    this.app.post('/processing/clear-cache', async (req, res) => {
      try {
        this.responseProcessor.clearCache();
        res.json(this.createSuccessResponse({ message: 'Cache cleared' }));
      } catch (error: any) {
        res.status(500).json(this.createErrorResponse('Failed to clear cache', error.message));
      }
    });
  }

  private setupWebSocket(): void {
    this.wsServer = new WebSocketServer({ server: this.server });
    
    this.wsServer.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'ai_request') {
            const request: AIRequest = message.payload;
            const response = await this.processAIRequest(request);
            
            ws.send(JSON.stringify({
              type: 'ai_response',
              id: message.id,
              payload: response
            }));
          }
        } catch (error: any) {
          ws.send(JSON.stringify({
            type: 'error',
            id: message?.id,
            payload: { error: error.message }
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  private async processAIRequest(request: AIRequest): Promise<AIResponse> {
    // Get context for the request
    const context = await this.contextManager.getContextForRequest(request);
    const enhancedRequest = { ...request, context };

    // Route the request to the optimal model
    const response = await this.modelRouter.routeRequest(enhancedRequest);

    // Process and validate the response
    const processingResult = await this.responseProcessor.processResponse(enhancedRequest, response);

    return processingResult.response;
  }

  private async getHealthStatus(): Promise<HealthStatus> {
    const providerHealths = await Promise.all(
      this.providerRegistry.getAll().map(async (provider) => ({
        name: provider.name,
        status: (await provider.isAvailable()) ? 'online' : 'offline',
        latency: 0, // Would measure actual latency
        errorRate: 0, // Would track error rates
        lastCheck: new Date().toISOString()
      }))
    );

    const localModelHealths = this.localModelManager.getAllProviders().map(provider => ({
      name: provider.name,
      framework: provider.name,
      status: 'loaded' as const,
      memoryUsage: 0, // Would measure actual memory usage
      lastUsed: new Date().toISOString()
    }));

    const systemPerformance = {
      cpuUsage: 0, // Would measure actual CPU usage
      memoryUsage: 0, // Would measure actual memory usage
      diskUsage: 0, // Would measure actual disk usage
      networkLatency: 0, // Would measure actual network latency
      activeRequests: 0 // Would track active requests
    };

    const allHealthy = providerHealths.every(p => p.status === 'online');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      providers: providerHealths,
      localModels: localModelHealths,
      performance: systemPerformance,
      timestamp: new Date().toISOString()
    };
  }

  private createSuccessResponse<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: '1.0.0'
      }
    };
  }

  private createErrorResponse(message: string, details?: any): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: '1.0.0'
      }
    };
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Public API methods for external integration

  public getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  public getModelRouter(): ModelRouter {
    return this.modelRouter;
  }

  public getContextManager(): ContextManager {
    return this.contextManager;
  }

  public getResponseProcessor(): ResponseProcessor {
    return this.responseProcessor;
  }

  public getLocalModelManager(): LocalModelManager {
    return this.localModelManager;
  }
}

