import { ContextConfig, ProjectGraph } from './analyzer';
import { ProjectContext, FileInfo, ContextWindow, AIRequest } from '../types';
export interface ContextManagerConfig extends ContextConfig {
    autoRefresh: boolean;
    refreshInterval: number;
    persistCache: boolean;
    watchFileChanges: boolean;
}
export interface ContextCache {
    projectGraph: ProjectGraph | null;
    lastAnalysis: string;
    contextWindows: Map<string, ContextWindow>;
    fileHashes: Map<string, string>;
}
export declare class ContextManager {
    private analyzer;
    private config;
    private cache;
    private refreshTimer;
    private currentProject;
    constructor(config: ContextManagerConfig);
    initializeProject(projectRoot: string): Promise<void>;
    getContextForRequest(request: AIRequest): Promise<ProjectContext>;
    refreshProject(): Promise<void>;
    addFile(filePath: string, content: string): Promise<void>;
    updateFile(filePath: string, content: string): Promise<void>;
    removeFile(filePath: string): Promise<void>;
    getProjectStats(): any;
    optimizeContext(request: AIRequest): Promise<ContextWindow>;
    getFileRelationships(filePath: string): Promise<any>;
    findSimilarFiles(filePath: string, limit?: number): Promise<FileInfo[]>;
    private buildProjectContext;
    private extractDependencies;
    private getGitInfo;
    private detectPrimaryLanguage;
    private detectLanguage;
    private getMaxTokensForModel;
    private generateCacheKey;
    private cleanupCache;
    private invalidateRelatedCache;
    private calculateFileSimilarity;
    private startAutoRefresh;
    destroy(): void;
}
//# sourceMappingURL=manager.d.ts.map