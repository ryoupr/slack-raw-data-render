/**
 * Complete Test Suite Runner
 * Runs all tests to validate core functionality
 */

const { runTests } = require('./test-core-functionality');
const { runIntegrationTests } = require('./test-integration');
const { validateManifest } = require('./test-manifest');

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
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Core Functionality Tests: ${coreTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Integration Tests: ${integrationTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Manifest Validation: ${manifestValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Core functionality is working correctly.');
    console.log('\n✨ The Slack Markdown Renderer extension is ready for the next development phase.');
    console.log('\n📋 Core Features Validated:');
    console.log('   • URL detection for Slack RAW file pages');
    console.log('   • Content analysis and Markdown detection');
    console.log('   • Markdown parsing with Marked.js');
    console.log('   • DOM content replacement');
    console.log('   • Error handling and edge cases');
    console.log('   • Chrome extension manifest structure');
    return true;
  } else {
    console.log('\n❌ SOME TESTS FAILED! Please review the issues above.');
    return false;
  }
}

// Run all tests
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runAllTests };