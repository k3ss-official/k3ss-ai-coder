import { FileInfo, ContextWindow } from '../types';
export interface ContextConfig {
    maxFiles: number;
    maxTokens: number;
    relevanceThreshold: number;
    compressionEnabled: boolean;
    cacheEnabled: boolean;
    analysisDepth: 'shallow' | 'medium' | 'deep';
}
export interface FileRelationship {
    source: string;
    target: string;
    type: 'import' | 'reference' | 'inheritance' | 'composition' | 'dependency';
    strength: number;
}
export interface ProjectGraph {
    files: Map<string, FileInfo>;
    relationships: FileRelationship[];
    clusters: string[][];
    entryPoints: string[];
}
export declare class ContextAnalyzer {
    private config;
    private projectGraph;
    private cache;
    constructor(config: ContextConfig);
    analyzeProject(projectRoot: string): Promise<ProjectGraph>;
    selectRelevantContext(request: string, currentFile?: string, selection?: string, maxTokens?: number): Promise<ContextWindow>;
    private scanProjectFiles;
    private readFileContent;
    private shouldIgnoreFile;
    private detectLanguage;
    private analyzeFileRelationships;
    private extractFileRelationships;
    private resolveImportPath;
    private findFileContainingClass;
    private findFileContainingFunction;
    private extractFunctionCalls;
    private isCommonKeyword;
    private identifyFileClusters;
    private identifyEntryPoints;
    private findRelatedFiles;
    private addRelatedFilesRecursive;
    private findFilesByKeywords;
    private extractKeywords;
    private calculateRelevanceScore;
    private compressContext;
    private estimateTokens;
    getProjectStats(): any;
    private getLanguageDistribution;
    private getAverageFileSize;
    clearCache(): void;
}
//# sourceMappingURL=analyzer.d.ts.map