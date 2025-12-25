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
      isMarkdown: confidence > 0.1, // Threshold for Markdown detection (lowered for better sensitivity)
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

  /**
   * Markdown Parsing Functions
   */
  
  /**
   * Configures Marked.js with security and feature options
   */
  function configureMarkedOptions() {
    if (typeof marked === 'undefined') {
      throw new Error('Marked.js library is not loaded');
    }
    
    // Configure marked options for security and features
    marked.setOptions({
      breaks: true,        // Convert line breaks to <br>
      gfm: true,          // Enable GitHub Flavored Markdown
      sanitize: false,    // We'll handle sanitization separately if needed
      smartLists: true,   // Use smarter list behavior
      smartypants: false, // Don't use smart quotes
      xhtml: false        // Don't use XHTML-compliant tags
    });
  }

  /**
   * Parses Markdown content and converts it to HTML
   * @param {string} markdownContent - The Markdown content to parse
   * @returns {string} The generated HTML content
   * @throws {Error} If parsing fails
   */
  function parseMarkdown(markdownContent) {
    if (typeof markdownContent !== 'string') {
      throw new Error('Markdown content must be a string');
    }
    
    if (markdownContent.trim().length === 0) {
      return '';
    }
    
    try {
      // Ensure marked is configured
      configureMarkedOptions();
      
      // Parse the markdown content
      const htmlContent = marked.parse(markdownContent);
      
      if (typeof htmlContent !== 'string') {
        throw new Error('Marked.js returned non-string result');
      }
      
      return htmlContent;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error parsing Markdown:', error);
      throw new Error(`Failed to parse Markdown: ${error.message}`);
    }
  }

  /**
   * Wrapper function for safe Markdown parsing with error handling
   * @param {string} content - The content to parse
   * @returns {Object} Result object with success status and content/error
   */
  function safeParseMarkdown(content) {
    try {
      const htmlContent = parseMarkdown(content);
      return {
        success: true,
        html: htmlContent,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        html: null,
        error: error.message
      };
    }
  }

  /**
   * Generates styled HTML with proper CSS classes and structure
   * @param {string} htmlContent - The HTML content from Markdown parsing
   * @returns {string} The styled HTML with wrapper elements
   */
  function generateStyledHTML(htmlContent) {
    if (typeof htmlContent !== 'string') {
      throw new Error('HTML content must be a string');
    }
    
    // Create a wrapper div with styling classes
    const styledHTML = `
      <div class="slack-markdown-renderer-content">
        <div class="markdown-body">
          ${htmlContent}
        </div>
      </div>
    `;
    
    return styledHTML;
  }

  /**
   * Complete Markdown processing pipeline
   * @param {string} markdownContent - The raw Markdown content
   * @returns {Object} Processing result with HTML and metadata
   */
  function processMarkdownContent(markdownContent) {
    const result = safeParseMarkdown(markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        html: null,
        styledHTML: null,
        error: result.error
      };
    }
    
    try {
      const styledHTML = generateStyledHTML(result.html);
      return {
        success: true,
        html: result.html,
        styledHTML: styledHTML,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        html: result.html,
        styledHTML: null,
        error: `Failed to generate styled HTML: ${error.message}`
      };
    }
  }

  /**
   * DOM Replacement and Content Management Functions
   */
  
  // Global state for content management
  let originalContentBackup = null;
  let currentContentContainer = null;
  let isContentReplaced = false;

  /**
   * Finds the main content container on the Slack RAW file page
   * @returns {HTMLElement|null} The content container element
   */
  function findContentContainer() {
    // Try multiple selectors to find the content container
    const possibleSelectors = [
      'pre', 
      'code', 
      '.file-content', 
      '.raw-content',
      '[data-qa="file_content"]', 
      '.p-file_content',
      '.c-file__content',
      '.file_content'
    ];
    
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element;
      }
    }
    
    // Fallback: look for any element containing substantial text content
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.children.length === 0 && 
          element.textContent.trim().length > 100 &&
          !element.closest('script') && 
          !element.closest('style')) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Backs up the original content for toggle functionality
   * @param {HTMLElement} container - The container element to backup
   */
  function backupOriginalContent(container) {
    if (!container) {
      throw new Error('Container element is required for backup');
    }
    
    originalContentBackup = {
      innerHTML: container.innerHTML,
      textContent: container.textContent,
      className: container.className,
      tagName: container.tagName
    };
    
    currentContentContainer = container;
    console.log('Slack Markdown Renderer: Original content backed up');
  }

  /**
   * Replaces the original content with rendered HTML
   * @param {string} styledHTML - The styled HTML content to display
   * @returns {boolean} True if replacement was successful
   */
  function replaceContentWithHTML(styledHTML) {
    if (typeof styledHTML !== 'string' || styledHTML.trim().length === 0) {
      throw new Error('Styled HTML content is required');
    }
    
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      throw new Error('Could not find content container for replacement');
    }
    
    // Backup original content if not already done
    if (!originalContentBackup) {
      backupOriginalContent(container);
    }
    
    try {
      // Replace the content
      container.innerHTML = styledHTML;
      container.classList.add('slack-markdown-rendered');
      isContentReplaced = true;
      
      console.log('Slack Markdown Renderer: Content successfully replaced with rendered HTML');
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error replacing content:', error);
      throw new Error(`Failed to replace content: ${error.message}`);
    }
  }

  /**
   * Restores the original content from backup
   * @returns {boolean} True if restoration was successful
   */
  function restoreOriginalContent() {
    if (!originalContentBackup || !currentContentContainer) {
      throw new Error('No backup available to restore');
    }
    
    try {
      currentContentContainer.innerHTML = originalContentBackup.innerHTML;
      currentContentContainer.className = originalContentBackup.className;
      currentContentContainer.classList.remove('slack-markdown-rendered');
      isContentReplaced = false;
      
      console.log('Slack Markdown Renderer: Original content restored');
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error restoring content:', error);
      throw new Error(`Failed to restore content: ${error.message}`);
    }
  }

  /**
   * Toggles between original and rendered content
   * @param {string} mode - 'raw' for original content, 'rendered' for HTML content
   * @param {string} styledHTML - The styled HTML content (required for 'rendered' mode)
   * @returns {boolean} True if toggle was successful
   */
  function toggleContent(mode, styledHTML = null) {
    if (mode !== 'raw' && mode !== 'rendered') {
      throw new Error('Mode must be either "raw" or "rendered"');
    }
    
    try {
      if (mode === 'rendered') {
        if (!styledHTML) {
          throw new Error('Styled HTML is required for rendered mode');
        }
        return replaceContentWithHTML(styledHTML);
      } else {
        return restoreOriginalContent();
      }
    } catch (error) {
      console.error('Slack Markdown Renderer: Error toggling content:', error);
      return false;
    }
  }

  /**
   * Gets the current content state
   * @returns {Object} Current state information
   */
  function getContentState() {
    return {
      isReplaced: isContentReplaced,
      hasBackup: !!originalContentBackup,
      containerFound: !!currentContentContainer,
      currentMode: isContentReplaced ? 'rendered' : 'raw'
    };
  }

  /**
   * Complete content replacement pipeline
   * @param {string} styledHTML - The styled HTML to display
   * @returns {Object} Replacement result with success status
   */
  function performContentReplacement(styledHTML) {
    try {
      const success = replaceContentWithHTML(styledHTML);
      return {
        success: success,
        state: getContentState(),
        error: null
      };
    } catch (error) {
      return {
        success: false,
        state: getContentState(),
        error: error.message
      };
    }
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
      console.log('Slack Markdown Renderer: Markdown content detected, processing...');
      
      // Process the Markdown content
      const processingResult = processMarkdownContent(content);
      
      if (processingResult.success) {
        console.log('Slack Markdown Renderer: Markdown processing successful');
        
        // Replace content with rendered HTML
        const replacementResult = performContentReplacement(processingResult.styledHTML);
        
        if (replacementResult.success) {
          console.log('Slack Markdown Renderer: Content replacement successful');
          console.log('Current state:', replacementResult.state);
        } else {
          console.error('Slack Markdown Renderer: Content replacement failed:', replacementResult.error);
        }
      } else {
        console.error('Slack Markdown Renderer: Markdown processing failed:', processingResult.error);
      }
    } else {
      console.log('Slack Markdown Renderer: No Markdown content detected');
    }
  } else {
    console.log('Slack Markdown Renderer: Not a Slack RAW file page, extension inactive');
  }
  
})();