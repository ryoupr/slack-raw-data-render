/**
 * Core Functionality Tests for Slack Markdown Renderer
 * Tests the implemented core functions to ensure they work correctly
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><pre id="test-content">Test content</pre></body></html>', {
  url: 'https://files.slack.com/files-pri/test-file.md'
});

global.window = dom.window;
global.document = dom.window.document;
global.console = console;

// Load marked.js library
try {
  const { marked } = require('marked');
  global.marked = marked;
} catch (error) {
  console.error('Failed to load marked library:', error);
  process.exit(1);
}

// Load content script
const contentScriptPath = path.join(__dirname, 'content-script.js');
if (fs.existsSync(contentScriptPath)) {
  const contentScript = fs.readFileSync(contentScriptPath, 'utf8');
  
  // Extract functions from the IIFE for testing
  const testableCode = contentScript
    .replace(/\(function\(\) \{/, '')
    .replace(/\}\)\(\);$/, '')
    .replace(/'use strict';/, '');
  
  eval(testableCode);
} else {
  console.error('Content script not found');
  process.exit(1);
}

// Test functions
function runTests() {
  console.log('🧪 Running Core Functionality Tests...\n');
  
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
  
  // Test 1: URL Detection
  test('URL Detection - Slack RAW URL', () => {
    const validUrl = 'https://files.slack.com/files-pri/T123-F456/test.md';
    const result = detectSlackRawUrl(validUrl);
    if (!result) throw new Error('Should detect valid Slack RAW URL');
  });
  
  test('URL Detection - Invalid URL', () => {
    const invalidUrl = 'https://example.com/test.md';
    const result = detectSlackRawUrl(invalidUrl);
    if (result) throw new Error('Should not detect invalid URL');
  });
  
  test('URL Detection - Empty URL', () => {
    const result = detectSlackRawUrl('');
    if (result) throw new Error('Should not detect empty URL');
  });
  
  // Test 2: Content Analysis
  test('Content Analysis - Markdown Headers', () => {
    const markdownContent = '# Header 1\n## Header 2\nSome content';
    const analysis = analyzeContentType(markdownContent);
    console.log('Header analysis:', analysis); // Debug output
    if (!analysis.isMarkdown) throw new Error(`Should detect Markdown headers. Got confidence: ${analysis.confidence}, features: ${analysis.detectedFeatures.join(', ')}`);
    if (!analysis.detectedFeatures.includes('headers')) throw new Error('Should detect header features');
  });
  
  test('Content Analysis - Markdown Lists', () => {
    const markdownContent = '- Item 1\n- Item 2\n* Item 3';
    const analysis = analyzeContentType(markdownContent);
    console.log('List analysis:', analysis); // Debug output
    if (!analysis.isMarkdown) throw new Error(`Should detect Markdown lists. Got confidence: ${analysis.confidence}, features: ${analysis.detectedFeatures.join(', ')}`);
    if (!analysis.detectedFeatures.includes('lists')) throw new Error('Should detect list features');
  });
  
  test('Content Analysis - Code Blocks', () => {
    const markdownContent = '```javascript\nconsole.log("hello");\n```';
    const analysis = analyzeContentType(markdownContent);
    console.log('Code block analysis:', analysis); // Debug output
    if (!analysis.isMarkdown) throw new Error(`Should detect Markdown code blocks. Got confidence: ${analysis.confidence}, features: ${analysis.detectedFeatures.join(', ')}`);
    if (!analysis.detectedFeatures.includes('code_blocks')) throw new Error('Should detect code block features');
  });
  
  test('Content Analysis - Non-Markdown Content', () => {
    const plainContent = 'This is just plain text without any markdown syntax.';
    const analysis = analyzeContentType(plainContent);
    if (analysis.isMarkdown) throw new Error('Should not detect plain text as Markdown');
  });
  
  // Test 3: File Extension Recognition
  test('File Extension Recognition - .md', () => {
    const result = isMarkdownExtension('md');
    if (!result) throw new Error('Should recognize .md extension');
  });
  
  test('File Extension Recognition - .markdown', () => {
    const result = isMarkdownExtension('markdown');
    if (!result) throw new Error('Should recognize .markdown extension');
  });
  
  test('File Extension Recognition - .txt', () => {
    const result = isMarkdownExtension('txt');
    if (result) throw new Error('Should not recognize .txt as Markdown extension');
  });
  
  // Test 4: Markdown Parsing
  test('Markdown Parsing - Basic Headers', () => {
    const markdown = '# Header 1\n## Header 2';
    const html = parseMarkdown(markdown);
    if (!html.includes('<h1>Header 1</h1>')) throw new Error('Should parse H1 header');
    if (!html.includes('<h2>Header 2</h2>')) throw new Error('Should parse H2 header');
  });
  
  test('Markdown Parsing - Lists', () => {
    const markdown = '- Item 1\n- Item 2';
    const html = parseMarkdown(markdown);
    if (!html.includes('<ul>')) throw new Error('Should create unordered list');
    if (!html.includes('<li>Item 1</li>')) throw new Error('Should create list items');
  });
  
  test('Markdown Parsing - Code Blocks', () => {
    const markdown = '```\ncode here\n```';
    const html = parseMarkdown(markdown);
    if (!html.includes('<pre>')) throw new Error('Should create pre element for code blocks');
    if (!html.includes('<code>')) throw new Error('Should create code element');
  });
  
  test('Markdown Parsing - Empty Content', () => {
    const html = parseMarkdown('');
    if (html !== '') throw new Error('Should return empty string for empty input');
  });
  
  // Test 5: URL Validation
  test('URL Validation - Valid HTTPS URL', () => {
    const result = validateUrl('https://example.com');
    if (!result) throw new Error('Should validate HTTPS URL');
  });
  
  test('URL Validation - Valid HTTP URL', () => {
    const result = validateUrl('http://example.com');
    if (!result) throw new Error('Should validate HTTP URL');
  });
  
  test('URL Validation - Invalid URL', () => {
    const result = validateUrl('not-a-url');
    if (result) throw new Error('Should not validate invalid URL');
  });
  
  test('URL Validation - Empty URL', () => {
    const result = validateUrl('');
    if (result) throw new Error('Should not validate empty URL');
  });
  
  // Test 6: Content Processing Pipeline
  test('Content Processing - Valid Markdown', () => {
    const markdown = '# Test Header\nSome content';
    const result = processMarkdownContent(markdown);
    if (!result.success) throw new Error('Should successfully process valid Markdown');
    if (!result.styledHTML) throw new Error('Should generate styled HTML');
    if (!result.styledHTML.includes('slack-markdown-renderer-content')) throw new Error('Should include wrapper classes');
  });
  
  test('Content Processing - Invalid Content', () => {
    const result = processMarkdownContent(null);
    if (result.success) throw new Error('Should fail for null content');
    if (!result.error) throw new Error('Should provide error message');
  });
  
  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All core functionality tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed. Core functionality needs attention.');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };