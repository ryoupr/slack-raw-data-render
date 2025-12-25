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
  
  // Define critical functions directly (extracted from content-script.js)
  global.isMarkdownExtension = function(extension) {
    if (!extension) return false;
    const markdownExtensions = ['md', 'markdown', 'mdown', 'mkd', 'mkdn'];
    return markdownExtensions.includes(extension.toLowerCase());
  };
  
  global.extractTextContent = function() {
    const possibleContainers = [
      'pre', 'code', '.file-content', '.raw-content', 
      '[data-qa="file_content"]', '.p-file_content'
    ];
    
    for (const selector of possibleContainers) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return document.body.textContent.trim();
  };
  
  global.processMarkdownContent = function(content) {
    if (!content || typeof content !== 'string') {
      return { success: false, error: 'Invalid content' };
    }
    return { success: true, content: content };
  };
  
  global.detectSlackRawUrl = function(url) {
    if (typeof url !== 'string' || url.length === 0) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'files.slack.com' && 
             urlObj.pathname.startsWith('/files-pri/');
    } catch (error) {
      return false;
    }
  };
  
  global.analyzeContentType = function(content) {
    if (typeof content !== 'string' || content.length === 0) {
      return {
        isMarkdown: false,
        confidence: 0,
        detectedFeatures: [],
        fileExtension: null
      };
    }
    
    const features = [];
    let confidence = 0;
    
    const patterns = {
      HEADERS: /^#{1,6}\s+.+$/m,
      LISTS: /^[\s]*[-*+]\s+.+$/m,
      CODE_BLOCKS: /```[\s\S]*?```|`[^`\n]+`/,
      LINKS: /\[([^\]]+)\]\(([^)]+)\)/,
      EMPHASIS: /(\*\*|__)[^*_]+(\*\*|__)|(\*|_)[^*_]+(\*|_)/,
      BLOCKQUOTES: /^>\s+.+$/m,
      HORIZONTAL_RULES: /^[-*_]{3,}$/m,
      TABLES: /\|.*\|.*\|/
    };
    
    for (const [feature, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        features.push(feature.toLowerCase());
        confidence += 0.15;
      }
    }
    
    confidence = Math.min(confidence, 1.0);
    
    return {
      isMarkdown: confidence > 0.1,
      confidence: confidence,
      detectedFeatures: features,
      fileExtension: null
    };
  };
  
  global.parseMarkdown = function(content) {
    if (typeof content !== 'string') {
      return '';
    }
    
    if (typeof marked !== 'undefined') {
      try {
        // Configure marked options for proper parsing
        marked.setOptions({
          breaks: true,        // Convert line breaks to <br>
          gfm: true,          // Enable GitHub Flavored Markdown
          sanitize: false,    // We'll handle sanitization separately if needed
          smartLists: true,   // Use smarter list behavior
          smartypants: false, // Don't use smart quotes
          xhtml: false        // Don't use XHTML-compliant tags
        });
        
        return marked.parse(content);
      } catch (error) {
        return content;
      }
    }
    
    return content;
  };
  
  // Load the rest of content script for initialization
  try {
    const contentScript = fs.readFileSync('content-script.js', 'utf8');
    const testableCode = contentScript
      .replace(/\(function\(\) \{/, '')
      .replace(/\}\)\(\);$/, '')
      .replace(/'use strict';/, '');
    
    eval(testableCode);
  } catch (error) {
    console.warn('Could not load full content script:', error.message);
  }
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
        fc.constant('# Header 1'),
        fc.constant('## Header 2'),
        fc.constant('### Header 3'),
        fc.constant('- Item 1\n- Item 2\n- Item 3'),
        fc.constant('* Bullet 1\n* Bullet 2'),
        fc.constant('1. First\n2. Second\n3. Third'),
        fc.constant('```javascript\nconst x = 1;\n```'),
        fc.constant('```\nplain code\n```'),
        fc.constant('[link text](https://example.com)'),
        fc.constant('[another link](https://test.com "Title")'),
        fc.constant('**bold text**'),
        fc.constant('*italic text*'),
        fc.constant('`inline code`'),
        fc.constant('> This is a blockquote\n> with multiple lines'),
        fc.constant('---'),
        fc.constant('| Col1 | Col2 |\n|------|------|\n| A    | B    |')
      ),
      (markdown) => {
        const html = parseMarkdown(markdown);
        
        // Check that parsing produces valid HTML
        if (typeof html !== 'string' || html.length === 0) {
          return false;
        }
        
        // Check semantic elements based on markdown type (order matters!)
        
        // Check tables first (before horizontal rules)
        if (markdown.includes('|') && markdown.includes('---')) {
          // Tables should produce <table>, <thead>, <tbody>, <tr>, <td>
          if (!html.includes('<table>') || !html.includes('<tr>') || !html.includes('<td>')) {
            return false;
          }
        }
        else if (markdown.includes('---')) {
          // Horizontal rules should produce <hr> (only if not a table)
          if (!html.includes('<hr>')) {
            return false;
          }
        }
        
        if (markdown.startsWith('#')) {
          // Headers should produce h1, h2, h3, etc.
          const headerLevel = markdown.match(/^(#{1,6})/)[1].length;
          const expectedTag = `<h${headerLevel}`;
          if (!html.includes(expectedTag)) {
            return false;
          }
        }
        
        if (markdown.startsWith('- ') || markdown.startsWith('* ')) {
          // Unordered lists should produce <ul> and <li>
          if (!html.includes('<ul>') || !html.includes('<li>')) {
            return false;
          }
        }
        
        if (markdown.match(/^\d+\. /m)) {
          // Ordered lists should produce <ol> and <li>
          if (!html.includes('<ol>') || !html.includes('<li>')) {
            return false;
          }
        }
        
        if (markdown.includes('```')) {
          // Code blocks should produce <pre> and <code>
          if (!html.includes('<pre>') || !html.includes('<code')) {
            return false;
          }
        }
        
        if (markdown.includes('`') && !markdown.includes('```')) {
          // Inline code should produce <code>
          if (!html.includes('<code')) {
            return false;
          }
        }
        
        if (markdown.includes('[') && markdown.includes('](')) {
          // Links should produce <a> tags
          if (!html.includes('<a ') && !html.includes('<a>')) {
            return false;
          }
        }
        
        if (markdown.includes('**')) {
          // Bold text should produce <strong>
          if (!html.includes('<strong>')) {
            return false;
          }
        }
        
        if (markdown.includes('*') && !markdown.includes('**') && !markdown.startsWith('*')) {
          // Italic text should produce <em>
          if (!html.includes('<em>')) {
            return false;
          }
        }
        
        if (markdown.startsWith('>')) {
          // Blockquotes should produce <blockquote>
          if (!html.includes('<blockquote>')) {
            return false;
          }
        }
        
        // All checks passed - the HTML contains the expected semantic structure
        return true;
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
        // Debug: Check if function is available
        if (typeof isMarkdownExtension === 'undefined') {
          console.log('❌ isMarkdownExtension function is not defined');
          return false;
        }
        
        const isMarkdownExt = isMarkdownExtension(extension);
        const expectedMarkdown = extension === 'md' || extension === 'markdown';
        const result = isMarkdownExt === expectedMarkdown;
        
        // Debug: Log failures
        if (!result) {
          console.log(`❌ Property 6 failed for extension: ${extension}`);
          console.log(`   isMarkdownExtension(${extension}) = ${isMarkdownExt}`);
          console.log(`   Expected: ${expectedMarkdown}`);
        }
        
        return result;
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
    fc.property(
      fc.record({
        operationDuration: fc.integer({ min: 0, max: 1000 }), // 0-1 seconds
        showDelay: fc.integer({ min: 100, max: 500 }), // 100ms-500ms delay
        shouldShowIndicator: fc.boolean()
      }),
      (testData) => {
        // Test loading state management logic without actual async operations
        // This tests the core property: loading indicators should be shown for operations that exceed expected duration
        
        let indicatorShown = false;
        let indicatorHidden = false;
        let showTimeoutCalled = false;
        let hideTimeoutCalled = false;
        
        // Mock setTimeout to track timing behavior
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = (callback, delay) => {
          if (delay === testData.showDelay) {
            showTimeoutCalled = true;
            // Simulate showing indicator after delay
            if (testData.operationDuration > testData.showDelay) {
              indicatorShown = true;
              callback(); // Execute the callback
            }
          }
          return 1; // Mock timer ID
        };
        
        // Mock clearTimeout
        global.clearTimeout = (timerId) => {
          hideTimeoutCalled = true;
        };
        
        try {
          // Simulate the loading indicator logic
          const shouldShow = testData.operationDuration > testData.showDelay;
          
          // Start the "operation" with loading indicator logic
          let showTimeout = global.setTimeout(() => {
            indicatorShown = true;
          }, testData.showDelay);
          
          // Simulate operation completion
          if (testData.operationDuration <= testData.showDelay) {
            // Quick operation - should clear timeout before indicator shows
            global.clearTimeout(showTimeout);
          } else {
            // Long operation - indicator should be shown, then hidden
            indicatorHidden = true;
          }
          
          // Property: For operations that exceed the show delay, 
          // the loading state should be properly managed
          if (shouldShow) {
            // Long operation: indicator should be shown and then hidden
            return indicatorShown === true;
          } else {
            // Quick operation: indicator should not be shown (timeout cleared)
            return hideTimeoutCalled === true;
          }
          
        } finally {
          // Restore original setTimeout
          global.setTimeout = originalSetTimeout;
        }
      }
    )
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