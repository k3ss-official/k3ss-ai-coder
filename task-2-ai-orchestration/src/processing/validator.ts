import { AIResponse, QualityMetrics, TaskType } from '../types';

export interface ValidationRule {
  name: string;
  description: string;
  validate(response: AIResponse, request?: any): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    line?: number;
    column?: number;
    offset?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ResponseValidator {
  private rules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  public validateResponse(response: AIResponse, request?: any): ValidationResult {
    const results: ValidationResult[] = [];
    
    // Apply all relevant rules
    for (const rule of this.rules.values()) {
      try {
        const result = rule.validate(response, request);
        results.push(result);
      } catch (error) {
        console.warn(`Validation rule ${rule.name} failed:`, error);
      }
    }

    // Combine results
    return this.combineValidationResults(results);
  }

  public addRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
  }

  public removeRule(name: string): void {
    this.rules.delete(name);
  }

  public getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  private initializeDefaultRules(): void {
    // Basic content validation
    this.addRule(new ContentLengthRule());
    this.addRule(new ContentQualityRule());
    this.addRule(new LanguageConsistencyRule());
    
    // Code-specific validation
    this.addRule(new CodeSyntaxRule());
    this.addRule(new CodeCompletenessRule());
    this.addRule(new CodeSecurityRule());
    
    // Response structure validation
    this.addRule(new ResponseStructureRule());
    this.addRule(new RelevanceRule());
  }

  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allIssues: ValidationIssue[] = [];
    const allSuggestions: string[] = [];
    let totalScore = 0;
    let validCount = 0;

    for (const result of results) {
      allIssues.push(...result.issues);
      allSuggestions.push(...result.suggestions);
      totalScore += result.score;
      if (result.isValid) validCount++;
    }

    const averageScore = results.length > 0 ? totalScore / results.length : 0;
    const isValid = validCount > results.length / 2; // Majority rule

    return {
      isValid,
      score: averageScore,
      issues: allIssues,
      suggestions: [...new Set(allSuggestions)] // Remove duplicates
    };
  }
}

// Validation Rules Implementation

class ContentLengthRule implements ValidationRule {
  name = 'content-length';
  description = 'Validates response content length is appropriate';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content.trim();
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    if (content.length < 10) {
      issues.push({
        type: 'error',
        message: 'Response is too short',
        severity: 'high'
      });
      score = 0.2;
    } else if (content.length < 50) {
      issues.push({
        type: 'warning',
        message: 'Response might be too brief',
        severity: 'medium'
      });
      score = 0.6;
    }

    if (content.length > 10000) {
      issues.push({
        type: 'warning',
        message: 'Response is very long',
        severity: 'low'
      });
      score = Math.min(score, 0.8);
    }

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      score,
      issues,
      suggestions: issues.length > 0 ? ['Consider adjusting response length'] : []
    };
  }
}

class ContentQualityRule implements ValidationRule {
  name = 'content-quality';
  description = 'Validates overall content quality and coherence';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content;
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    // Check for repetitive content
    if (this.hasRepetitiveContent(content)) {
      issues.push({
        type: 'warning',
        message: 'Response contains repetitive content',
        severity: 'medium'
      });
      score -= 0.2;
    }

    // Check for incomplete sentences
    if (this.hasIncompleteSentences(content)) {
      issues.push({
        type: 'warning',
        message: 'Response may contain incomplete sentences',
        severity: 'medium'
      });
      score -= 0.1;
    }

    // Check for coherence
    const coherenceScore = this.calculateCoherence(content);
    if (coherenceScore < 0.5) {
      issues.push({
        type: 'warning',
        message: 'Response may lack coherence',
        severity: 'medium'
      });
      score -= 0.3;
    }

    return {
      isValid: score > 0.5,
      score: Math.max(0, score),
      issues,
      suggestions: issues.length > 0 ? ['Review response for clarity and completeness'] : []
    };
  }

  private hasRepetitiveContent(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    return uniqueSentences.size < sentences.length * 0.8;
  }

  private hasIncompleteSentences(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const incompleteLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 20 && !trimmed.match(/[.!?]$/) && !trimmed.endsWith(':');
    });
    return incompleteLines.length > lines.length * 0.3;
  }

  private calculateCoherence(content: string): number {
    // Simple coherence check based on transition words and structure
    const transitionWords = [
      'however', 'therefore', 'furthermore', 'moreover', 'additionally',
      'consequently', 'meanwhile', 'similarly', 'in contrast', 'for example'
    ];
    
    const wordCount = content.split(/\s+/).length;
    const transitionCount = transitionWords.reduce((count, word) => 
      count + (content.toLowerCase().includes(word) ? 1 : 0), 0
    );

    return Math.min(1, transitionCount / (wordCount / 100));
  }
}

class LanguageConsistencyRule implements ValidationRule {
  name = 'language-consistency';
  description = 'Validates language consistency and grammar';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content;
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    // Check for mixed languages (basic check)
    if (this.hasMixedLanguages(content)) {
      issues.push({
        type: 'warning',
        message: 'Response may contain mixed languages',
        severity: 'low'
      });
      score -= 0.1;
    }

    // Check for basic grammar issues
    const grammarIssues = this.findBasicGrammarIssues(content);
    if (grammarIssues.length > 0) {
      issues.push(...grammarIssues);
      score -= grammarIssues.length * 0.05;
    }

    return {
      isValid: score > 0.7,
      score: Math.max(0, score),
      issues,
      suggestions: issues.length > 0 ? ['Review response for language consistency'] : []
    };
  }

  private hasMixedLanguages(content: string): boolean {
    // Very basic check for non-ASCII characters
    const asciiRatio = (content.match(/[\x00-\x7F]/g) || []).length / content.length;
    return asciiRatio < 0.9;
  }

  private findBasicGrammarIssues(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for double spaces
    if (content.includes('  ')) {
      issues.push({
        type: 'info',
        message: 'Contains multiple consecutive spaces',
        severity: 'low'
      });
    }

    // Check for missing capitalization after periods
    const sentences = content.split(/[.!?]+/);
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 0 && sentence[0] !== sentence[0].toUpperCase()) {
        issues.push({
          type: 'info',
          message: 'Possible capitalization issue',
          severity: 'low'
        });
        break; // Only report once
      }
    }

    return issues;
  }
}

class CodeSyntaxRule implements ValidationRule {
  name = 'code-syntax';
  description = 'Validates code syntax in responses';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content;
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(content);
    
    for (const block of codeBlocks) {
      const syntaxIssues = this.validateCodeSyntax(block.code, block.language);
      if (syntaxIssues.length > 0) {
        issues.push(...syntaxIssues);
        score -= 0.2;
      }
    }

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      suggestions: issues.length > 0 ? ['Review code syntax'] : []
    };
  }

  private extractCodeBlocks(content: string): Array<{ code: string; language: string }> {
    const blocks: Array<{ code: string; language: string }> = [];
    
    // Extract fenced code blocks
    const fencedRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = fencedRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }

    // Extract inline code (simple heuristic)
    const inlineRegex = /`([^`]+)`/g;
    while ((match = inlineRegex.exec(content)) !== null) {
      const code = match[1];
      if (code.length > 10 && (code.includes('(') || code.includes('{'))) {
        blocks.push({
          language: 'unknown',
          code
        });
      }
    }

    return blocks;
  }

  private validateCodeSyntax(code: string, language: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        issues.push(...this.validateJavaScript(code));
        break;
      case 'typescript':
      case 'ts':
        issues.push(...this.validateTypeScript(code));
        break;
      case 'python':
      case 'py':
        issues.push(...this.validatePython(code));
        break;
      case 'json':
        issues.push(...this.validateJSON(code));
        break;
    }

    return issues;
  }

  private validateJavaScript(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Basic syntax checks
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      issues.push({
        type: 'error',
        message: 'Mismatched braces in JavaScript code',
        severity: 'high'
      });
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      issues.push({
        type: 'error',
        message: 'Mismatched parentheses in JavaScript code',
        severity: 'high'
      });
    }

    return issues;
  }

  private validateTypeScript(code: string): ValidationIssue[] {
    // For now, use JavaScript validation
    return this.validateJavaScript(code);
  }

  private validatePython(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check indentation consistency
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    const indentations = lines.map(line => line.match(/^(\s*)/)?.[1].length || 0);
    
    const uniqueIndents = [...new Set(indentations)].sort((a, b) => a - b);
    if (uniqueIndents.length > 1) {
      const differences = uniqueIndents.slice(1).map((indent, i) => indent - uniqueIndents[i]);
      const isConsistent = differences.every(diff => diff === differences[0]);
      
      if (!isConsistent) {
        issues.push({
          type: 'warning',
          message: 'Inconsistent indentation in Python code',
          severity: 'medium'
        });
      }
    }

    return issues;
  }

  private validateJSON(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      JSON.parse(code);
    } catch (error: any) {
      issues.push({
        type: 'error',
        message: `Invalid JSON: ${error.message}`,
        severity: 'high'
      });
    }

    return issues;
  }
}

class CodeCompletenessRule implements ValidationRule {
  name = 'code-completeness';
  description = 'Validates code completeness and best practices';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content;
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    const codeBlocks = this.extractCodeBlocks(content);
    
    for (const block of codeBlocks) {
      // Check for TODO comments
      if (block.code.includes('TODO') || block.code.includes('FIXME')) {
        issues.push({
          type: 'info',
          message: 'Code contains TODO/FIXME comments',
          severity: 'low'
        });
      }

      // Check for proper error handling
      if (this.lacksErrorHandling(block.code, block.language)) {
        issues.push({
          type: 'warning',
          message: 'Code may lack proper error handling',
          severity: 'medium'
        });
        score -= 0.1;
      }

      // Check for documentation
      if (this.lacksDocumentation(block.code, block.language)) {
        issues.push({
          type: 'info',
          message: 'Code could benefit from more documentation',
          severity: 'low'
        });
      }
    }

    return {
      isValid: score > 0.6,
      score: Math.max(0, score),
      issues,
      suggestions: issues.length > 0 ? ['Consider adding error handling and documentation'] : []
    };
  }

  private extractCodeBlocks(content: string): Array<{ code: string; language: string }> {
    // Reuse the same logic from CodeSyntaxRule
    const blocks: Array<{ code: string; language: string }> = [];
    const fencedRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = fencedRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }

    return blocks;
  }

  private lacksErrorHandling(code: string, language: string): boolean {
    const errorHandlingPatterns = [
      'try', 'catch', 'except', 'finally', 'throw', 'raise',
      'error', 'Error', 'Exception', 'if.*error', 'if.*err'
    ];

    const hasErrorHandling = errorHandlingPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(code)
    );

    // Only flag if code is substantial and has function definitions
    const isSubstantial = code.length > 200;
    const hasFunctions = /function|def|class/.test(code);

    return isSubstantial && hasFunctions && !hasErrorHandling;
  }

  private lacksDocumentation(code: string, language: string): boolean {
    const docPatterns = [
      '/\\*\\*', '"""', "'''", '//', '#', '<!--'
    ];

    const hasDocumentation = docPatterns.some(pattern => 
      new RegExp(pattern).test(code)
    );

    // Only flag if code is substantial
    return code.length > 300 && !hasDocumentation;
  }
}

class CodeSecurityRule implements ValidationRule {
  name = 'code-security';
  description = 'Validates code for potential security issues';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content;
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    const securityIssues = this.findSecurityIssues(content);
    issues.push(...securityIssues);
    score -= securityIssues.length * 0.2;

    return {
      isValid: securityIssues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, score),
      issues,
      suggestions: issues.length > 0 ? ['Review code for security best practices'] : []
    };
  }

  private findSecurityIssues(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for hardcoded credentials
    const credentialPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /api_key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'error',
          message: 'Potential hardcoded credentials detected',
          severity: 'critical'
        });
        break;
      }
    }

    // Check for SQL injection vulnerabilities
    if (/query\s*=.*\+.*input|execute\s*\(.*\+/i.test(content)) {
      issues.push({
        type: 'warning',
        message: 'Potential SQL injection vulnerability',
        severity: 'high'
      });
    }

    // Check for eval usage
    if (/eval\s*\(/i.test(content)) {
      issues.push({
        type: 'warning',
        message: 'Use of eval() detected - potential security risk',
        severity: 'high'
      });
    }

    return issues;
  }
}

class ResponseStructureRule implements ValidationRule {
  name = 'response-structure';
  description = 'Validates response structure and formatting';

  validate(response: AIResponse, request?: any): ValidationResult {
    const content = response.content;
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    // Check for proper markdown formatting
    if (this.hasMarkdownIssues(content)) {
      issues.push({
        type: 'warning',
        message: 'Markdown formatting issues detected',
        severity: 'low'
      });
      score -= 0.1;
    }

    // Check for proper code block formatting
    if (this.hasCodeBlockIssues(content)) {
      issues.push({
        type: 'warning',
        message: 'Code block formatting issues detected',
        severity: 'medium'
      });
      score -= 0.2;
    }

    return {
      isValid: score > 0.7,
      score: Math.max(0, score),
      issues,
      suggestions: issues.length > 0 ? ['Improve response formatting'] : []
    };
  }

  private hasMarkdownIssues(content: string): boolean {
    // Check for unmatched markdown syntax
    const backticks = (content.match(/`/g) || []).length;
    const asterisks = (content.match(/\*\*/g) || []).length;
    
    return backticks % 2 !== 0 || asterisks % 2 !== 0;
  }

  private hasCodeBlockIssues(content: string): boolean {
    const openBlocks = (content.match(/```/g) || []).length;
    return openBlocks % 2 !== 0;
  }
}

class RelevanceRule implements ValidationRule {
  name = 'relevance';
  description = 'Validates response relevance to the request';

  validate(response: AIResponse, request?: any): ValidationResult {
    if (!request) {
      return {
        isValid: true,
        score: 1.0,
        issues: [],
        suggestions: []
      };
    }

    const content = response.content.toLowerCase();
    const requestContent = request.content?.toLowerCase() || '';
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    // Extract keywords from request
    const requestKeywords = this.extractKeywords(requestContent);
    const responseKeywords = this.extractKeywords(content);

    // Calculate keyword overlap
    const overlap = requestKeywords.filter(keyword => 
      responseKeywords.includes(keyword)
    ).length;

    const relevanceScore = requestKeywords.length > 0 ? overlap / requestKeywords.length : 1;

    if (relevanceScore < 0.3) {
      issues.push({
        type: 'warning',
        message: 'Response may not be relevant to the request',
        severity: 'medium'
      });
      score = relevanceScore;
    }

    return {
      isValid: relevanceScore > 0.2,
      score,
      issues,
      suggestions: issues.length > 0 ? ['Ensure response addresses the request'] : []
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'can', 'could', 'should', 'would', 'will', 'shall', 'may'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}

