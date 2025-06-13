import { ContextAnalyzer, ContextConfig, ProjectGraph } from './analyzer';
import { 
  ProjectContext, 
  FileInfo, 
  ContextWindow, 
  AIRequest
} from '../types';

export interface ContextManagerConfig extends ContextConfig {
  autoRefresh: boolean;
  refreshInterval: number; // minutes
  persistCache: boolean;
  watchFileChanges: boolean;
}

export interface ContextCache {
  projectGraph: ProjectGraph | null;
  lastAnalysis: string;
  contextWindows: Map<string, ContextWindow>;
  fileHashes: Map<string, string>;
}

export class ContextManager {
  private analyzer: ContextAnalyzer;
  private config: ContextManagerConfig;
  private cache: ContextCache;
  private refreshTimer: NodeJS.Timeout | null = null;
  private currentProject: string | null = null;

  constructor(config: ContextManagerConfig) {
    this.config = config;
    this.analyzer = new ContextAnalyzer(config);
    this.cache = {
      projectGraph: null,
      lastAnalysis: '',
      contextWindows: new Map(),
      fileHashes: new Map()
    };

    if (config.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  public async initializeProject(projectRoot: string): Promise<void> {
    console.log(`Initializing project context for: ${projectRoot}`);
    
    this.currentProject = projectRoot;
    
    try {
      const graph = await this.analyzer.analyzeProject(projectRoot);
      this.cache.projectGraph = graph;
      this.cache.lastAnalysis = new Date().toISOString();
      
      console.log('Project context initialized successfully');
      console.log(`- Files: ${graph.files.size}`);
      console.log(`- Relationships: ${graph.relationships.length}`);
      console.log(`- Clusters: ${graph.clusters.length}`);
      
    } catch (error) {
      console.error('Failed to initialize project context:', error);
      throw error;
    }
  }

  public async getContextForRequest(request: AIRequest): Promise<ProjectContext> {
    if (!this.cache.projectGraph) {
      throw new Error('Project not initialized. Call initializeProject first.');
    }

    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    if (this.cache.contextWindows.has(cacheKey)) {
      const cachedWindow = this.cache.contextWindows.get(cacheKey)!;
      return this.buildProjectContext(cachedWindow, request);
    }

    // Generate new context window
    const contextWindow = await this.analyzer.selectRelevantContext(
      request.content,
      request.context?.currentFile,
      request.context?.selection?.text,
      this.getMaxTokensForModel(request.model)
    );

    // Cache the result
    this.cache.contextWindows.set(cacheKey, contextWindow);
    
    // Clean up old cache entries
    this.cleanupCache();

    return this.buildProjectContext(contextWindow, request);
  }

  public async refreshProject(): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No project initialized');
    }

    console.log('Refreshing project context...');
    
    // Clear existing cache
    this.cache.contextWindows.clear();
    this.analyzer.clearCache();
    
    // Re-analyze project
    await this.initializeProject(this.currentProject);
  }

  public async addFile(filePath: string, content: string): Promise<void> {
    if (!this.cache.projectGraph) return;

    const fileInfo: FileInfo = {
      path: filePath,
      content,
      language: this.detectLanguage(filePath),
      size: content.length,
      lastModified: new Date().toISOString(),
      relevanceScore: 0
    };

    this.cache.projectGraph.files.set(filePath, fileInfo);
    
    // Invalidate related cache entries
    this.invalidateRelatedCache(filePath);
    
    console.log(`Added file to context: ${filePath}`);
  }

  public async updateFile(filePath: string, content: string): Promise<void> {
    if (!this.cache.projectGraph) return;

    const existingFile = this.cache.projectGraph.files.get(filePath);
    if (existingFile) {
      existingFile.content = content;
      existingFile.size = content.length;
      existingFile.lastModified = new Date().toISOString();
      
      // Invalidate related cache entries
      this.invalidateRelatedCache(filePath);
      
      console.log(`Updated file in context: ${filePath}`);
    }
  }

  public async removeFile(filePath: string): Promise<void> {
    if (!this.cache.projectGraph) return;

    this.cache.projectGraph.files.delete(filePath);
    
    // Remove relationships involving this file
    this.cache.projectGraph.relationships = 
      this.cache.projectGraph.relationships.filter(
        rel => rel.source !== filePath && rel.target !== filePath
      );
    
    // Invalidate related cache entries
    this.invalidateRelatedCache(filePath);
    
    console.log(`Removed file from context: ${filePath}`);
  }

  public getProjectStats(): any {
    const analyzerStats = this.analyzer.getProjectStats();
    
    return {
      ...analyzerStats,
      cacheStats: {
        contextWindows: this.cache.contextWindows.size,
        lastAnalysis: this.cache.lastAnalysis,
        currentProject: this.currentProject
      },
      config: this.config
    };
  }

  public async optimizeContext(request: AIRequest): Promise<ContextWindow> {
    if (!this.cache.projectGraph) {
      throw new Error('Project not initialized');
    }

    // Use task-specific optimization
    const taskType = request.type;
    let maxTokens = this.getMaxTokensForModel(request.model);

    // Adjust token limits based on task type
    switch (taskType) {
      case 'code_generation':
        maxTokens = Math.floor(maxTokens * 0.7); // Leave room for generation
        break;
      case 'code_explanation':
        maxTokens = Math.floor(maxTokens * 0.9); // Can use more context
        break;
      case 'bug_fixing':
        maxTokens = Math.floor(maxTokens * 0.8); // Need context + space for fix
        break;
      case 'documentation':
        maxTokens = Math.floor(maxTokens * 0.6); // Need space for docs
        break;
      default:
        maxTokens = Math.floor(maxTokens * 0.8);
    }

    return await this.analyzer.selectRelevantContext(
      request.content,
      request.context?.currentFile,
      request.context?.selection?.text,
      maxTokens
    );
  }

  public async getFileRelationships(filePath: string): Promise<any> {
    if (!this.cache.projectGraph) return null;

    const relationships = this.cache.projectGraph.relationships.filter(
      rel => rel.source === filePath || rel.target === filePath
    );

    const incoming = relationships.filter(rel => rel.target === filePath);
    const outgoing = relationships.filter(rel => rel.source === filePath);

    return {
      file: filePath,
      incoming: incoming.map(rel => ({
        from: rel.source,
        type: rel.type,
        strength: rel.strength
      })),
      outgoing: outgoing.map(rel => ({
        to: rel.target,
        type: rel.type,
        strength: rel.strength
      })),
      totalRelationships: relationships.length
    };
  }

  public async findSimilarFiles(filePath: string, limit: number = 5): Promise<FileInfo[]> {
    if (!this.cache.projectGraph) return [];

    const targetFile = this.cache.projectGraph.files.get(filePath);
    if (!targetFile) return [];

    const similarFiles: Array<{ file: FileInfo; similarity: number }> = [];

    for (const [path, file] of this.cache.projectGraph.files) {
      if (path === filePath) continue;

      const similarity = this.calculateFileSimilarity(targetFile, file);
      if (similarity > 0.3) { // Threshold for similarity
        similarFiles.push({ file, similarity });
      }
    }

    return similarFiles
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.file);
  }

  private buildProjectContext(contextWindow: ContextWindow, request: AIRequest): ProjectContext {
    const dependencies = this.extractDependencies(contextWindow.files);
    const gitInfo = this.getGitInfo();

    return {
      files: contextWindow.files,
      currentFile: request.context?.currentFile,
      selection: request.context?.selection,
      gitInfo,
      dependencies,
      projectRoot: this.currentProject || '',
      language: this.detectPrimaryLanguage(contextWindow.files)
    };
  }

  private extractDependencies(files: FileInfo[]): any[] {
    const dependencies: any[] = [];
    
    for (const file of files) {
      if (!file.content) continue;

      // Extract package.json dependencies
      if (file.path.endsWith('package.json')) {
        try {
          const packageJson = JSON.parse(file.content);
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          for (const [name, version] of Object.entries(deps)) {
            dependencies.push({
              name,
              version: version as string,
              type: packageJson.devDependencies?.[name] ? 'development' : 'production'
            });
          }
        } catch (error) {
          console.warn('Error parsing package.json:', error);
        }
      }

      // Extract requirements.txt dependencies
      if (file.path.endsWith('requirements.txt')) {
        const lines = file.content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [name, version] = trimmed.split('==');
            dependencies.push({
              name: name.trim(),
              version: version?.trim() || 'latest',
              type: 'production'
            });
          }
        }
      }
    }

    return dependencies;
  }

  private getGitInfo(): any {
    // This would typically use git commands to get actual info
    // For now, return a placeholder
    return {
      branch: 'main',
      commit: 'unknown',
      status: []
    };
  }

  private detectPrimaryLanguage(files: FileInfo[]): string {
    const languageCounts: Record<string, number> = {};
    
    for (const file of files) {
      languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
    }

    return Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'text';
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby'
    };
    return languageMap[ext || ''] || 'text';
  }

  private getMaxTokensForModel(modelId?: string): number {
    // Default context limits based on common models
    const modelLimits: Record<string, number> = {
      'gpt-4-turbo-preview': 100000,
      'gpt-4': 6000,
      'gpt-3.5-turbo': 12000,
      'claude-3-opus': 150000,
      'claude-3-sonnet': 150000,
      'claude-3-haiku': 150000,
      'gemini-pro': 25000,
      'gemini-1.5-pro': 800000
    };

    return modelLimits[modelId || ''] || this.config.maxTokens;
  }

  private generateCacheKey(request: AIRequest): string {
    const parts = [
      request.type,
      request.content.substring(0, 100), // First 100 chars
      request.context?.currentFile || '',
      request.model || ''
    ];
    return Buffer.from(parts.join('|')).toString('base64');
  }

  private cleanupCache(): void {
    // Keep only the most recent 100 context windows
    if (this.cache.contextWindows.size > 100) {
      const entries = Array.from(this.cache.contextWindows.entries());
      const toKeep = entries.slice(-100);
      
      this.cache.contextWindows.clear();
      for (const [key, value] of toKeep) {
        this.cache.contextWindows.set(key, value);
      }
    }
  }

  private invalidateRelatedCache(filePath: string): void {
    // Remove cache entries that might be affected by this file change
    const keysToRemove: string[] = [];
    
    for (const key of this.cache.contextWindows.keys()) {
      // This is a simplified approach - in practice, you'd want more sophisticated invalidation
      keysToRemove.push(key);
    }

    for (const key of keysToRemove) {
      this.cache.contextWindows.delete(key);
    }
  }

  private calculateFileSimilarity(file1: FileInfo, file2: FileInfo): number {
    let similarity = 0;

    // Language similarity
    if (file1.language === file2.language) {
      similarity += 0.3;
    }

    // Directory similarity
    const dir1 = file1.path.split('/').slice(0, -1).join('/');
    const dir2 = file2.path.split('/').slice(0, -1).join('/');
    if (dir1 === dir2) {
      similarity += 0.4;
    } else if (dir1.startsWith(dir2) || dir2.startsWith(dir1)) {
      similarity += 0.2;
    }

    // Size similarity
    const sizeDiff = Math.abs(file1.size - file2.size);
    const maxSize = Math.max(file1.size, file2.size);
    if (maxSize > 0) {
      similarity += (1 - sizeDiff / maxSize) * 0.3;
    }

    return Math.min(1, similarity);
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      if (this.currentProject) {
        try {
          await this.refreshProject();
          console.log('Auto-refreshed project context');
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }
    }, this.config.refreshInterval * 60 * 1000);
  }

  public destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.cache.contextWindows.clear();
    this.analyzer.clearCache();
  }
}

