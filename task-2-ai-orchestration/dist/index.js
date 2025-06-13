"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIOrchestrationEngine = void 0;
exports.createDefaultConfig = createDefaultConfig;
// Main AI Orchestration Engine exports
var engine_1 = require("./api/engine");
Object.defineProperty(exports, "AIOrchestrationEngine", { enumerable: true, get: function () { return engine_1.AIOrchestrationEngine; } });
// Core types
__exportStar(require("./types"), exports);
// Provider system
__exportStar(require("./providers"), exports);
// Local model support
__exportStar(require("./local-models"), exports);
// Intelligent routing
__exportStar(require("./router"), exports);
// Context management
__exportStar(require("./context"), exports);
// Response processing
__exportStar(require("./processing"), exports);
function createDefaultConfig() {
    return {
        port: 3000,
        host: '0.0.0.0',
        cors: true,
        websocket: true,
        router: {
            defaultStrategy: 'performance',
            fallbackEnabled: true,
            maxRetries: 3,
            retryDelay: 1000,
            performanceTracking: true,
            adaptiveLearning: true
        },
        context: {
            maxFiles: 100,
            maxTokens: 50000,
            relevanceThreshold: 0.3,
            compressionEnabled: true,
            cacheEnabled: true,
            analysisDepth: 'medium',
            autoRefresh: false,
            refreshInterval: 30,
            persistCache: false,
            watchFileChanges: false
        },
        processing: {
            cacheEnabled: true,
            cacheSize: 1000,
            cacheTTL: 60,
            formatEnabled: true,
            optimizationEnabled: true,
            qualityThreshold: 0.7
        }
    };
}
//# sourceMappingURL=index.js.map