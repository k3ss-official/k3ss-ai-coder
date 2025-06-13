import { AIOrchestrationEngine, createDefaultConfig } from '../src/index';

async function testOrchestrationEngine() {
  console.log('Testing AI Orchestration Engine...');
  
  try {
    // Create engine with default configuration
    const config = createDefaultConfig();
    const engine = new AIOrchestrationEngine(config);
    
    // Test configuration
    const orchestrationConfig = {
      providers: [
        {
          name: 'openai',
          type: 'cloud' as const,
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          baseURL: 'https://api.openai.com/v1'
        }
      ],
      localModels: [
        {
          framework: 'ollama' as const,
          enabled: true,
          baseURL: 'http://localhost:11434'
        }
      ]
    };
    
    // Initialize engine
    console.log('Initializing engine...');
    await engine.initialize(orchestrationConfig);
    
    // Start server
    console.log('Starting server...');
    await engine.start();
    
    console.log('✅ AI Orchestration Engine started successfully!');
    console.log(`Server running on http://${config.host}:${config.port}`);
    
    // Test health endpoint
    const health = await fetch(`http://${config.host}:${config.port}/health`);
    const healthData = await health.json();
    console.log('Health check:', healthData.success ? '✅ Healthy' : '❌ Unhealthy');
    
    // Stop server after test
    setTimeout(async () => {
      await engine.stop();
      console.log('✅ Test completed successfully');
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testOrchestrationEngine();
}

export { testOrchestrationEngine };

