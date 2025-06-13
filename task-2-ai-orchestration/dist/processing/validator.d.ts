import { AIResponse } from '../types';
export interface ValidationRule {
    name: string;
    description: string;
    validate(response: AIResponse, request?: any): ValidationResult;
}
export interface ValidationResult {
    isValid: boolean;
    score: number;
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
export declare class ResponseValidator {
    private rules;
    constructor();
    validateResponse(response: AIResponse, request?: any): ValidationResult;
    addRule(rule: ValidationRule): void;
    removeRule(name: string): void;
    getRules(): ValidationRule[];
    private initializeDefaultRules;
    private combineValidationResults;
}
//# sourceMappingURL=validator.d.ts.map