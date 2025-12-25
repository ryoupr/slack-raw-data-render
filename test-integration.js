/**
 * Integration Test for Slack Markdown Renderer
 * Tests the complete workflow from URL detection to content rendering
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Test different Slack RAW page scenarios
function runIntegrationTests() {
  console.log('🔗 Running Integration Tests...\n');
  
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
  
  // Test 1: Complete workflow with Markdown file
  test('Complete Workflow - Markdown File', () => {
    // Setup DOM with Markdown content
    const markdownContent = `# Test Document
    
This is a test markdown document with:

- List item 1
- List item 2

\`\`\`javascript
console.log("Hello World");
\`\`\`

[Link to example](https://example.com)
`;
    
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <pre id="file-content">${markdownContent}</pre>
        </body>
      </html>
    `, {
      url: 'https://files.slack.com/files-pri/T123-F456/test.md'
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    
    // Load marked library
    const { marked } = require('marked');
    global.marked = marked;
    
    // Load content script functions without executing the main logic
    const contentScript = fs.readFileSync('content-script.js', 'utf8');
    const testableCode = contentScript
      .replace(/\(function\(\) \{/, '')
      .replace(/\}\)\(\);$/, '')
      .replace(/'use strict';/, '')
      .replace(/\/\/ Initialize URL detection[\s\S]*$/, ''); // Remove the initialization code
    
    eval(testableCode);
    
    // Verify URL detection
    if (!isSlackRawPage()) throw new Error('Should detect Slack RAW page');
    
    // Verify content analysis with original content
    const analysis = analyzeContentType(markdownContent);
    console.log('Debug - Analysis result:', analysis); // Debug output
    
    if (!analysis.isMarkdown && !isMarkdownExtension(analysis.fileExtension)) {
      throw new Error(`Should detect Markdown content. Analysis: ${JSON.stringify(analysis)}`);
    }
    
    // Verify parsing
    const result = processMarkdownContent(markdownContent);
    if (!result.success) throw new Error(`Should successfully process Markdown: ${result.error}`);
    if (!result.styledHTML.includes('<h1>Test Document</h1>')) throw new Error('Should parse headers');
    if (!result.styledHTML.includes('<ul>')) throw new Error('Should parse lists');
    if (!result.styledHTML.includes('<pre>')) throw new Error('Should parse code blocks');
    if (!result.styledHTML.includes('<a href="https://example.com">')) throw new Error('Should parse links');
  });
  
  // Test 2: Non-Slack URL should not activate
  test('Non-Slack URL - Should Not Activate', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <pre># Not a Slack page</pre>
        </body>
      </html>
    `, {
      url: 'https://example.com/test.md'
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    
    const { marked } = require('marked');
    global.marked = marked;
    
    const contentScript = fs.readFileSync('content-script.js', 'utf8');
    const testableCode = contentScript
      .replace(/\(function\(\) \{/, '')
      .replace(/\}\)\(\);$/, '')
      .replace(/'use strict';/, '');
    
    eval(testableCode);
    
    if (isSlackRawPage()) throw new Error('Should not activate on non-Slack URLs');
  });
  
  // Test 3: Plain text file should not be processed
  test('Plain Text File - Should Not Process', () => {
    const plainContent = 'This is just plain text without any markdown syntax. No headers, no lists, no code blocks.';
    
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <pre>${plainContent}</pre>
        </body>
      </html>
    `, {
      url: 'https://files.slack.com/files-pri/T123-F456/plain.txt'
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    
    const { marked } = require('marked');
    global.marked = marked;
    
    const contentScript = fs.readFileSync('content-script.js', 'utf8');
    const testableCode = contentScript
      .replace(/\(function\(\) \{/, '')
      .replace(/\}\)\(\);$/, '')
      .replace(/'use strict';/, '');
    
    eval(testableCode);
    
    const content = extractTextContent();
    const analysis = analyzeContentType(content);
    
    // Should detect as Slack page but not as Markdown
    if (!isSlackRawPage()) throw new Error('Should detect Slack RAW page');
    if (analysis.isMarkdown) throw new Error('Should not detect plain text as Markdown');
  });
  
  // Test 4: Error handling for malformed content
  test('Error Handling - Malformed Content', () => {
    const { marked } = require('marked');
    global.marked = marked;
    
    const contentScript = fs.readFileSync('content-script.js', 'utf8');
    const testableCode = contentScript
      .replace(/\(function\(\) \{/, '')
      .replace(/\}\)\(\);$/, '')
      .replace(/'use strict';/, '');
    
    eval(testableCode);
    
    // Test with null content
    const result1 = processMarkdownContent(null);
    if (result1.success) throw new Error('Should fail gracefully with null content');
    if (!result1.error) throw new Error('Should provide error message');
    
    // Test with undefined content
    const result2 = processMarkdownContent(undefined);
    if (result2.success) throw new Error('Should fail gracefully with undefined content');
    
    // Test with non-string content
    const result3 = processMarkdownContent(123);
    if (result3.success) throw new Error('Should fail gracefully with non-string content');
  });
  
  // Summary
  console.log(`\n📊 Integration Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed!');
    return true;
  } else {
    console.log('❌ Some integration tests failed.');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runIntegrationTests();
}

module.exports = { runIntegrationTests };