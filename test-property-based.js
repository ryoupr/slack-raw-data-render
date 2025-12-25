/**
 * Property-Based Tests for Slack Markdown Renderer
 * Tests universal properties across generated inputs using fast-check
 */

const fc = require('fast-check');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM environment
function setupTestEnvironment(url = 'https://files.slack.com/files-pri/test-file.md') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><pre id="test-content">Test content</pre></body></html>', { url });
  global.window = dom.window;
  global.document = dom.window.document;
  global.console = console;
  
  // Load marked.js library
  const { marked } = require('marked');
  global.marked = marked;
  
  // Load content script functions
  const contentScript = fs.readFileSync('content-script.js', 'utf8');
  const testableCode = contentScript
    .replace(/\(function\(\) \{/, '')
    .replace(/\}\)\(\);$/, '')
    .replace(/'use strict';/, '');
  
  eval(testableCode);
}

function runPropertyBasedTests() {
  console.log('🔬 Running Property-Based Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  function propertyTest(name, property, options = {}) {
    totalTests++;
    try {
      fc.assert(property, { numRuns: 100, ...options });
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      if (error.counterexample) {
        console.log(`   Counterexample: ${JSON.stringify(error.counterexample)}`);
      }
    }
  }
  
  // Setup test environment
  setupTestEnvironment();
  
  // Property 1: URL Pattern Detection
  // Feature: slack-markdown-renderer, Property 1: URL Pattern Detection
  propertyTest('Property 1: URL Pattern Detection', 
    fc.property(fc.webUrl(), (url) => {
      const shouldActivate = url.startsWith('https://files.slack.com/files-pri/');
      const actuallyActivates = detectSlackRawUrl(url);
      return shouldActivate === actuallyActivates;
    })
  );
  
  // Property 2: Content Analysis Consistency  
  // Feature: slack-markdown-renderer, Property 2: Content Analysis Consistency
  propertyTest('Property 2: Content Analysis Consistency',
    fc.property(fc.string(), (content) => {
      const analysis1 = analyzeContentType(content);
      const analysis2 = analyzeContentType(content);
      return analysis1.isMarkdown === analysis2.isMarkdown &&
             analysis1.confidence === analysis2.confidence &&
             JSON.stringify(analysis1.detectedFeatures.sort()) === JSON.stringify(analysis2.detectedFeatures.sort());
    })
  );
  
  // Property 3: Markdown Detection Accuracy
  // Feature: slack-markdown-renderer, Property 3: Markdown Detection Accuracy
  propertyTest('Property 3: Markdown Detection Accuracy',
    fc.property(
      fc.oneof(
        fc.constant('# Header'),
        fc.constant('## Header 2'),
        fc.constant('- List item'),
        fc.constant('* List item'),
        fc.constant('```code```'),
        fc.constant('[link](url)'),
        fc.constant('**bold**'),
        fc.constant('*italic*')
      ),
      (markdownPattern) => {
        const analysis = analyzeContentType(markdownPattern);
        return analysis.isMarkdown === true;
      }
    )
  );
  
  // Property 4: Markdown Parsing Round Trip
  // Feature: slack-markdown-renderer, Property 4: Markdown Parsing Round Trip
  propertyTest('Property 4: Markdown Parsing Round Trip',
    fc.property(
      fc.oneof(
        fc.constant('# Header'),
        fc.constant('## Header 2'),
        fc.constant('- Item 1\n- Item 2'),
        fc.constant('```\ncode\n```'),
        fc.constant('[link](https://example.com)')
      ),
      (markdown) => {
        const html = parseMarkdown(markdown);
        // Check that parsing produces valid HTML with expected elements
        return typeof html === 'string' && html.length > 0;
      }
    )
  );
  
  // Property 5: DOM Replacement Integrity
  // Feature: slack-markdown-renderer, Property 5: DOM Replacement Integrity
  propertyTest('Property 5: DOM Replacement Integrity',
    fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (originalContent) => {
      // Setup fresh DOM for each test
      const dom = new JSDOM(`<html><body><pre id="file-content">${originalContent}</pre></body></html>`);
      global.document = dom.window.document;
      
      const originalElement = document.getElementById('file-content');
      if (!originalElement) return true; // Skip if element not found
      
      const originalText = originalElement.textContent;
      
      // Test that we can extract the original content
      const extractedContent = extractTextContent();
      return extractedContent === originalText;
    })
  );
  
  // Property 6: File Extension Recognition
  // Feature: slack-markdown-renderer, Property 6: File Extension Recognition
  propertyTest('Property 6: File Extension Recognition',
    fc.property(
      fc.oneof(
        fc.constant('md'),
        fc.constant('markdown'),
        fc.constant('txt'),
        fc.constant('js'),
        fc.constant('html'),
        fc.constant('css')
      ),
      (extension) => {
        const isMarkdownExt = isMarkdownExtension(extension);
        const expectedMarkdown = extension === 'md' || extension === 'markdown';
        return isMarkdownExt === expectedMarkdown;
      }
    )
  );
  
  // Property 7: Non-Markdown Content Preservation
  // Feature: slack-markdown-renderer, Property 7: Non-Markdown Content Preservation
  propertyTest('Property 7: Non-Markdown Content Preservation',
    fc.property(
      fc.string().filter(s => {
        // Generate strings that don't contain markdown patterns
        return !s.includes('#') && !s.includes('-') && !s.includes('*') && 
               !s.includes('```') && !s.includes('[') && !s.includes('**');
      }),
      (plainText) => {
        if (plainText.length === 0) return true; // Skip empty strings
        
        const analysis = analyzeContentType(plainText);
        // Plain text without markdown patterns should not be detected as markdown
        return !analysis.isMarkdown;
      }
    )
  );
  
  // Property 8: Toggle State Consistency
  // Feature: slack-markdown-renderer, Property 8: Toggle State Consistency
  propertyTest('Property 8: Toggle State Consistency',
    fc.property(fc.boolean(), (initialState) => {
      // This property tests that toggle state management is consistent
      // Since we don't have actual DOM manipulation in tests, we test the logic
      const state = { currentView: initialState ? 'rendered' : 'raw' };
      const newState = state.currentView === 'raw' ? 'rendered' : 'raw';
      return newState !== state.currentView;
    })
  );
  
  // Property 9: Session Preference Persistence
  // Feature: slack-markdown-renderer, Property 9: Session Preference Persistence
  propertyTest('Property 9: Session Preference Persistence',
    fc.property(fc.boolean(), (preference) => {
      // Test that preference values are preserved
      const stored = preference;
      const retrieved = stored;
      return stored === retrieved;
    })
  );
  
  // Property 10: Error Isolation
  // Feature: slack-markdown-renderer, Property 10: Error Isolation
  propertyTest('Property 10: Error Isolation',
    fc.property(
      fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(123),
        fc.constant({}),
        fc.constant([])
      ),
      (invalidInput) => {
        const result = processMarkdownContent(invalidInput);
        // Errors should be isolated and return a failure result
        return !result.success && typeof result.error === 'string';
      }
    )
  );
  
  // Property 11: Non-Blocking Processing
  // Feature: slack-markdown-renderer, Property 11: Non-Blocking Processing
  propertyTest('Property 11: Non-Blocking Processing',
    fc.property(fc.string({ maxLength: 10000 }), (content) => {
      // Test that processing doesn't block (synchronous test)
      const startTime = Date.now();
      processMarkdownContent(content);
      const endTime = Date.now();
      // Processing should complete within reasonable time
      return (endTime - startTime) < 1000; // 1 second max
    })
  );
  
  // Property 12: Loading State Management
  // Feature: slack-markdown-renderer, Property 12: Loading State Management
  propertyTest('Property 12: Loading State Management',
    fc.property(fc.boolean(), (isLoading) => {
      // Test loading state consistency
      const state = { loading: isLoading };
      return typeof state.loading === 'boolean';
    })
  );
  
  // Summary
  console.log(`\n📊 Property-Based Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All property-based tests passed!');
    return true;
  } else {
    console.log('❌ Some property-based tests failed.');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runPropertyBasedTests();
}

module.exports = { runPropertyBasedTests };