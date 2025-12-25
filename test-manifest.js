/**
 * Manifest Validation Test
 * Validates the Chrome extension manifest.json structure
 */

const fs = require('fs');
const path = require('path');

function validateManifest() {
  console.log('📋 Validating Chrome Extension Manifest...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  function test(name, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  // Load manifest.json
  const manifestPath = path.join(__dirname, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ manifest.json file not found');
    return false;
  }
  
  let manifest;
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    console.log(`❌ Failed to parse manifest.json: ${error.message}`);
    return false;
  }
  
  // Test manifest structure
  test('Manifest Version 3', () => {
    if (manifest.manifest_version !== 3) {
      throw new Error(`Expected manifest_version 3, got ${manifest.manifest_version}`);
    }
  });
  
  test('Required Fields Present', () => {
    const requiredFields = ['name', 'version', 'description'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  });
  
  test('Content Scripts Configuration', () => {
    if (!manifest.content_scripts || !Array.isArray(manifest.content_scripts)) {
      throw new Error('content_scripts must be an array');
    }
    
    const contentScript = manifest.content_scripts[0];
    if (!contentScript) {
      throw new Error('At least one content script must be defined');
    }
    
    if (!contentScript.matches || !Array.isArray(contentScript.matches)) {
      throw new Error('content_scripts.matches must be an array');
    }
    
    const expectedMatch = 'https://files.slack.com/files-pri/*';
    if (!contentScript.matches.includes(expectedMatch)) {
      throw new Error(`Expected match pattern ${expectedMatch} not found`);
    }
  });
  
  test('JavaScript Files Referenced', () => {
    const contentScript = manifest.content_scripts[0];
    if (!contentScript.js || !Array.isArray(contentScript.js)) {
      throw new Error('content_scripts.js must be an array');
    }
    
    const expectedFiles = ['lib/marked.min.js', 'content-script.js'];
    for (const file of expectedFiles) {
      if (!contentScript.js.includes(file)) {
        throw new Error(`Expected JS file ${file} not found in manifest`);
      }
      
      // Check if file exists
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Referenced JS file ${file} does not exist`);
      }
    }
  });
  
  test('CSS Files Referenced', () => {
    const contentScript = manifest.content_scripts[0];
    if (!contentScript.css || !Array.isArray(contentScript.css)) {
      throw new Error('content_scripts.css must be an array');
    }
    
    const expectedFiles = ['styles.css'];
    for (const file of expectedFiles) {
      if (!contentScript.css.includes(file)) {
        throw new Error(`Expected CSS file ${file} not found in manifest`);
      }
      
      // Check if file exists
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Referenced CSS file ${file} does not exist`);
      }
    }
  });
  
  test('Permissions Configuration', () => {
    if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
      throw new Error('permissions must be an array');
    }
    
    const expectedPermissions = ['activeTab'];
    for (const permission of expectedPermissions) {
      if (!manifest.permissions.includes(permission)) {
        throw new Error(`Expected permission ${permission} not found`);
      }
    }
  });
  
  test('Run At Configuration', () => {
    const contentScript = manifest.content_scripts[0];
    if (contentScript.run_at && contentScript.run_at !== 'document_idle') {
      console.log(`⚠️  Warning: run_at is set to ${contentScript.run_at}, recommended: document_idle`);
    }
  });
  
  // Summary
  console.log(`\n📊 Manifest Validation Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Manifest validation passed!');
    return true;
  } else {
    console.log('❌ Manifest validation failed.');
    return false;
  }
}

// Run the validation
if (require.main === module) {
  validateManifest();
}

module.exports = { validateManifest };