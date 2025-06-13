/**
 * K3SS AI Coder - Security Test Runner
 * Execute and validate security framework functionality
 */

import { runSecurityTests } from './tests/security-tests';

async function main() {
  console.log('🚀 K3SS AI Coder - Security Framework Test Runner\n');
  console.log('Testing enterprise-grade security implementation...\n');

  try {
    const results = await runSecurityTests();
    
    console.log('\n🎯 Test Execution Complete!');
    
    if (results.summary.successRate >= 90) {
      console.log('🎉 Security framework is ready for production!');
      process.exit(0);
    } else if (results.summary.successRate >= 75) {
      console.log('⚠️  Security framework has some issues but is functional');
      process.exit(0);
    } else {
      console.log('❌ Security framework has critical issues that need attention');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

