import { promises as fs } from 'fs';
import path from 'path';
import { 
  ProjectContext, 
  FileInfo, 
  ContextWindow, 
  ContextAnalysis, 
  CodePattern, 
  ComplexityMetrics,
  Dependency
} from '../types';

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
  strength: number; // 0-1
}

export interface ProjectGraph {
  files: Map<string, FileInfo>;
  relationships: FileRelationship[];
  clusters: string[][]; // Groups of related files
  entryPoints: string[]; // Main files (index.js, main.py, etc.)
}

export class ContextAnalyzer {
  private config: ContextConfig;
  private projectGraph: ProjectGraph | null = null;
  private cache: Map<string, any> = new Map();

  constructor(config: ContextConfig) {
    this.config = config;
  }

  public async analyzeProject(projectRoot: string): Promise<ProjectGraph> {
    const cacheKey = `project_${projectRoot}`;
    
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    console.log('Analyzing project structure...');
    
    const files = await this.scanProjectFiles(projectRoot);
    const relationships = await this.analyzeFileRelationships(files);
    const clusters = this.identifyFileClusters(files, relationships);
    const entryPoints = this.identifyEntryPoints(files);

    const graph: ProjectGraph = {
      files,
      relationships,
      clusters,
      entryPoints
    };

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, graph);
    }

    this.projectGraph = graph;
    return graph;
  }

  public async selectRelevantContext(
    request: string,
    currentFile?: string,
    selection?: string,
    maxTokens?: number
  ): Promise<ContextWindow> {
    
    if (!this.projectGraph) {
      throw new Error('Project not analyzed. Call analyzeProject first.');
    }

    const targetTokens = maxTokens || this.config.maxTokens;
    const relevantFiles: FileInfo[] = [];
    let totalTokens = 0;

    // Start with current file if specified
    if (currentFile && this.projectGraph.files.has(currentFile)) {
      const file = this.projectGraph.files.get(currentFile)!;
      relevantFiles.push(file);
      totalTokens += this.estimateTokens(file.content || '');
    }

    // Find related files based on relationships
    const relatedFiles = this.findRelatedFiles(currentFile, request);
    
    // Score and sort files by relevance
    const scoredFiles = relatedFiles
      .filter(file => !relevantFiles.some(rf => rf.path === file.path))
      .map(file => ({
        file,
        score: this.calculateRelevanceScore(file, request, currentFile)
      }))
      .sort((a, b) => b.score - a.score);

    // Add files until we reach token limit
    for (const { file } of scoredFiles) {
      const fileTokens = this.estimateTokens(file.content || '');
      
      if (totalTokens + fileTokens <= targetTokens) {
        relevantFiles.push(file);
        totalTokens += fileTokens;
      } else {
        break;
      }
    }

    // Apply compression if enabled and needed
    if (this.config.compressionEnabled && totalTokens > targetTokens) {
      return this.compressContext(relevantFiles, targetTokens);
    }

    return {
      files: relevantFiles,
      totalTokens,
      relevanceThreshold: this.config.relevanceThreshold,
      compressionRatio: 1.0
    };
  }

  private async scanProjectFiles(projectRoot: string): Promise<Map<string, FileInfo>> {
    const files = new Map<string, FileInfo>();
    const supportedExtensions = new Set([
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala',
      '.html', '.css', '.scss', '.less', '.vue', '.svelte',
      '.json', '.yaml', '.yml', '.xml', '.md', '.txt'
    ]);

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(projectRoot, fullPath);

          // Skip common ignore patterns
          if (this.shouldIgnoreFile(relativePath)) {
            continue;
          }

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            
            if (supportedExtensions.has(ext)) {
              try {
                const stats = await fs.stat(fullPath);
                const content = await this.readFileContent(fullPath, stats.size);
                
                const fileInfo: FileInfo = {
                  path: relativePath,
                  content,
                  language: this.detectLanguage(ext, entry.name),
                  size: stats.size,
                  lastModified: stats.mtime.toISOString(),
                  relevanceScore: 0
                };

                files.set(relativePath, fileInfo);
              } catch (error) {
                console.warn(`Error reading file ${fullPath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${dir}:`, error);
      }
    };

    await scanDirectory(projectRoot);
    console.log(`Scanned ${files.size} files`);
    return files;
  }

  private async readFileContent(filePath: string, size: number): Promise<string> {
    // Skip very large files to avoid memory issues
    if (size > 1024 * 1024) { // 1MB limit
      return `[File too large: ${(size / 1024 / 1024).toFixed(1)}MB]`;
    }

    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return '[Unable to read file]';
    }
  }

  private shouldIgnoreFile(relativePath: string): boolean {
    const ignorePatterns = [
      'node_modules', '.git', '.svn', '.hg',
      'dist', 'build', 'target', 'bin', 'obj',
      '.next', '.nuxt', '.vscode', '.idea',
      'coverage', '.nyc_output', '.pytest_cache',
      '__pycache__', '*.pyc', '*.pyo',
      '.DS_Store', 'Thumbs.db'
    ];

    return ignorePatterns.some(pattern => 
      relativePath.includes(pattern) || 
      relativePath.startsWith('.') && pattern.startsWith('.')
    );
  }

  private detectLanguage(extension: string, filename: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.vue': 'vue',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown'
    };

    return languageMap[extension] || 'text';
  }

  private async analyzeFileRelationships(files: Map<string, FileInfo>): Promise<FileRelationship[]> {
    const relationships: FileRelationship[] = [];

    for (const [filePath, fileInfo] of files) {
      if (!fileInfo.content || fileInfo.content.startsWith('[')) {
        continue; // Skip files we couldn't read
      }

      const fileRelationships = this.extractFileRelationships(filePath, fileInfo, files);
      relationships.push(...fileRelationships);
    }

    return relationships;
  }

  private extractFileRelationships(
    filePath: string, 
    fileInfo: FileInfo, 
    allFiles: Map<string, FileInfo>
  ): FileRelationship[] {
    
    const relationships: FileRelationship[] = [];
    const content = fileInfo.content || '';

    // Extract import/require statements
    const importPatterns = [
      /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,  // ES6 imports
      /require\(['"`]([^'"`]+)['"`]\)/g,              // CommonJS requires
      /from\s+['"`]([^'"`]+)['"`]\s+import/g,        // Python imports
      /#include\s*['"`<]([^'"`>]+)['"`>]/g,          // C/C++ includes
      /import\s+['"`]([^'"`]+)['"`]/g,               // Go imports
      /use\s+['"`]([^'"`]+)['"`]/g                   // PHP use statements
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolvedPath = this.resolveImportPath(filePath, importPath, allFiles);
        
        if (resolvedPath && allFiles.has(resolvedPath)) {
          relationships.push({
            source: filePath,
            target: resolvedPath,
            type: 'import',
            strength: 0.8
          });
        }
      }
    }

    // Extract class inheritance and composition
    const classPatterns = [
      /class\s+\w+\s+extends\s+(\w+)/g,             // JavaScript/TypeScript extends
      /class\s+\w+\((\w+)\)/g,                      // Python inheritance
      /class\s+\w+\s*:\s*public\s+(\w+)/g          // C++ inheritance
    ];

    for (const pattern of classPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const baseClass = match[1];
        const referencedFile = this.findFileContainingClass(baseClass, allFiles);
        
        if (referencedFile && referencedFile !== filePath) {
          relationships.push({
            source: filePath,
            target: referencedFile,
            type: 'inheritance',
            strength: 0.9
          });
        }
      }
    }

    // Extract function/method references
    const functionCalls = this.extractFunctionCalls(content);
    for (const funcName of functionCalls) {
      const referencedFile = this.findFileContainingFunction(funcName, allFiles);
      
      if (referencedFile && referencedFile !== filePath) {
        relationships.push({
          source: filePath,
          target: referencedFile,
          type: 'reference',
          strength: 0.6
        });
      }
    }

    return relationships;
  }

  private resolveImportPath(
    currentFile: string, 
    importPath: string, 
    allFiles: Map<string, FileInfo>
  ): string | null {
    
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const currentDir = path.dirname(currentFile);
      const resolvedPath = path.normalize(path.join(currentDir, importPath));
      
      // Try different extensions
      const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java'];
      for (const ext of extensions) {
        const withExt = resolvedPath + ext;
        if (allFiles.has(withExt)) {
          return withExt;
        }
      }
      
      // Try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        if (allFiles.has(indexPath)) {
          return indexPath;
        }
      }
    }

    // Handle absolute imports (simplified)
    for (const [filePath] of allFiles) {
      if (filePath.includes(importPath)) {
        return filePath;
      }
    }

    return null;
  }

  private findFileContainingClass(className: string, allFiles: Map<string, FileInfo>): string | null {
    for (const [filePath, fileInfo] of allFiles) {
      if (fileInfo.content && fileInfo.content.includes(`class ${className}`)) {
        return filePath;
      }
    }
    return null;
  }

  private findFileContainingFunction(funcName: string, allFiles: Map<string, FileInfo>): string | null {
    for (const [filePath, fileInfo] of allFiles) {
      if (fileInfo.content && 
          (fileInfo.content.includes(`function ${funcName}`) ||
           fileInfo.content.includes(`def ${funcName}`) ||
           fileInfo.content.includes(`${funcName}(`))) {
        return filePath;
      }
    }
    return null;
  }

  private extractFunctionCalls(content: string): string[] {
    const functionCalls: string[] = [];
    const patterns = [
      /(\w+)\s*\(/g,  // Function calls
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const funcName = match[1];
        if (funcName.length > 2 && !this.isCommonKeyword(funcName)) {
          functionCalls.push(funcName);
        }
      }
    }

    return [...new Set(functionCalls)]; // Remove duplicates
  }

  private isCommonKeyword(word: string): boolean {
    const keywords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'function', 'return', 'var', 'let', 'const', 'class', 'extends', 'import',
      'export', 'from', 'as', 'default', 'async', 'await', 'try', 'catch',
      'finally', 'throw', 'new', 'this', 'super', 'static', 'public', 'private',
      'protected', 'abstract', 'interface', 'type', 'enum', 'namespace'
    ]);
    return keywords.has(word.toLowerCase());
  }

  private identifyFileClusters(
    files: Map<string, FileInfo>, 
    relationships: FileRelationship[]
  ): string[][] {
    
    const clusters: string[][] = [];
    const visited = new Set<string>();

    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    for (const [filePath] of files) {
      adjacency.set(filePath, new Set());
    }

    for (const rel of relationships) {
      adjacency.get(rel.source)?.add(rel.target);
      adjacency.get(rel.target)?.add(rel.source);
    }

    // Find connected components using DFS
    const dfs = (file: string, cluster: string[]): void => {
      if (visited.has(file)) return;
      
      visited.add(file);
      cluster.push(file);
      
      const neighbors = adjacency.get(file) || new Set();
      for (const neighbor of neighbors) {
        dfs(neighbor, cluster);
      }
    };

    for (const [filePath] of files) {
      if (!visited.has(filePath)) {
        const cluster: string[] = [];
        dfs(filePath, cluster);
        if (cluster.length > 1) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  private identifyEntryPoints(files: Map<string, FileInfo>): string[] {
    const entryPoints: string[] = [];
    const entryPatterns = [
      /index\.(js|ts|jsx|tsx)$/,
      /main\.(js|ts|py|java|cpp)$/,
      /app\.(js|ts|py)$/,
      /server\.(js|ts)$/,
      /__main__\.py$/,
      /Main\.java$/
    ];

    for (const [filePath] of files) {
      const fileName = path.basename(filePath);
      
      if (entryPatterns.some(pattern => pattern.test(fileName))) {
        entryPoints.push(filePath);
      }
    }

    return entryPoints;
  }

  private findRelatedFiles(currentFile?: string, request?: string): FileInfo[] {
    if (!this.projectGraph) return [];

    const relatedFiles: FileInfo[] = [];
    const visited = new Set<string>();

    // Start with current file's relationships
    if (currentFile) {
      this.addRelatedFilesRecursive(currentFile, relatedFiles, visited, 2); // 2 levels deep
    }

    // Add files based on request content
    if (request) {
      const keywordFiles = this.findFilesByKeywords(request);
      relatedFiles.push(...keywordFiles.filter(f => !visited.has(f.path)));
    }

    return relatedFiles;
  }

  private addRelatedFilesRecursive(
    filePath: string, 
    result: FileInfo[], 
    visited: Set<string>, 
    depth: number
  ): void {
    
    if (depth <= 0 || visited.has(filePath)) return;
    
    visited.add(filePath);
    const fileInfo = this.projectGraph?.files.get(filePath);
    if (fileInfo) {
      result.push(fileInfo);
    }

    // Find related files through relationships
    const relationships = this.projectGraph?.relationships.filter(
      rel => rel.source === filePath || rel.target === filePath
    ) || [];

    for (const rel of relationships) {
      const relatedPath = rel.source === filePath ? rel.target : rel.source;
      this.addRelatedFilesRecursive(relatedPath, result, visited, depth - 1);
    }
  }

  private findFilesByKeywords(request: string): FileInfo[] {
    if (!this.projectGraph) return [];

    const keywords = this.extractKeywords(request);
    const matchingFiles: FileInfo[] = [];

    for (const [filePath, fileInfo] of this.projectGraph.files) {
      let score = 0;
      const content = (fileInfo.content || '').toLowerCase();
      const fileName = path.basename(filePath).toLowerCase();

      for (const keyword of keywords) {
        if (fileName.includes(keyword)) {
          score += 3; // Filename matches are important
        }
        if (content.includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0) {
        fileInfo.relevanceScore = score;
        matchingFiles.push(fileInfo);
      }
    }

    return matchingFiles.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Remove common words
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'can', 'could', 'should', 'would', 'will', 'shall', 'may',
      'might', 'must', 'have', 'has', 'had', 'been', 'being', 'are', 'was',
      'were', 'is', 'am', 'be'
    ]);

    return words.filter(word => !stopWords.has(word));
  }

  private calculateRelevanceScore(
    file: FileInfo, 
    request: string, 
    currentFile?: string
  ): number {
    
    let score = file.relevanceScore || 0;

    // Boost score for files in the same directory as current file
    if (currentFile) {
      const currentDir = path.dirname(currentFile);
      const fileDir = path.dirname(file.path);
      
      if (fileDir === currentDir) {
        score += 2;
      } else if (fileDir.startsWith(currentDir) || currentDir.startsWith(fileDir)) {
        score += 1;
      }
    }

    // Boost score for recently modified files
    const lastModified = new Date(file.lastModified);
    const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) {
      score += 1;
    }

    // Boost score for smaller files (easier to include in context)
    if (file.size < 10000) { // Less than 10KB
      score += 0.5;
    }

    return score;
  }

  private compressContext(files: FileInfo[], targetTokens: number): ContextWindow {
    // Simple compression: truncate file contents
    const compressedFiles: FileInfo[] = [];
    let totalTokens = 0;
    const compressionRatio = targetTokens / files.reduce(
      (sum, f) => sum + this.estimateTokens(f.content || ''), 0
    );

    for (const file of files) {
      const originalContent = file.content || '';
      const originalTokens = this.estimateTokens(originalContent);
      const targetFileTokens = Math.floor(originalTokens * compressionRatio);
      
      let compressedContent = originalContent;
      if (originalTokens > targetFileTokens) {
        // Keep the beginning and end of the file
        const chars = originalContent.length;
        const targetChars = Math.floor(chars * compressionRatio);
        const halfTarget = Math.floor(targetChars / 2);
        
        compressedContent = 
          originalContent.substring(0, halfTarget) +
          '\n\n... [content truncated] ...\n\n' +
          originalContent.substring(chars - halfTarget);
      }

      const compressedFile: FileInfo = {
        ...file,
        content: compressedContent
      };

      compressedFiles.push(compressedFile);
      totalTokens += this.estimateTokens(compressedContent);
    }

    return {
      files: compressedFiles,
      totalTokens,
      relevanceThreshold: this.config.relevanceThreshold,
      compressionRatio
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Public utility methods

  public getProjectStats(): any {
    if (!this.projectGraph) return null;

    return {
      totalFiles: this.projectGraph.files.size,
      totalRelationships: this.projectGraph.relationships.length,
      clusters: this.projectGraph.clusters.length,
      entryPoints: this.projectGraph.entryPoints.length,
      languageDistribution: this.getLanguageDistribution(),
      averageFileSize: this.getAverageFileSize()
    };
  }

  private getLanguageDistribution(): Record<string, number> {
    if (!this.projectGraph) return {};

    const distribution: Record<string, number> = {};
    for (const [, file] of this.projectGraph.files) {
      distribution[file.language] = (distribution[file.language] || 0) + 1;
    }
    return distribution;
  }

  private getAverageFileSize(): number {
    if (!this.projectGraph) return 0;

    const totalSize = Array.from(this.projectGraph.files.values())
      .reduce((sum, file) => sum + file.size, 0);
    return totalSize / this.projectGraph.files.size;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

