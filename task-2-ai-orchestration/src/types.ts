// Core types and interfaces for the AI Orchestration Engine

export interface AIRequest {
  id: string;
  type: 'chat' | 'generate' | 'analyze' | 'refactor' | 'explain' | 'debug';
  content: string;
  context: ProjectContext;
  model?: string;
  options?: AIOptions;
  timestamp: string;
}

export interface AIResponse {
  id: string;
  content: string;
  metadata: ResponseMetadata;
  confidence: number;
  suggestions?: string[];
  model: string;
  provider: string;
  timestamp: string;
}

export interface ProjectContext {
  files: FileInfo[];
  currentFile?: string;
  selection?: TextSelection;
  gitInfo?: GitContext;
  dependencies?: Dependency[];
  projectRoot: string;
  language?: string;
}

export interface FileInfo {
  path: string;
  content?: string;
  language: string;
  size: number;
  lastModified: string;
  relevanceScore?: number;
}

export interface TextSelection {
  start: Position;
  end: Position;
  text: string;
}

export interface Position {
  line: number;
  character: number;
}

export interface GitContext {
  branch: string;
  commit: string;
  status: string[];
  remoteUrl?: string;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  description?: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  timeout?: number;
}

export interface ResponseMetadata {
  tokensUsed: number;
  responseTime: number;
  model: string;
  provider: string;
  cached: boolean;
  quality: QualityMetrics;
}

export interface QualityMetrics {
  syntaxValid: boolean;
  relevanceScore: number;
  completeness: number;
  coherence: number;
}

// AI Provider Interfaces
export interface AIProvider {
  name: string;
  type: 'cloud' | 'local';
  models: AIModel[];
  isAvailable(): Promise<boolean>;
  sendRequest(request: AIRequest): Promise<AIResponse>;
  getCapabilities(): ProviderCapabilities;
  configure(config: ProviderConfig): void;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'chat' | 'completion' | 'embedding' | 'multimodal';
  capabilities: ModelCapabilities;
  contextWindow: number;
  costPerToken?: number;
  performance: PerformanceMetrics;
}

export interface ModelCapabilities {
  languages: string[];
  tasks: TaskType[];
  maxTokens: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  supportsCode: boolean;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  reliability: number;
  accuracy: number;
  throughput: number;
}

export interface ProviderCapabilities {
  maxConcurrentRequests: number;
  supportedModels: string[];
  features: string[];
  rateLimits: RateLimit[];
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  rateLimits?: RateLimit[];
  customHeaders?: Record<string, string>;
}

export interface RateLimit {
  requests: number;
  window: number; // seconds
  burst?: number;
}

// Task and Routing Types
export type TaskType = 
  | 'code_generation'
  | 'code_explanation'
  | 'code_refactoring'
  | 'bug_fixing'
  | 'documentation'
  | 'testing'
  | 'optimization'
  | 'translation'
  | 'general_chat';

export interface RoutingConstraints {
  maxCost?: number;
  maxLatency?: number;
  requiresLocal?: boolean;
  preferredProvider?: string;
  excludeProviders?: string[];
  minQuality?: number;
}

export interface ModelSelection {
  model: AIModel;
  provider: AIProvider;
  confidence: number;
  reasoning: string;
  fallbacks: ModelSelection[];
}

// Context Management Types
export interface ContextWindow {
  files: FileInfo[];
  totalTokens: number;
  relevanceThreshold: number;
  compressionRatio: number;
}

export interface ContextAnalysis {
  relevantFiles: FileInfo[];
  dependencies: string[];
  patterns: CodePattern[];
  complexity: ComplexityMetrics;
}

export interface CodePattern {
  type: string;
  pattern: string;
  frequency: number;
  examples: string[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  dependencies: number;
  testCoverage?: number;
}

// Local Model Types
export interface LocalModelConfig {
  framework: 'ollama' | 'llama-cpp' | 'lm-studio' | 'transformers';
  modelPath: string;
  modelName: string;
  parameters: LocalModelParameters;
  hardware: HardwareRequirements;
}

export interface LocalModelParameters {
  contextLength?: number;
  batchSize?: number;
  threads?: number;
  gpuLayers?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface HardwareRequirements {
  minRam: number; // GB
  minVram?: number; // GB
  minCpu: string;
  gpu?: string;
  storage: number; // GB
}

// Error Types
export interface AIError {
  code: string;
  message: string;
  provider?: string;
  model?: string;
  retryable: boolean;
  details?: any;
}

// Configuration Types
export interface AIOrchestrationConfig {
  providers: ProviderConfig[];
  localModels: LocalModelConfig[];
  routing: RoutingConfig;
  context: ContextConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

export interface RoutingConfig {
  defaultProvider: string;
  fallbackChain: string[];
  taskModelMapping: Record<TaskType, string[]>;
  costOptimization: boolean;
  latencyOptimization: boolean;
}

export interface ContextConfig {
  maxFiles: number;
  maxTokens: number;
  relevanceThreshold: number;
  compressionEnabled: boolean;
  cacheEnabled: boolean;
}

export interface PerformanceConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  cacheSize: number;
  metricsEnabled: boolean;
}

export interface SecurityConfig {
  encryptApiKeys: boolean;
  auditEnabled: boolean;
  rateLimitEnabled: boolean;
  allowedProviders: string[];
  dataRetention: number; // days
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// WebSocket Message Types
export interface WSMessage {
  type: 'request' | 'response' | 'event' | 'error';
  id: string;
  payload: any;
  timestamp: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: ProviderHealth[];
  localModels: LocalModelHealth[];
  performance: SystemPerformance;
  timestamp: string;
}

export interface ProviderHealth {
  name: string;
  status: 'online' | 'offline' | 'error';
  latency: number;
  errorRate: number;
  lastCheck: string;
}

export interface LocalModelHealth {
  name: string;
  framework: string;
  status: 'loaded' | 'loading' | 'error' | 'unloaded';
  memoryUsage: number;
  lastUsed: string;
}

export interface SystemPerformance {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeRequests: number;
}

