/**
 * Complete Test Suite Runner
 * Runs all available tests to validate core functionality
 */

const { runPropertyBasedTests } = require('./test-property-based.cjs');
const { runStylingTests } = require('./test-styling.cjs');

async function runAllTests() {
  console.log('🚀 Running Complete Test Suite for Slack Markdown Renderer\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  
  // Run property-based tests
  console.log('\n1️⃣ PROPERTY-BASED TESTS');
  console.log('-'.repeat(30));
  const propertyTestsPassed = await runPropertyBasedTests();
  if (!propertyTestsPassed) allTestsPassed = false;
  
  // Run styling tests
  console.log('\n2️⃣ STYLING APPLICATION TESTS');
  console.log('-'.repeat(30));
  const stylingTestsPassed = runStylingTests();
  if (!stylingTestsPassed) allTestsPassed = false;
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Property-Based Tests: ${propertyTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Styling Application Tests: ${stylingTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    return true;
  } else {
    console.log('\n❌ SOME TESTS FAILED! Please review the issues above.');
    return false;
  }
}

// Run all tests
if (require.main === module) {
  runAllTests().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runAllTests };
