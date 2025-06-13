import { AIRequest, AIResponse, QualityMetrics } from '../types';
import { ResponseValidator, ValidationResult } from './validator';

export interface ProcessingConfig {
  cacheEnabled: boolean;
  cacheSize: number;
  cacheTTL: number; // Time to live in minutes
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

export class ResponseProcessor {
  private config: ProcessingConfig;
  private validator: ResponseValidator;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheCleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: ProcessingConfig) {
    this.config = config;
    this.validator = new ResponseValidator();
    
    if (config.cacheEnabled) {
      this.startCacheCleanup();
    }
  }

  public async processResponse(
    request: AIRequest, 
    response: AIResponse
  ): Promise<ProcessingResult> {
    
    const startTime = Date.now();
    const optimizations: string[] = [];

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getCachedResponse(request);
      if (cached) {
        return {
          response: cached.response,
          cached: true,
          validation: { isValid: true, score: 1.0, issues: [], suggestions: [] },
          processingTime: Date.now() - startTime,
          optimizations: ['cache_hit']
        };
      }
    }

    // Validate response
    const validation = this.validator.validateResponse(response, request);
    
    // Apply formatting if enabled
    if (this.config.formatEnabled) {
      response = this.formatResponse(response, request);
      optimizations.push('formatted');
    }

    // Apply optimizations if enabled
    if (this.config.optimizationEnabled) {
      response = this.optimizeResponse(response, request);
      optimizations.push('optimized');
    }

    // Update quality metrics
    response.metadata.quality = this.calculateQualityMetrics(response, validation);

    // Cache the response if it meets quality threshold
    if (this.config.cacheEnabled && validation.score >= this.config.qualityThreshold) {
      this.cacheResponse(request, response);
      optimizations.push('cached');
    }

    const processingTime = Date.now() - startTime;

    return {
      response,
      cached: false,
      validation,
      processingTime,
      optimizations
    };
  }

  public formatResponse(response: AIResponse, request: AIRequest): AIResponse {
    let content = response.content;

    // Apply task-specific formatting
    switch (request.type) {
      case 'code_generation':
        content = this.formatCodeResponse(content);
        break;
      case 'code_explanation':
        content = this.formatExplanationResponse(content);
        break;
      case 'documentation':
        content = this.formatDocumentationResponse(content);
        break;
      case 'bug_fixing':
        content = this.formatBugFixResponse(content);
        break;
      default:
        content = this.formatGeneralResponse(content);
    }

    return {
      ...response,
      content
    };
  }

  public optimizeResponse(response: AIResponse, request: AIRequest): AIResponse {
    let content = response.content;

    // Remove redundant whitespace
    content = this.removeRedundantWhitespace(content);

    // Optimize code blocks
    content = this.optimizeCodeBlocks(content);

    // Improve readability
    content = this.improveReadability(content);

    // Add helpful context if missing
    content = this.addMissingContext(content, request);

    return {
      ...response,
      content
    };
  }

  private formatCodeResponse(content: string): string {
    // Ensure code blocks are properly formatted
    content = content.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'javascript';
      const formattedCode = this.formatCode(code.trim(), language);
      return `\`\`\`${language}\n${formattedCode}\n\`\`\``;
    });

    // Add explanatory comments if missing
    content = this.addCodeExplanations(content);

    return content;
  }

  private formatExplanationResponse(content: string): string {
    // Structure explanations with clear sections
    if (!content.includes('##') && content.length > 500) {
      content = this.addExplanationStructure(content);
    }

    // Highlight important concepts
    content = this.highlightConcepts(content);

    return content;
  }

  private formatDocumentationResponse(content: string): string {
    // Ensure proper markdown structure
    content = this.ensureMarkdownStructure(content);

    // Add table of contents for long documents
    if (content.length > 2000) {
      content = this.addTableOfContents(content);
    }

    return content;
  }

  private formatBugFixResponse(content: string): string {
    // Structure bug fix responses
    if (!content.includes('Problem:') && !content.includes('Solution:')) {
      content = this.structureBugFixResponse(content);
    }

    return content;
  }

  private formatGeneralResponse(content: string): string {
    // Basic formatting improvements
    content = this.improveBasicFormatting(content);
    return content;
  }

  private formatCode(code: string, language: string): string {
    // Basic code formatting (indentation, spacing)
    const lines = code.split('\n');
    let indentLevel = 0;
    const indentSize = 2;

    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      
      if (!trimmed) return '';

      // Adjust indent level based on braces
      if (trimmed.includes('}') || trimmed.includes(']') || trimmed.includes(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const formatted = ' '.repeat(indentLevel * indentSize) + trimmed;

      if (trimmed.includes('{') || trimmed.includes('[') || trimmed.includes('(')) {
        indentLevel++;
      }

      return formatted;
    });

    return formattedLines.join('\n');
  }

  private addCodeExplanations(content: string): string {
    // Add brief explanations before complex code blocks
    return content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
      if (code.length > 200 && !content.includes('This code')) {
        const explanation = this.generateCodeExplanation(code, lang);
        return `${explanation}\n\n${match}`;
      }
      return match;
    });
  }

  private generateCodeExplanation(code: string, language: string): string {
    // Simple heuristic-based explanation generation
    if (code.includes('function') || code.includes('def')) {
      return 'This code defines a function that:';
    }
    if (code.includes('class')) {
      return 'This code defines a class that:';
    }
    if (code.includes('import') || code.includes('require')) {
      return 'This code imports dependencies and:';
    }
    return 'This code:';
  }

  private addExplanationStructure(content: string): string {
    const paragraphs = content.split('\n\n');
    if (paragraphs.length > 3) {
      // Add section headers
      const structured = [
        '## Overview',
        paragraphs[0],
        '',
        '## Details',
        ...paragraphs.slice(1)
      ].join('\n\n');
      return structured;
    }
    return content;
  }

  private highlightConcepts(content: string): string {
    // Highlight important programming concepts
    const concepts = [
      'function', 'variable', 'array', 'object', 'class', 'method',
      'algorithm', 'data structure', 'API', 'database', 'framework'
    ];

    let highlighted = content;
    for (const concept of concepts) {
      const regex = new RegExp(`\\b${concept}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `**${concept}**`);
    }

    return highlighted;
  }

  private ensureMarkdownStructure(content: string): string {
    // Ensure proper heading hierarchy
    const lines = content.split('\n');
    let hasH1 = false;
    
    const structuredLines = lines.map(line => {
      if (line.startsWith('# ')) {
        hasH1 = true;
      }
      return line;
    });

    if (!hasH1 && structuredLines.length > 0) {
      structuredLines.unshift('# Documentation\n');
    }

    return structuredLines.join('\n');
  }

  private addTableOfContents(content: string): string {
    const headings = content.match(/^#+\s+.+$/gm) || [];
    if (headings.length > 2) {
      const toc = [
        '## Table of Contents',
        '',
        ...headings.map(heading => {
          const level = heading.match(/^#+/)?.[0].length || 1;
          const text = heading.replace(/^#+\s+/, '');
          const indent = '  '.repeat(Math.max(0, level - 2));
          return `${indent}- [${text}](#${text.toLowerCase().replace(/\s+/g, '-')})`;
        }),
        ''
      ].join('\n');

      return content.replace(/^(# .+)$/m, `$1\n\n${toc}`);
    }
    return content;
  }

  private structureBugFixResponse(content: string): string {
    // Try to identify problem and solution sections
    const sections = content.split('\n\n');
    if (sections.length >= 2) {
      return [
        '## Problem',
        sections[0],
        '',
        '## Solution',
        ...sections.slice(1)
      ].join('\n\n');
    }
    return content;
  }

  private improveBasicFormatting(content: string): string {
    // Fix common formatting issues
    return content
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\s+$/gm, '') // Remove trailing whitespace
      .replace(/^\s+/gm, '') // Remove leading whitespace (except code blocks)
      .trim();
  }

  private removeRedundantWhitespace(content: string): string {
    return content
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .trim();
  }

  private optimizeCodeBlocks(content: string): string {
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      // Remove empty lines at start and end of code blocks
      const optimizedCode = code.replace(/^\n+|\n+$/g, '');
      return `\`\`\`${lang || ''}\n${optimizedCode}\n\`\`\``;
    });
  }

  private improveReadability(content: string): string {
    // Add spacing around headers
    content = content.replace(/^(#+\s+.+)$/gm, '\n$1\n');
    
    // Ensure proper spacing around lists
    content = content.replace(/^(\s*[-*+]\s+.+)$/gm, '\n$1');
    
    return content.replace(/\n{3,}/g, '\n\n'); // Clean up excessive newlines
  }

  private addMissingContext(content: string, request: AIRequest): string {
    // Add helpful context based on request type
    if (request.type === 'code_generation' && !content.includes('install') && !content.includes('npm')) {
      if (content.includes('import') || content.includes('require')) {
        content += '\n\n*Note: Make sure to install the required dependencies before running this code.*';
      }
    }

    if (request.type === 'bug_fixing' && !content.includes('test')) {
      content += '\n\n*Recommendation: Test this fix thoroughly before deploying to production.*';
    }

    return content;
  }

  private calculateQualityMetrics(response: AIResponse, validation: ValidationResult): QualityMetrics {
    return {
      syntaxValid: validation.issues.filter(i => i.type === 'error').length === 0,
      relevanceScore: validation.score,
      completeness: this.calculateCompleteness(response),
      coherence: this.calculateCoherence(response.content)
    };
  }

  private calculateCompleteness(response: AIResponse): number {
    const content = response.content;
    
    // Basic completeness heuristics
    let score = 0.5; // Base score

    // Has substantial content
    if (content.length > 100) score += 0.2;
    
    // Has code examples (for code-related responses)
    if (content.includes('```')) score += 0.1;
    
    // Has explanations
    if (content.includes('because') || content.includes('since') || content.includes('therefore')) {
      score += 0.1;
    }
    
    // Ends properly (not cut off)
    if (!content.endsWith('...') && !content.endsWith('etc.')) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private calculateCoherence(content: string): number {
    // Simple coherence calculation based on structure
    let score = 0.5;

    // Has proper structure
    if (content.includes('\n\n')) score += 0.2;
    
    // Has logical flow indicators
    const flowWords = ['first', 'then', 'next', 'finally', 'however', 'therefore'];
    const hasFlow = flowWords.some(word => content.toLowerCase().includes(word));
    if (hasFlow) score += 0.2;
    
    // Consistent formatting
    const codeBlocks = (content.match(/```/g) || []).length;
    if (codeBlocks % 2 === 0) score += 0.1;

    return Math.min(1, score);
  }

  // Cache management methods

  private getCachedResponse(request: AIRequest): CacheEntry | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);
    
    if (entry) {
      // Check if cache entry is still valid
      const age = Date.now() - entry.timestamp;
      const ttl = this.config.cacheTTL * 60 * 1000; // Convert to milliseconds
      
      if (age < ttl) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        return entry;
      } else {
        this.cache.delete(key);
      }
    }
    
    return null;
  }

  private cacheResponse(request: AIRequest, response: AIResponse): void {
    const key = this.generateCacheKey(request);
    const entry: CacheEntry = {
      request,
      response,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);

    // Enforce cache size limit
    if (this.cache.size > this.config.cacheSize) {
      this.evictOldestEntries();
    }
  }

  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      type: request.type,
      content: request.content,
      model: request.model,
      options: request.options
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const toRemove = entries.slice(0, Math.floor(this.config.cacheSize * 0.1));
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  private startCacheCleanup(): void {
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const ttl = this.config.cacheTTL * 60 * 1000;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Public API methods

  public getCacheStats(): any {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const averageAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
      totalAccesses,
      averageAge: Math.round(averageAge / 1000), // in seconds
      hitRate: totalAccesses > 0 ? (totalAccesses - entries.length) / totalAccesses : 0
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public updateConfig(newConfig: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public destroy(): void {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }
    this.cache.clear();
  }
}

