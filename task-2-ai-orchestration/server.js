const { AIOrchestrationEngine, createDefaultConfig } = require('./dist/index');

async function startServer() {
    console.log('🚀 Starting AI Orchestration Engine...');
    
    // Create configuration
    const config = createDefaultConfig();
    config.port = 8080;
    config.host = '0.0.0.0';
    
    console.log(`📋 Configuration: ${JSON.stringify(config, null, 2)}`);
    
    // Create engine instance
    const engine = new AIOrchestrationEngine(config);
    
    // Initialize with minimal configuration
    const orchestrationConfig = {
        providers: [
            {
                name: 'openai',
                apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
                enabled: false
            }
        ],
        localModels: [
            {
                framework: 'ollama',
                enabled: false
            }
        ]
    };
    
    try {
        await engine.initialize(orchestrationConfig);
        console.log('✅ Engine initialized successfully');
        
        await engine.start();
        console.log('🎯 AI Orchestration Engine is now running on port 8080');
        console.log('🔗 Health check: http://localhost:8080/health');
        
    } catch (error) {
        console.error('❌ Failed to start engine:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down AI Orchestration Engine...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down AI Orchestration Engine...');
    process.exit(0);
});

startServer().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});

