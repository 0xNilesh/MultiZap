import { TestUtils } from './utils/testUtils';

async function runTests() {
  try {
    console.log('🚀 Starting Relayer Service Tests...\n');
    
    const allTestsPassed = await TestUtils.runAllTests();
    
    if (allTestsPassed) {
      console.log('\n✅ All tests passed! The relayer service is working correctly.');
      
      console.log('\n📋 Sample API Requests:');
      const sampleRequests = TestUtils.getSampleRequests();
      console.log(JSON.stringify(sampleRequests, null, 2));
      
      console.log('\n🎯 Next Steps:');
      console.log('1. Start MongoDB: mongod');
      console.log('2. Set up environment: cp config/env.example .env');
      console.log('3. Install dependencies: npm install');
      console.log('4. Start development server: npm run dev');
      console.log('5. Test the API endpoints using the sample requests above');
      
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
} 