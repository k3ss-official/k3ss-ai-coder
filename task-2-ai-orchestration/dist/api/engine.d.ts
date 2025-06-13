import { AIOrchestrationConfig } from '../types';
import { ProviderRegistry } from '../providers';
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
export declare class AIOrchestrationEngine {
    private app;
    private server;
    private wsServer;
    private providerRegistry;
    private localModelManager;
    private modelRouter;
    private contextManager;
    private responseProcessor;
    private config;
    private isInitialized;
    constructor(config: OrchestrationEngineConfig);
    initialize(orchestrationConfig: AIOrchestrationConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    private processAIRequest;
    private getHealthStatus;
    private createSuccessResponse;
    private createErrorResponse;
    private generateRequestId;
    getProviderRegistry(): ProviderRegistry;
    getModelRouter(): ModelRouter;
    getContextManager(): ContextManager;
    getResponseProcessor(): ResponseProcessor;
    getLocalModelManager(): LocalModelManager;
}
//# sourceMappingURL=engine.d.ts.map