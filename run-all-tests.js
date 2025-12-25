/**
 * Complete Test Suite Runner
 * Runs all tests to validate core functionality
 */

const { runTests } = require('./test-core-functionality');
const { runIntegrationTests } = require('./test-integration');
const { validateManifest } = require('./test-manifest');
const { runPropertyBasedTests } = require('./test-property-based');
const { runStylingTests } = require('./test-styling');

function runAllTests() {
  console.log('🚀 Running Complete Test Suite for Slack Markdown Renderer\n');
  console.log('=' .repeat(60));
  
  let allTestsPassed = true;
  
  // Run core functionality tests
  console.log('\n1️⃣ CORE FUNCTIONALITY TESTS');
  console.log('-'.repeat(30));
  const coreTestsPassed = runTests();
  if (!coreTestsPassed) allTestsPassed = false;
  
  // Run integration tests
  console.log('\n2️⃣ INTEGRATION TESTS');
  console.log('-'.repeat(30));
  const integrationTestsPassed = runIntegrationTests();
  if (!integrationTestsPassed) allTestsPassed = false;
  
  // Run manifest validation
  console.log('\n3️⃣ MANIFEST VALIDATION');
  console.log('-'.repeat(30));
  const manifestValid = validateManifest();
  if (!manifestValid) allTestsPassed = false;
  
  // Run property-based tests
  console.log('\n4️⃣ PROPERTY-BASED TESTS');
  console.log('-'.repeat(30));
  const propertyTestsPassed = runPropertyBasedTests();
  if (!propertyTestsPassed) allTestsPassed = false;
  
  // Run styling tests
  console.log('\n5️⃣ STYLING APPLICATION TESTS');
  console.log('-'.repeat(30));
  const stylingTestsPassed = runStylingTests();
  if (!stylingTestsPassed) allTestsPassed = false;
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Core Functionality Tests: ${coreTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Integration Tests: ${integrationTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Manifest Validation: ${manifestValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Property-Based Tests: ${propertyTestsPassed ? '✅ PASSED' : '❌ FAILED (9/12 failed)'}`);
  console.log(`Styling Application Tests: ${stylingTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Core functionality is working correctly.');
    console.log('\n✨ The Slack Markdown Renderer extension is ready for the next development phase.');
    console.log('\n📋 Core Features Validated:');
    console.log('   • URL detection for Slack RAW file pages');
    console.log('   • Content analysis and Markdown detection');
    console.log('   • Markdown parsing with Marked.js');
    console.log('   • DOM content replacement');
    console.log('   • CSS class application and styling');
    console.log('   • Background color theme management');
    console.log('   • Typography enhancements');
    console.log('   • Error handling and edge cases');
    console.log('   • Chrome extension manifest structure');
    console.log('   • Property-based correctness validation');
    return true;
  } else {
    console.log('\n❌ SOME TESTS FAILED! Please review the issues above.');
    console.log('\n📋 Status Summary:');
    console.log(`   • Core functionality: ${coreTestsPassed ? 'Working' : 'Issues detected'}`);
    console.log(`   • Integration: ${integrationTestsPassed ? 'Working' : 'Issues detected'}`);
    console.log(`   • Manifest: ${manifestValid ? 'Valid' : 'Issues detected'}`);
    console.log(`   • Property-based tests: ${propertyTestsPassed ? 'All passed' : '9/12 failed - implementation needs refinement'}`);
    console.log(`   • Styling application: ${stylingTestsPassed ? 'Working' : 'Issues detected'}`);
    return false;
  }
}

// Run all tests
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runAllTests };