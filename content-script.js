/**
 * Slack Markdown Renderer - Content Script
 * Automatically renders Markdown content in Slack RAW file pages
 */

(function() {
  'use strict';

  // Extension initialization
  console.log('Slack Markdown Renderer: Content script loaded');

  /**
   * URL Detection and Validation Functions
   */
  
  /**
   * Detects if the current URL is a Slack RAW file URL
   * @returns {boolean} True if current URL matches Slack RAW file pattern
   */
  function isSlackRawPage() {
    const currentUrl = window.location.href;
    return detectSlackRawUrl(currentUrl);
  }

  /**
   * Detects if a given URL matches the Slack RAW file pattern
   * @param {string} url - The URL to check
   * @returns {boolean} True if URL matches the pattern https://files.slack.com/files-pri/*
   */
  function detectSlackRawUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'files.slack.com' && 
             urlObj.pathname.startsWith('/files-pri/');
    } catch (error) {
      console.warn('Slack Markdown Renderer: Invalid URL provided to detectSlackRawUrl:', url);
      return false;
    }
  }

  /**
   * Validates URL format and accessibility
   * @param {string} url - The URL to validate
   * @returns {boolean} True if URL is valid and properly formatted
   */
  function validateUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      // Check if it's a valid HTTP/HTTPS URL
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Content Analysis Functions
   */
  
  /**
   * Extracts text content from the current page
   * @returns {string} The text content of the page
   */
  function extractTextContent() {
    // Look for common containers that might hold the raw file content
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
    
    // Fallback to body content if no specific container found
    const bodyText = document.body.textContent.trim();
    return bodyText;
  }

  /**
   * Detects if content appears to be Markdown based on syntax patterns
   * @param {string} content - The content to analyze
   * @returns {boolean} True if content appears to be Markdown
   */
  function detectMarkdownContent(content) {
    if (typeof content !== 'string' || content.length === 0) {
      return false;
    }
    
    const analysis = analyzeContentType(content);
    return analysis.isMarkdown;
  }

  /**
   * Analyzes content type and provides detailed analysis
   * @param {string} content - The content to analyze
   * @returns {Object} Analysis result with confidence and detected features
   */
  function analyzeContentType(content) {
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
    
    // Check for Markdown syntax patterns
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
        confidence += 0.15; // Each feature adds to confidence
      }
    }
    
    // Additional heuristics
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    // Check for common Markdown document structure
    if (nonEmptyLines.length > 0) {
      const firstLine = nonEmptyLines[0];
      if (firstLine.startsWith('#')) {
        confidence += 0.1; // Document starts with header
      }
    }
    
    // Boost confidence if multiple features are present
    if (features.length >= 2) {
      confidence += 0.1;
    }
    
    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);
    
    return {
      isMarkdown: confidence > 0.3, // Threshold for Markdown detection
      confidence: confidence,
      detectedFeatures: features,
      fileExtension: extractFileExtension()
    };
  }

  /**
   * Extracts file extension from the current URL
   * @returns {string|null} The file extension or null if not found
   */
  function extractFileExtension() {
    try {
      const url = window.location.href;
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Look for file extension in the path
      const match = pathname.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
      if (match) {
        return match[1].toLowerCase();
      }
      
      // Also check in query parameters for filename
      const params = new URLSearchParams(urlObj.search);
      for (const [key, value] of params) {
        if (key.includes('filename') || key.includes('name')) {
          const fileMatch = value.match(/\.([a-zA-Z0-9]+)$/);
          if (fileMatch) {
            return fileMatch[1].toLowerCase();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Slack Markdown Renderer: Error extracting file extension:', error);
      return null;
    }
  }

  /**
   * Checks if file extension indicates Markdown content
   * @param {string|null} extension - The file extension to check
   * @returns {boolean} True if extension indicates Markdown
   */
  function isMarkdownExtension(extension) {
    if (!extension) return false;
    const markdownExtensions = ['md', 'markdown', 'mdown', 'mkd', 'mkdn'];
    return markdownExtensions.includes(extension.toLowerCase());
  }

  // Initialize URL detection
  if (isSlackRawPage()) {
    console.log('Slack Markdown Renderer: Detected Slack RAW file page');
    
    // Perform content analysis
    const content = extractTextContent();
    const analysis = analyzeContentType(content);
    const fileExtension = extractFileExtension();
    
    console.log('Slack Markdown Renderer: Content analysis result:', {
      isMarkdown: analysis.isMarkdown,
      confidence: analysis.confidence,
      features: analysis.detectedFeatures,
      fileExtension: fileExtension,
      isMarkdownExtension: isMarkdownExtension(fileExtension)
    });
    
    if (analysis.isMarkdown || isMarkdownExtension(fileExtension)) {
      console.log('Slack Markdown Renderer: Markdown content detected, ready for rendering');
      // Markdown parsing and rendering will be implemented in subsequent tasks
    } else {
      console.log('Slack Markdown Renderer: No Markdown content detected');
    }
  } else {
    console.log('Slack Markdown Renderer: Not a Slack RAW file page, extension inactive');
  }
  
})();