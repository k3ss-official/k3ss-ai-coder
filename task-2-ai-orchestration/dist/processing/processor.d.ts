import { AIRequest, AIResponse } from '../types';
import { ValidationResult } from './validator';
export interface ProcessingConfig {
    cacheEnabled: boolean;
    cacheSize: number;
    cacheTTL: number;
    formatEnabled: boolean;
    optimizationEnabled: boolean;
    qualityThreshold: number;
}
export interface CacheEntry {
    request: AIRequest;
    response: AIResponse;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
}
export interface ProcessingResult {
    response: AIResponse;
    cached: boolean;
    validation: ValidationResult;
    processingTime: number;
    optimizations: string[];
}
export declare class ResponseProcessor {
    private config;
    private validator;
    private cache;
    private cacheCleanupTimer;
    constructor(config: ProcessingConfig);
    processResponse(request: AIRequest, response: AIResponse): Promise<ProcessingResult>;
    formatResponse(response: AIResponse, request: AIRequest): AIResponse;
    optimizeResponse(response: AIResponse, request: AIRequest): AIResponse;
    private formatCodeResponse;
    private formatExplanationResponse;
    private formatDocumentationResponse;
    private formatBugFixResponse;
    private formatGeneralResponse;
    private formatCode;
    private addCodeExplanations;
    private generateCodeExplanation;
    private addExplanationStructure;
    private highlightConcepts;
    private ensureMarkdownStructure;
    private addTableOfContents;
    private structureBugFixResponse;
    private improveBasicFormatting;
    private removeRedundantWhitespace;
    private optimizeCodeBlocks;
    private improveReadability;
    private addMissingContext;
    private calculateQualityMetrics;
    private calculateCompleteness;
    private calculateCoherence;
    private getCachedResponse;
    private cacheResponse;
    private generateCacheKey;
    private evictOldestEntries;
    private startCacheCleanup;
    private cleanupExpiredEntries;
    getCacheStats(): any;
    clearCache(): void;
    updateConfig(newConfig: Partial<ProcessingConfig>): void;
    destroy(): void;
}
//# sourceMappingURL=processor.d.ts.map