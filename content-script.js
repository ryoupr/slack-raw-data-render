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
   * Non-Markdown Content Handling Functions
   */
  
  /**
   * Determines if content should be processed as Markdown
   * @param {string} content - The content to evaluate
   * @param {string} fileExtension - The file extension (if available)
   * @returns {Object} Decision result with reasoning
   */
  function shouldProcessAsMarkdown(content, fileExtension = null) {
    if (!content || typeof content !== 'string') {
      return {
        shouldProcess: false,
        reason: 'Invalid or empty content',
        confidence: 0,
        analysis: null
      };
    }

    // Check file extension first (strong indicator)
    const hasMarkdownExtension = isMarkdownExtension(fileExtension);
    
    // Perform content analysis
    const analysis = analyzeContentType(content);
    
    // Decision logic based on multiple factors
    let shouldProcess = false;
    let reason = '';
    let confidence = analysis.confidence;

    if (hasMarkdownExtension) {
      // If file has Markdown extension, process it even if content analysis is uncertain
      shouldProcess = true;
      reason = `File has Markdown extension (.${fileExtension})`;
      confidence = Math.max(confidence, 0.7); // Boost confidence for file extension
    } else if (analysis.isMarkdown && analysis.confidence > 0.3) {
      // If content analysis indicates Markdown with reasonable confidence
      shouldProcess = true;
      reason = `Content analysis detected Markdown (confidence: ${analysis.confidence.toFixed(2)})`;
    } else if (analysis.confidence > 0.6) {
      // High confidence from content analysis, even without file extension
      shouldProcess = true;
      reason = `High confidence Markdown detection (confidence: ${analysis.confidence.toFixed(2)})`;
    } else {
      // Low confidence or no Markdown indicators
      shouldProcess = false;
      reason = analysis.confidence > 0 ? 
        `Low confidence Markdown detection (confidence: ${analysis.confidence.toFixed(2)})` :
        'No Markdown patterns detected';
    }

    return {
      shouldProcess,
      reason,
      confidence,
      analysis,
      hasMarkdownExtension,
      detectedFeatures: analysis.detectedFeatures || []
    };
  }

  /**
   * Handles mixed content (content that has some Markdown but also plain text)
   * @param {string} content - The mixed content
   * @param {Object} analysis - Content analysis result
   * @returns {Object} Processing decision and strategy
   */
  function handleMixedContent(content, analysis) {
    const lines = content.split('\n');
    const totalLines = lines.length;
    let markdownLines = 0;
    let plainTextLines = 0;

    // Analyze each line to determine Markdown vs plain text ratio
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return; // Skip empty lines

      // Check if line contains Markdown syntax
      const hasMarkdownSyntax = /^#{1,6}\s|^[-*+]\s|^>\s|^\d+\.\s|```|`[^`]+`|\[.*\]\(.*\)|\*\*.*\*\*|__.*__|^\s*[-*_]{3,}$/.test(trimmedLine);
      
      if (hasMarkdownSyntax) {
        markdownLines++;
      } else {
        plainTextLines++;
      }
    });

    const markdownRatio = markdownLines / (markdownLines + plainTextLines);
    
    return {
      totalLines,
      markdownLines,
      plainTextLines,
      markdownRatio,
      strategy: markdownRatio > 0.3 ? 'process_as_markdown' : 'preserve_as_plain_text',
      reasoning: `${markdownLines} Markdown lines, ${plainTextLines} plain text lines (${(markdownRatio * 100).toFixed(1)}% Markdown)`
    };
  }

  /**
   * Preserves non-Markdown content in its original form
   * @param {string} content - The content to preserve
   * @param {string} reason - Reason for preservation
   * @returns {Object} Preservation result
   */
  function preserveNonMarkdownContent(content, reason = 'Content is not Markdown') {
    console.log(`Slack Markdown Renderer: Preserving non-Markdown content - ${reason}`);
    
    // Log the decision for debugging
    logError(
      new Error('Content preserved as non-Markdown'),
      'Non-Markdown content preservation',
      ERROR_CATEGORIES.VALIDATION,
      ERROR_SEVERITY.LOW,
      {
        reason,
        contentLength: content?.length || 0,
        contentPreview: typeof content === 'string' ? content.substring(0, 100) : 'No content'
      }
    );

    return {
      preserved: true,
      reason,
      originalContent: content,
      action: 'no_modification'
    };
  }

  /**
   * Creates a notification for non-Markdown content
   * @param {string} reason - Reason why content was not processed
   * @param {Object} analysis - Content analysis result
   * @returns {HTMLElement|null} Notification element or null if creation fails
   */
  function createNonMarkdownNotification(reason, analysis = null) {
    try {
      const notification = document.createElement('div');
      notification.className = 'slack-markdown-renderer-info-notification';
      
      const confidence = analysis?.confidence || 0;
      const features = analysis?.detectedFeatures || [];
      
      notification.innerHTML = `
        <div class="info-notice">
          <p><strong>ℹ️ Slack Markdown Renderer</strong></p>
          <p>${reason}</p>
          ${confidence > 0 ? `
            <details>
              <summary>Analysis details</summary>
              <p>Confidence: ${(confidence * 100).toFixed(1)}%</p>
              ${features.length > 0 ? `<p>Detected features: ${features.join(', ')}</p>` : ''}
            </details>
          ` : ''}
        </div>
      `;
      
      return notification;
    } catch (error) {
      logError(error, 'Non-Markdown notification creation', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.LOW);
      return null;
    }
  }

  /**
   * Shows a subtle notification about non-Markdown content (optional)
   * @param {string} reason - Reason for not processing
   * @param {Object} analysis - Content analysis result
   * @param {number} duration - Duration to show notification (ms)
   */
  function showNonMarkdownNotification(reason, analysis = null, duration = 5000) {
    try {
      const notification = createNonMarkdownNotification(reason, analysis);
      if (!notification) return;

      // Add to page
      document.body.appendChild(notification);
      
      // Auto-remove after duration
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, duration);
      
      console.log(`Slack Markdown Renderer: Non-Markdown notification shown - ${reason}`);
    } catch (error) {
      logError(error, 'Non-Markdown notification display', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.LOW);
    }
  }

  /**
   * Handles content that appears to be code or structured text
   * @param {string} content - The content to analyze
   * @returns {Object} Analysis result with content type detection
   */
  function analyzeStructuredContent(content) {
    if (!content || typeof content !== 'string') {
      return { type: 'unknown', confidence: 0, features: [] };
    }

    const features = [];
    let confidence = 0;
    let detectedType = 'plain_text';

    // Check for various structured content types
    const patterns = {
      json: {
        pattern: /^\s*[\{\[][\s\S]*[\}\]]\s*$/,
        confidence: 0.9,
        features: ['json_structure']
      },
      xml: {
        pattern: /<\?xml|<[a-zA-Z][^>]*>/,
        confidence: 0.8,
        features: ['xml_tags']
      },
      csv: {
        pattern: /^[^,\n]*,[^,\n]*(?:,[^,\n]*)*$/m,
        confidence: 0.7,
        features: ['csv_structure']
      },
      log: {
        pattern: /^\d{4}-\d{2}-\d{2}|\[\d{2}:\d{2}:\d{2}\]|ERROR|WARN|INFO|DEBUG/m,
        confidence: 0.6,
        features: ['log_format']
      },
      code: {
        pattern: /(?:function|class|import|export|const|let|var|def|public|private|protected)\s+\w+|\/\*[\s\S]*?\*\/|\/\/.*$/m,
        confidence: 0.7,
        features: ['code_syntax']
      },
      config: {
        pattern: /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[=:]\s*.+$/m,
        confidence: 0.5,
        features: ['config_format']
      }
    };

    // Test each pattern
    for (const [type, { pattern, confidence: typeConfidence, features: typeFeatures }] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        detectedType = type;
        confidence = Math.max(confidence, typeConfidence);
        features.push(...typeFeatures);
      }
    }

    return {
      type: detectedType,
      confidence,
      features,
      isStructured: confidence > 0.4
    };
  }

  /**
   * Main function to handle non-Markdown content appropriately
   * @param {string} content - The content to handle
   * @param {string} fileExtension - File extension if available
   * @returns {Object} Handling result with action taken
   */
  function handleNonMarkdownContent(content, fileExtension = null) {
    // First, determine if we should process as Markdown
    const markdownDecision = shouldProcessAsMarkdown(content, fileExtension);
    
    if (markdownDecision.shouldProcess) {
      // Content should be processed as Markdown
      return {
        action: 'process_as_markdown',
        reason: markdownDecision.reason,
        confidence: markdownDecision.confidence,
        analysis: markdownDecision.analysis
      };
    }

    // Content should not be processed as Markdown
    // Analyze what type of content it might be
    const structuredAnalysis = analyzeStructuredContent(content);
    
    // Handle mixed content scenario
    if (markdownDecision.analysis && markdownDecision.analysis.detectedFeatures.length > 0) {
      const mixedAnalysis = handleMixedContent(content, markdownDecision.analysis);
      
      if (mixedAnalysis.strategy === 'process_as_markdown') {
        return {
          action: 'process_as_markdown',
          reason: `Mixed content with sufficient Markdown ratio (${mixedAnalysis.reasoning})`,
          confidence: markdownDecision.confidence,
          analysis: markdownDecision.analysis,
          mixedContent: true
        };
      }
    }

    // Preserve as non-Markdown content
    const preservationResult = preserveNonMarkdownContent(
      content,
      `${markdownDecision.reason}${structuredAnalysis.isStructured ? ` (detected as ${structuredAnalysis.type})` : ''}`
    );

    // Optionally show a subtle notification (can be disabled)
    const showNotification = false; // Set to true if you want notifications
    if (showNotification) {
      showNonMarkdownNotification(
        preservationResult.reason,
        markdownDecision.analysis,
        3000 // 3 seconds
      );
    }

    return {
      action: 'preserve_original',
      reason: preservationResult.reason,
      confidence: markdownDecision.confidence,
      analysis: markdownDecision.analysis,
      structuredAnalysis,
      preserved: true
    };
  }

  /**
   * Enhanced content analysis that considers non-Markdown content types
   * @param {string} content - The content to analyze
   * @returns {Object} Enhanced analysis result
   */
  function enhancedContentAnalysis(content) {
    const markdownAnalysis = analyzeContentType(content);
    const structuredAnalysis = analyzeStructuredContent(content);
    
    return {
      markdown: markdownAnalysis,
      structured: structuredAnalysis,
      recommendation: markdownAnalysis.isMarkdown ? 'process_as_markdown' : 'preserve_original',
      confidence: Math.max(markdownAnalysis.confidence, structuredAnalysis.confidence),
      contentType: structuredAnalysis.isStructured ? structuredAnalysis.type : 'plain_text'
    };
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
   * Error Handling and Logging System
   */
  
  // Error categories for classification
  const ERROR_CATEGORIES = {
    PARSING: 'parsing',
    DOM: 'dom',
    NETWORK: 'network',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
  };

  // Error severity levels
  const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  /**
   * Logs errors with context and categorization
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @param {string} category - Error category from ERROR_CATEGORIES
   * @param {string} severity - Error severity from ERROR_SEVERITY
   * @param {Object} additionalData - Additional data for debugging
   */
  function logError(error, context, category = ERROR_CATEGORIES.UNKNOWN, severity = ERROR_SEVERITY.MEDIUM, additionalData = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      category,
      severity,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalData
    };

    // Log to console with appropriate level
    const logMethod = severity === ERROR_SEVERITY.CRITICAL ? 'error' : 
                     severity === ERROR_SEVERITY.HIGH ? 'error' :
                     severity === ERROR_SEVERITY.MEDIUM ? 'warn' : 'log';
    
    console[logMethod](`Slack Markdown Renderer [${category.toUpperCase()}] ${context}:`, errorInfo);

    // Store error for potential reporting (in session storage for debugging)
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        const errorLog = JSON.parse(sessionStorage.getItem('slack-markdown-renderer-errors') || '[]');
        errorLog.push(errorInfo);
        
        // Keep only last 50 errors to prevent storage overflow
        if (errorLog.length > 50) {
          errorLog.splice(0, errorLog.length - 50);
        }
        
        sessionStorage.setItem('slack-markdown-renderer-errors', JSON.stringify(errorLog));
      }
    } catch (storageError) {
      console.warn('Slack Markdown Renderer: Could not store error log:', storageError);
    }
  }

  /**
   * Handles parsing errors with fallback mechanisms
   * @param {Error} error - The parsing error
   * @param {string} content - The content that failed to parse
   * @returns {Object} Fallback result with error information
   */
  function handleParsingError(error, content) {
    logError(error, 'Markdown parsing failed', ERROR_CATEGORIES.PARSING, ERROR_SEVERITY.MEDIUM, {
      contentLength: content?.length || 0,
      contentPreview: typeof content === 'string' ? content.substring(0, 100) : 'No content'
    });

    // Fallback: return original content wrapped in pre tag
    const fallbackHTML = `
      <div class="slack-markdown-renderer-content error-fallback">
        <div class="error-notice">
          <p><strong>⚠️ Markdown parsing failed</strong></p>
          <p>Displaying original content instead.</p>
          <details>
            <summary>Error details</summary>
            <pre>${error.message}</pre>
          </details>
        </div>
        <div class="original-content">
          <pre>${content || 'No content available'}</pre>
        </div>
      </div>
    `;

    return {
      success: false,
      html: null,
      styledHTML: fallbackHTML,
      error: error.message,
      fallbackUsed: true
    };
  }

  /**
   * Handles DOM manipulation errors with fallback mechanisms
   * @param {Error} error - The DOM error
   * @param {HTMLElement} element - The element that caused the error
   * @returns {Object} Result with error information and fallback status
   */
  function handleDOMError(error, element) {
    logError(error, 'DOM manipulation failed', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.HIGH, {
      elementTag: element?.tagName || 'Unknown',
      elementId: element?.id || 'No ID',
      elementClass: element?.className || 'No class'
    });

    // Fallback: try to find alternative container or create notification
    try {
      // Try to show error notification without breaking the page
      const notification = document.createElement('div');
      notification.className = 'slack-markdown-renderer-error-notification';
      notification.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; margin: 10px 0; border-radius: 4px;">
          <strong>⚠️ Slack Markdown Renderer Error</strong><br>
          Could not modify page content. The extension may not work properly on this page.
        </div>
      `;
      
      // Try to add notification to body
      if (document.body) {
        document.body.insertBefore(notification, document.body.firstChild);
        
        // Auto-remove notification after 10 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 10000);
      }

      return {
        success: false,
        error: error.message,
        fallbackUsed: true,
        notificationShown: true
      };
    } catch (fallbackError) {
      logError(fallbackError, 'DOM error fallback failed', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.CRITICAL);
      return {
        success: false,
        error: error.message,
        fallbackUsed: false,
        notificationShown: false
      };
    }
  }

  /**
   * Handles network-related errors (though less common in content scripts)
   * @param {Error} error - The network error
   * @param {string} resource - The resource that failed to load
   * @returns {Object} Result with error information
   */
  function handleNetworkError(error, resource) {
    logError(error, 'Network operation failed', ERROR_CATEGORIES.NETWORK, ERROR_SEVERITY.MEDIUM, {
      resource: resource || 'Unknown resource',
      online: navigator.onLine
    });

    // For content scripts, network errors are usually about external resources
    // Fallback: continue without the failed resource
    return {
      success: false,
      error: error.message,
      resource: resource,
      fallbackUsed: true,
      canContinue: true
    };
  }

  /**
   * Handles validation errors
   * @param {Error} error - The validation error
   * @param {string} validationType - Type of validation that failed
   * @param {*} invalidValue - The value that failed validation
   * @returns {Object} Result with error information
   */
  function handleValidationError(error, validationType, invalidValue) {
    logError(error, `Validation failed: ${validationType}`, ERROR_CATEGORIES.VALIDATION, ERROR_SEVERITY.LOW, {
      validationType,
      invalidValue: typeof invalidValue === 'object' ? JSON.stringify(invalidValue) : String(invalidValue),
      valueType: typeof invalidValue
    });

    return {
      success: false,
      error: error.message,
      validationType,
      fallbackUsed: false
    };
  }

  /**
   * Generic error handler that routes to specific handlers
   * @param {Error} error - The error to handle
   * @param {string} context - Context where error occurred
   * @param {string} category - Error category
   * @param {*} additionalData - Additional context data
   * @returns {Object} Handled error result
   */
  function handleError(error, context, category, additionalData = {}) {
    switch (category) {
      case ERROR_CATEGORIES.PARSING:
        return handleParsingError(error, additionalData.content);
      case ERROR_CATEGORIES.DOM:
        return handleDOMError(error, additionalData.element);
      case ERROR_CATEGORIES.NETWORK:
        return handleNetworkError(error, additionalData.resource);
      case ERROR_CATEGORIES.VALIDATION:
        return handleValidationError(error, additionalData.validationType, additionalData.invalidValue);
      default:
        logError(error, context, category, ERROR_SEVERITY.MEDIUM, additionalData);
        return {
          success: false,
          error: error.message,
          fallbackUsed: false
        };
    }
  }

  /**
   * Safe execution wrapper that catches and handles errors
   * @param {Function} fn - Function to execute safely
   * @param {string} context - Context description
   * @param {string} category - Error category
   * @param {*} fallbackValue - Value to return on error
   * @returns {*} Function result or fallback value
   */
  function safeExecute(fn, context, category = ERROR_CATEGORIES.UNKNOWN, fallbackValue = null) {
    try {
      return fn();
    } catch (error) {
      const result = handleError(error, context, category);
      return fallbackValue !== null ? fallbackValue : result;
    }
  }

  /**
   * Gets error log for debugging
   * @returns {Array} Array of logged errors
   */
  function getErrorLog() {
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        return JSON.parse(sessionStorage.getItem('slack-markdown-renderer-errors') || '[]');
      } else {
        return []; // Return empty array in test environment
      }
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not retrieve error log:', error);
      return [];
    }
  }

  /**
   * Clears error log
   */
  function clearErrorLog() {
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('slack-markdown-renderer-errors');
        console.log('Slack Markdown Renderer: Error log cleared');
      }
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not clear error log:', error);
    }
  }

  /**
   * Markdown Parsing Functions
   */
  
  /**
   * Configures Marked.js with security and feature options
   */
  function configureMarkedOptions() {
    if (typeof marked === 'undefined') {
      const error = new Error('Marked.js library is not loaded');
      logError(error, 'Marked.js configuration', ERROR_CATEGORIES.NETWORK, ERROR_SEVERITY.CRITICAL, {
        markedAvailable: typeof marked !== 'undefined'
      });
      throw error;
    }
    
    try {
      // Configure marked options for security and features
      marked.setOptions({
        breaks: true,        // Convert line breaks to <br>
        gfm: true,          // Enable GitHub Flavored Markdown
        sanitize: false,    // We'll handle sanitization separately if needed
        smartLists: true,   // Use smarter list behavior
        smartypants: false, // Don't use smart quotes
        xhtml: false,       // Don't use XHTML-compliant tags
        highlight: function(code, lang) {
          // Use Prism.js for syntax highlighting if available
          if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
            try {
              return Prism.highlight(code, Prism.languages[lang], lang);
            } catch (error) {
              logError(error, 'Prism.js syntax highlighting', ERROR_CATEGORIES.PARSING, ERROR_SEVERITY.LOW, {
                language: lang,
                codeLength: code?.length || 0
              });
              return code; // Return unhighlighted code
            }
          }
          return code; // Return unhighlighted code
        }
      });
    } catch (error) {
      logError(error, 'Marked.js options configuration', ERROR_CATEGORIES.PARSING, ERROR_SEVERITY.HIGH);
      throw new Error(`Failed to configure Marked.js: ${error.message}`);
    }
  }

  /**
   * Parses Markdown content and converts it to HTML
   * @param {string} markdownContent - The Markdown content to parse
   * @returns {string} The generated HTML content
   * @throws {Error} If parsing fails
   */
  function parseMarkdown(markdownContent) {
    if (typeof markdownContent !== 'string') {
      const error = new Error('Markdown content must be a string');
      logError(error, 'parseMarkdown input validation', ERROR_CATEGORIES.VALIDATION, ERROR_SEVERITY.LOW, {
        actualType: typeof markdownContent,
        value: markdownContent
      });
      throw error;
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
      logError(error, 'Markdown parsing', ERROR_CATEGORIES.PARSING, ERROR_SEVERITY.MEDIUM, {
        contentLength: markdownContent.length,
        contentPreview: markdownContent.substring(0, 100)
      });
      throw new Error(`Failed to parse Markdown: ${error.message}`);
    }
  }

  /**
   * Wrapper function for safe Markdown parsing with error handling (async version)
   * @param {string} content - The content to parse
   * @returns {Promise<Object>} Result object with success status and content/error
   */
  async function safeParseMarkdownAsync(content) {
    try {
      // Yield control before parsing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const htmlContent = parseMarkdown(content);
      return {
        success: true,
        html: htmlContent,
        error: null
      };
    } catch (error) {
      // Use the comprehensive error handler
      const errorResult = handleParsingError(error, content);
      return {
        success: false,
        html: null,
        error: error.message,
        fallbackHTML: errorResult.styledHTML
      };
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
      // Use the comprehensive error handler
      const errorResult = handleParsingError(error, content);
      return {
        success: false,
        html: null,
        error: error.message,
        fallbackHTML: errorResult.styledHTML
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
   * Complete Markdown processing pipeline (async version)
   * @param {string} markdownContent - The raw Markdown content
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>} Processing result with HTML and metadata
   */
  async function processMarkdownContent(markdownContent, progressCallback = null) {
    // Yield control to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (progressCallback) {
      progressCallback({ stage: 'parsing', progress: 0.2 });
    }
    
    const result = await safeParseMarkdownAsync(markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        html: null,
        styledHTML: result.fallbackHTML || null,
        error: result.error,
        fallbackUsed: !!result.fallbackHTML
      };
    }
    
    // Yield control after parsing
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (progressCallback) {
      progressCallback({ stage: 'styling', progress: 0.7 });
    }
    
    try {
      const styledHTML = generateStyledHTML(result.html);
      
      if (progressCallback) {
        progressCallback({ stage: 'complete', progress: 1.0 });
      }
      
      return {
        success: true,
        html: result.html,
        styledHTML: styledHTML,
        error: null,
        fallbackUsed: false
      };
    } catch (error) {
      logError(error, 'HTML styling generation', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.MEDIUM, {
        htmlLength: result.html?.length || 0
      });
      
      // Fallback: return unstyled HTML wrapped in basic container
      const fallbackHTML = `
        <div class="slack-markdown-renderer-content error-fallback">
          <div class="error-notice">
            <p><strong>⚠️ Styling failed</strong></p>
            <p>Displaying unstyled content.</p>
          </div>
          <div class="unstyled-content">
            ${result.html}
          </div>
        </div>
      `;
      
      return {
        success: false,
        html: result.html,
        styledHTML: fallbackHTML,
        error: `Failed to generate styled HTML: ${error.message}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Synchronous version of processMarkdownContent for backward compatibility
   * @param {string} markdownContent - The raw Markdown content
   * @returns {Object} Processing result with HTML and metadata
   */
  function processMarkdownContentSync(markdownContent) {
    const result = safeParseMarkdown(markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        html: null,
        styledHTML: result.fallbackHTML || null,
        error: result.error,
        fallbackUsed: !!result.fallbackHTML
      };
    }
    
    try {
      const styledHTML = generateStyledHTML(result.html);
      return {
        success: true,
        html: result.html,
        styledHTML: styledHTML,
        error: null,
        fallbackUsed: false
      };
    } catch (error) {
      logError(error, 'HTML styling generation', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.MEDIUM, {
        htmlLength: result.html?.length || 0
      });
      
      // Fallback: return unstyled HTML wrapped in basic container
      const fallbackHTML = `
        <div class="slack-markdown-renderer-content error-fallback">
          <div class="error-notice">
            <p><strong>⚠️ Styling failed</strong></p>
            <p>Displaying unstyled content.</p>
          </div>
          <div class="unstyled-content">
            ${result.html}
          </div>
        </div>
      `;
      
      return {
        success: false,
        html: result.html,
        styledHTML: fallbackHTML,
        error: `Failed to generate styled HTML: ${error.message}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Main processMarkdownContent function that works in both sync and async contexts
   * @param {string} markdownContent - The raw Markdown content
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Object} Processing result with HTML and metadata
   */
  function processMarkdownContent(markdownContent, progressCallback = null) {
    // For backward compatibility, if no progress callback is provided, use sync version
    if (!progressCallback) {
      return processMarkdownContentSync(markdownContent);
    }
    
    // If progress callback is provided, use async version
    return processMarkdownContentAsync(markdownContent, progressCallback);
  }

  /**
   * Async version of processMarkdownContent
   * @param {string} markdownContent - The raw Markdown content
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>} Processing result with HTML and metadata
   */
  async function processMarkdownContentAsync(markdownContent, progressCallback = null) {
    // Yield control to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (progressCallback) {
      progressCallback({ stage: 'parsing', progress: 0.2 });
    }
    
    const result = await safeParseMarkdownAsync(markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        html: null,
        styledHTML: result.fallbackHTML || null,
        error: result.error,
        fallbackUsed: !!result.fallbackHTML
      };
    }
    
    // Yield control after parsing
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (progressCallback) {
      progressCallback({ stage: 'styling', progress: 0.7 });
    }
    
    try {
      const styledHTML = generateStyledHTML(result.html);
      
      if (progressCallback) {
        progressCallback({ stage: 'complete', progress: 1.0 });
      }
      
      return {
        success: true,
        html: result.html,
        styledHTML: styledHTML,
        error: null,
        fallbackUsed: false
      };
    } catch (error) {
      logError(error, 'HTML styling generation', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.MEDIUM, {
        htmlLength: result.html?.length || 0
      });
      
      // Fallback: return unstyled HTML wrapped in basic container
      const fallbackHTML = `
        <div class="slack-markdown-renderer-content error-fallback">
          <div class="error-notice">
            <p><strong>⚠️ Styling failed</strong></p>
            <p>Displaying unstyled content.</p>
          </div>
          <div class="unstyled-content">
            ${result.html}
          </div>
        </div>
      `;
      
      return {
        success: false,
        html: result.html,
        styledHTML: fallbackHTML,
        error: `Failed to generate styled HTML: ${error.message}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Loading Indicator Functions
   */
  
  let loadingIndicator = null;
  let loadingTimeout = null;

  /**
   * Creates a loading indicator element
   * @param {string} message - Loading message to display
   * @returns {HTMLElement} The loading indicator element
   */
  function createLoadingIndicator(message = 'Processing Markdown...') {
    const indicator = document.createElement('div');
    indicator.className = 'slack-markdown-loading-indicator';
    indicator.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
        </div>
      </div>
    `;
    
    return indicator;
  }

  /**
   * Shows a loading indicator on the page
   * @param {string} message - Loading message to display
   * @param {number} timeout - Auto-hide timeout in milliseconds (0 = no timeout)
   * @returns {HTMLElement} The loading indicator element
   */
  function showLoadingIndicator(message = 'Processing Markdown...', timeout = 10000) {
    // Remove existing indicator if present
    hideLoadingIndicator();
    
    try {
      loadingIndicator = createLoadingIndicator(message);
      
      // Find a good place to insert the indicator
      const container = findContentContainer();
      if (container && container.parentNode) {
        container.parentNode.insertBefore(loadingIndicator, container);
      } else {
        // Fallback: add to body
        document.body.appendChild(loadingIndicator);
      }
      
      // Set auto-hide timeout if specified
      if (timeout > 0) {
        loadingTimeout = setTimeout(() => {
          hideLoadingIndicator();
          console.warn('Slack Markdown Renderer: Loading indicator auto-hidden due to timeout');
        }, timeout);
      }
      
      console.log('Slack Markdown Renderer: Loading indicator shown');
      return loadingIndicator;
    } catch (error) {
      logError(error, 'Loading indicator creation', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.LOW);
      return null;
    }
  }

  /**
   * Updates the loading indicator progress and message
   * @param {Object} progress - Progress information
   * @param {string} progress.stage - Current processing stage
   * @param {number} progress.progress - Progress value (0-1)
   * @param {string} progress.message - Optional custom message
   */
  function updateLoadingIndicator(progress) {
    if (!loadingIndicator) {
      return;
    }
    
    try {
      const messageElement = loadingIndicator.querySelector('.loading-message');
      const progressFill = loadingIndicator.querySelector('.progress-fill');
      
      // Update message based on stage
      if (progress.message) {
        messageElement.textContent = progress.message;
      } else {
        const stageMessages = {
          'parsing': 'Parsing Markdown...',
          'styling': 'Applying styles...',
          'highlighting': 'Adding syntax highlighting...',
          'complete': 'Complete!'
        };
        messageElement.textContent = stageMessages[progress.stage] || 'Processing...';
      }
      
      // Update progress bar
      if (typeof progress.progress === 'number') {
        const percentage = Math.min(100, Math.max(0, progress.progress * 100));
        progressFill.style.width = `${percentage}%`;
      }
      
    } catch (error) {
      logError(error, 'Loading indicator update', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.LOW);
    }
  }

  /**
   * Hides the loading indicator
   */
  function hideLoadingIndicator() {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
    
    if (loadingIndicator && loadingIndicator.parentNode) {
      try {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
        console.log('Slack Markdown Renderer: Loading indicator hidden');
      } catch (error) {
        logError(error, 'Loading indicator removal', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.LOW);
      }
    }
    
    loadingIndicator = null;
  }

  /**
   * Shows loading indicator for long operations
   * @param {Promise} operation - The async operation to monitor
   * @param {string} message - Loading message
   * @param {number} showDelay - Delay before showing indicator (ms)
   * @returns {Promise} The operation result
   */
  async function withLoadingIndicator(operation, message = 'Processing...', showDelay = 500) {
    let showTimeout;
    let indicatorShown = false;
    
    // Show indicator after delay to avoid flashing for quick operations
    showTimeout = setTimeout(() => {
      showLoadingIndicator(message);
      indicatorShown = true;
    }, showDelay);
    
    try {
      const result = await operation;
      
      // Clear the show timeout if operation completed quickly
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
      
      // Hide indicator if it was shown
      if (indicatorShown) {
        hideLoadingIndicator();
      }
      
      return result;
    } catch (error) {
      // Clear timeout and hide indicator on error
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
      if (indicatorShown) {
        hideLoadingIndicator();
      }
      throw error;
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
      const error = new Error('Container element is required for backup');
      logError(error, 'backupOriginalContent', ERROR_CATEGORIES.VALIDATION, ERROR_SEVERITY.MEDIUM);
      throw error;
    }
    
    try {
      originalContentBackup = {
        innerHTML: container.innerHTML,
        textContent: container.textContent,
        className: container.className,
        tagName: container.tagName
      };
      
      currentContentContainer = container;
      console.log('Slack Markdown Renderer: Original content backed up');
    } catch (error) {
      logError(error, 'Content backup', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.HIGH, {
        containerTag: container.tagName,
        containerId: container.id
      });
      throw new Error(`Failed to backup content: ${error.message}`);
    }
  }

  /**
   * Replaces the original content with rendered HTML
   * @param {string} styledHTML - The styled HTML content to display
   * @returns {boolean} True if replacement was successful
   */
  function replaceContentWithHTML(styledHTML) {
    if (typeof styledHTML !== 'string' || styledHTML.trim().length === 0) {
      const error = new Error('Styled HTML content is required');
      logError(error, 'replaceContentWithHTML', ERROR_CATEGORIES.VALIDATION, ERROR_SEVERITY.MEDIUM);
      throw error;
    }
    
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      const error = new Error('Could not find content container for replacement');
      logError(error, 'Content container detection', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.HIGH);
      throw error;
    }
    
    // Backup original content if not already done
    if (!originalContentBackup) {
      try {
        backupOriginalContent(container);
      } catch (backupError) {
        // If backup fails, we can still try to replace content but warn user
        logError(backupError, 'Backup during replacement', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.MEDIUM);
        console.warn('Slack Markdown Renderer: Content backup failed, toggle functionality may not work');
      }
    }
    
    try {
      // Replace the content
      container.innerHTML = styledHTML;
      container.classList.add('slack-markdown-rendered');
      isContentReplaced = true;
      
      console.log('Slack Markdown Renderer: Content successfully replaced with rendered HTML');
      return true;
    } catch (error) {
      const errorResult = handleDOMError(error, container);
      throw new Error(`Failed to replace content: ${error.message}`);
    }
  }

  /**
   * Restores the original content from backup
   * @returns {boolean} True if restoration was successful
   */
  function restoreOriginalContent() {
    if (!originalContentBackup || !currentContentContainer) {
      const error = new Error('No backup available to restore');
      logError(error, 'restoreOriginalContent', ERROR_CATEGORIES.VALIDATION, ERROR_SEVERITY.MEDIUM);
      throw error;
    }
    
    try {
      currentContentContainer.innerHTML = originalContentBackup.innerHTML;
      currentContentContainer.className = originalContentBackup.className;
      currentContentContainer.classList.remove('slack-markdown-rendered');
      isContentReplaced = false;
      
      console.log('Slack Markdown Renderer: Original content restored');
      return true;
    } catch (error) {
      const errorResult = handleDOMError(error, currentContentContainer);
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
   * Complete content replacement pipeline (async version)
   * @param {string} styledHTML - The styled HTML to display
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Promise<Object>} Replacement result with success status
   */
  async function performContentReplacement(styledHTML, progressCallback = null) {
    try {
      // Yield control before DOM manipulation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (progressCallback) {
        progressCallback({ stage: 'replacing', progress: 0.8 });
      }
      
      const success = replaceContentWithHTML(styledHTML);
      
      if (progressCallback) {
        progressCallback({ stage: 'complete', progress: 1.0 });
      }
      
      return {
        success: success,
        state: getContentState(),
        error: null,
        fallbackUsed: false
      };
    } catch (error) {
      // Try to handle the error gracefully
      const errorResult = handleDOMError(error, currentContentContainer || findContentContainer());
      
      return {
        success: false,
        state: getContentState(),
        error: error.message,
        fallbackUsed: errorResult.fallbackUsed,
        notificationShown: errorResult.notificationShown
      };
    }
  }

  /**
   * Synchronous version of performContentReplacement for backward compatibility
   * @param {string} styledHTML - The styled HTML to display
   * @returns {Object} Replacement result with success status
   */
  function performContentReplacementSync(styledHTML) {
    try {
      const success = replaceContentWithHTML(styledHTML);
      return {
        success: success,
        state: getContentState(),
        error: null,
        fallbackUsed: false
      };
    } catch (error) {
      // Try to handle the error gracefully
      const errorResult = handleDOMError(error, currentContentContainer || findContentContainer());
      
      return {
        success: false,
        state: getContentState(),
        error: error.message,
        fallbackUsed: errorResult.fallbackUsed,
        notificationShown: errorResult.notificationShown
      };
    }
  }

  /**
   * Toggle Button and UI Control Functions
   */
  
  // Global state for toggle functionality
  let toggleButton = null;
  let currentView = 'raw'; // 'raw' or 'rendered'
  let sessionPreferences = {
    defaultView: 'rendered',
    rememberPreference: true
  };

  /**
   * Creates and returns a toggle button element
   * @returns {HTMLElement} The created toggle button element
   */
  function createToggleButton() {
    // Remove existing button if present
    if (toggleButton && toggleButton.parentNode) {
      toggleButton.parentNode.removeChild(toggleButton);
    }
    
    // Create the button element
    const button = document.createElement('button');
    button.className = 'slack-markdown-toggle-button rendered-mode';
    button.textContent = 'Show RAW';
    button.title = 'Toggle between RAW text and rendered Markdown';
    button.setAttribute('aria-label', 'Toggle between RAW text and rendered Markdown view');
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    
    // Add click event listener
    button.addEventListener('click', handleToggleClick);
    
    // Add keyboard support
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggleClick();
      }
    });
    
    // Store reference
    toggleButton = button;
    
    console.log('Slack Markdown Renderer: Toggle button created');
    return button;
  }

  /**
   * Updates the toggle button appearance and text based on current view
   * @param {string} mode - The current view mode ('raw' or 'rendered')
   */
  function updateToggleButton(mode) {
    if (!toggleButton) {
      console.warn('Slack Markdown Renderer: Toggle button not found for update');
      return;
    }
    
    // Update button class and text based on mode
    if (mode === 'raw') {
      toggleButton.className = 'slack-markdown-toggle-button raw-mode';
      toggleButton.textContent = 'Show Rendered';
      toggleButton.title = 'Switch to rendered Markdown view';
      toggleButton.setAttribute('aria-label', 'Switch to rendered Markdown view');
    } else {
      toggleButton.className = 'slack-markdown-toggle-button rendered-mode';
      toggleButton.textContent = 'Show RAW';
      toggleButton.title = 'Switch to RAW text view';
      toggleButton.setAttribute('aria-label', 'Switch to RAW text view');
    }
    
    currentView = mode;
    console.log(`Slack Markdown Renderer: Toggle button updated to ${mode} mode`);
  }

  /**
   * Adds the toggle button to the page
   * @returns {boolean} True if button was successfully added
   */
  function addToggleButtonToPage() {
    if (!toggleButton) {
      console.error('Slack Markdown Renderer: No toggle button to add to page');
      return false;
    }
    
    try {
      // Add button to the document body
      document.body.appendChild(toggleButton);
      console.log('Slack Markdown Renderer: Toggle button added to page');
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error adding toggle button to page:', error);
      return false;
    }
  }

  /**
   * Removes the toggle button from the page
   * @returns {boolean} True if button was successfully removed
   */
  function removeToggleButtonFromPage() {
    if (toggleButton && toggleButton.parentNode) {
      try {
        toggleButton.parentNode.removeChild(toggleButton);
        console.log('Slack Markdown Renderer: Toggle button removed from page');
        return true;
      } catch (error) {
        console.error('Slack Markdown Renderer: Error removing toggle button:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * View Switching and State Management Functions
   */
  
  // Global state for processed content
  let processedMarkdownHTML = null;

  /**
   * Switches to the RAW text view
   * @returns {boolean} True if switch was successful
   */
  function switchToRawView() {
    try {
      const success = restoreOriginalContent();
      if (success) {
        updateToggleButton('raw');
        saveSessionPreference('raw');
        console.log('Slack Markdown Renderer: Switched to RAW view');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error switching to RAW view:', error);
      return false;
    }
  }

  /**
   * Switches to the rendered Markdown view (async version)
   * @returns {Promise<boolean>} True if switch was successful
   */
  async function switchToRenderedView() {
    if (!processedMarkdownHTML) {
      console.error('Slack Markdown Renderer: No processed HTML available for rendered view');
      return false;
    }
    
    try {
      // Show loading indicator for complex operations
      const shouldShowLoading = processedMarkdownHTML.length > 50000;
      
      if (shouldShowLoading) {
        showLoadingIndicator('Switching to rendered view...', 5000);
      }
      
      const success = replaceContentWithHTML(processedMarkdownHTML);
      if (success) {
        // Re-apply styling and syntax highlighting asynchronously
        await new Promise(resolve => {
          setTimeout(() => {
            safeExecute(() => applyBaseStyles(), 'Base styles application', ERROR_CATEGORIES.DOM);
            safeExecute(() => applyTypographyEnhancements(), 'Typography enhancements', ERROR_CATEGORIES.DOM);
            resolve();
          }, 0);
        });
        
        const container = currentContentContainer || findContentContainer();
        if (container) {
          await applySyntaxHighlighting(container);
        }
        
        updateToggleButton('rendered');
        saveSessionPreference('rendered');
        console.log('Slack Markdown Renderer: Switched to rendered view');
        
        if (shouldShowLoading) {
          hideLoadingIndicator();
        }
        
        return true;
      }
      
      if (shouldShowLoading) {
        hideLoadingIndicator();
      }
      
      return false;
    } catch (error) {
      hideLoadingIndicator();
      console.error('Slack Markdown Renderer: Error switching to rendered view:', error);
      return false;
    }
  }

  /**
   * Synchronous version of switchToRenderedView for backward compatibility
   * @returns {boolean} True if switch was successful
   */
  function switchToRenderedViewSync() {
    if (!processedMarkdownHTML) {
      console.error('Slack Markdown Renderer: No processed HTML available for rendered view');
      return false;
    }
    
    try {
      const success = replaceContentWithHTML(processedMarkdownHTML);
      if (success) {
        // Re-apply styling and syntax highlighting
        safeExecute(() => applyBaseStyles(), 'Base styles application', ERROR_CATEGORIES.DOM);
        safeExecute(() => applyTypographyEnhancements(), 'Typography enhancements', ERROR_CATEGORIES.DOM);
        
        const container = currentContentContainer || findContentContainer();
        if (container) {
          applySyntaxHighlightingSync(container);
        }
        
        updateToggleButton('rendered');
        saveSessionPreference('rendered');
        console.log('Slack Markdown Renderer: Switched to rendered view');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error switching to rendered view:', error);
      return false;
    }
  }

  /**
   * Toggles between RAW and rendered views (async version)
   * @returns {Promise<boolean>} True if toggle was successful
   */
  async function toggleView() {
    if (currentView === 'raw') {
      return await switchToRenderedView();
    } else {
      return switchToRawView();
    }
  }

  /**
   * Synchronous version of toggleView for backward compatibility
   * @returns {boolean} True if toggle was successful
   */
  function toggleViewSync() {
    if (currentView === 'raw') {
      return switchToRenderedViewSync();
    } else {
      return switchToRawView();
    }
  }

  /**
   * Syntax Highlighting Functions
   */
  
  /**
   * Configures Prism.js for syntax highlighting
   */
  function configurePrismOptions() {
    if (typeof Prism === 'undefined') {
      console.warn('Slack Markdown Renderer: Prism.js library is not loaded');
      return false;
    }
    
    try {
      // Configure Prism options
      Prism.manual = true; // Disable automatic highlighting
      
      // Add language aliases for common cases
      if (Prism.languages) {
        // Add common language aliases
        if (Prism.languages.javascript) {
          Prism.languages.js = Prism.languages.javascript;
          Prism.languages.jsx = Prism.languages.javascript;
        }
        if (Prism.languages.typescript) {
          Prism.languages.ts = Prism.languages.typescript;
          Prism.languages.tsx = Prism.languages.typescript;
        }
        if (Prism.languages.python) {
          Prism.languages.py = Prism.languages.python;
        }
        if (Prism.languages.bash) {
          Prism.languages.sh = Prism.languages.bash;
          Prism.languages.shell = Prism.languages.bash;
        }
      }
      
      console.log('Slack Markdown Renderer: Prism.js configured successfully');
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error configuring Prism.js:', error);
      return false;
    }
  }

  /**
   * Detects programming language from code block
   * @param {string} codeBlock - The code block text
   * @param {string} specifiedLang - Language specified in markdown (if any)
   * @returns {string} Detected or specified language
   */
  function detectCodeLanguage(codeBlock, specifiedLang = null) {
    if (specifiedLang && specifiedLang.trim()) {
      return specifiedLang.trim().toLowerCase();
    }
    
    // Simple heuristics for language detection
    const patterns = {
      javascript: [/function\s+\w+\s*\(/, /const\s+\w+\s*=/, /=>\s*{/, /console\.log/, /require\s*\(/],
      python: [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /print\s*\(/, /if\s+__name__\s*==\s*['"]/],
      java: [/public\s+class\s+\w+/, /public\s+static\s+void\s+main/, /System\.out\.println/, /import\s+java\./],
      css: [/\{\s*[\w-]+\s*:\s*[^}]+\}/, /@media\s*\(/, /\.[\w-]+\s*\{/, /#[\w-]+\s*\{/],
      html: [/<\/?[a-z][\s\S]*>/i, /<!DOCTYPE\s+html>/i, /<html[\s\S]*>/i],
      json: [/^\s*\{[\s\S]*\}\s*$/, /^\s*\[[\s\S]*\]\s*$/],
      bash: [/#!/, /\$\s+\w+/, /echo\s+/, /grep\s+/, /awk\s+/],
      sql: [/SELECT\s+.*FROM/i, /INSERT\s+INTO/i, /UPDATE\s+.*SET/i, /DELETE\s+FROM/i]
    };
    
    for (const [lang, langPatterns] of Object.entries(patterns)) {
      if (langPatterns.some(pattern => pattern.test(codeBlock))) {
        return lang;
      }
    }
    
    return 'text'; // fallback
  }

  /**
   * Applies syntax highlighting to code blocks (async version)
   * @param {HTMLElement} container - Container with rendered HTML
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Promise<boolean>} True if highlighting was successfully applied
   */
  async function applySyntaxHighlighting(container, progressCallback = null) {
    if (!container) {
      console.warn('Slack Markdown Renderer: No container provided for syntax highlighting');
      return false;
    }
    
    if (typeof Prism === 'undefined') {
      console.warn('Slack Markdown Renderer: Prism.js not available for syntax highlighting');
      return false;
    }
    
    try {
      // Configure Prism if not already done
      configurePrismOptions();
      
      // Find all code blocks
      const codeBlocks = container.querySelectorAll('pre code');
      let highlightedCount = 0;
      
      if (progressCallback) {
        progressCallback({ stage: 'highlighting', progress: 0.9 });
      }
      
      // Process code blocks in batches to avoid blocking
      const batchSize = 5;
      for (let i = 0; i < codeBlocks.length; i += batchSize) {
        const batch = Array.from(codeBlocks).slice(i, i + batchSize);
        
        // Process batch
        batch.forEach((codeElement, index) => {
          try {
            const preElement = codeElement.parentElement;
            const codeText = codeElement.textContent || '';
            
            if (codeText.trim().length === 0) {
              return; // Skip empty code blocks
            }
            
            // Detect language
            let language = 'text';
            
            // Check if language is specified in class name
            const classMatch = codeElement.className.match(/language-(\w+)/);
            if (classMatch) {
              language = classMatch[1].toLowerCase();
            } else {
              // Try to detect language from content
              language = detectCodeLanguage(codeText);
            }
            
            // Ensure we have the language in Prism
            if (!Prism.languages[language]) {
              language = 'text';
            }
            
            // Apply language class
            codeElement.className = `language-${language}`;
            preElement.className = `language-${language}`;
            
            // Add language label
            preElement.setAttribute('data-language', language);
            
            // Apply syntax highlighting
            if (language !== 'text' && Prism.languages[language]) {
              const highlightedCode = Prism.highlight(codeText, Prism.languages[language], language);
              codeElement.innerHTML = highlightedCode;
              highlightedCount++;
            }
            
            // Add copy button
            addCopyButtonToCodeBlock(preElement, codeText);
            
          } catch (error) {
            console.warn(`Slack Markdown Renderer: Error highlighting code block ${i + index}:`, error);
          }
        });
        
        // Yield control after each batch
        if (i + batchSize < codeBlocks.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      console.log(`Slack Markdown Renderer: Applied syntax highlighting to ${highlightedCount} code blocks`);
      return highlightedCount > 0;
      
    } catch (error) {
      console.error('Slack Markdown Renderer: Error applying syntax highlighting:', error);
      return false;
    }
  }

  /**
   * Synchronous version of applySyntaxHighlighting for backward compatibility
   * @param {HTMLElement} container - Container with rendered HTML
   * @returns {boolean} True if highlighting was successfully applied
   */
  function applySyntaxHighlightingSync(container) {
    if (!container) {
      console.warn('Slack Markdown Renderer: No container provided for syntax highlighting');
      return false;
    }
    
    if (typeof Prism === 'undefined') {
      console.warn('Slack Markdown Renderer: Prism.js not available for syntax highlighting');
      return false;
    }
    
    try {
      // Configure Prism if not already done
      configurePrismOptions();
      
      // Find all code blocks
      const codeBlocks = container.querySelectorAll('pre code');
      let highlightedCount = 0;
      
      codeBlocks.forEach((codeElement, index) => {
        try {
          const preElement = codeElement.parentElement;
          const codeText = codeElement.textContent || '';
          
          if (codeText.trim().length === 0) {
            return; // Skip empty code blocks
          }
          
          // Detect language
          let language = 'text';
          
          // Check if language is specified in class name
          const classMatch = codeElement.className.match(/language-(\w+)/);
          if (classMatch) {
            language = classMatch[1].toLowerCase();
          } else {
            // Try to detect language from content
            language = detectCodeLanguage(codeText);
          }
          
          // Ensure we have the language in Prism
          if (!Prism.languages[language]) {
            language = 'text';
          }
          
          // Apply language class
          codeElement.className = `language-${language}`;
          preElement.className = `language-${language}`;
          
          // Add language label
          preElement.setAttribute('data-language', language);
          
          // Apply syntax highlighting
          if (language !== 'text' && Prism.languages[language]) {
            const highlightedCode = Prism.highlight(codeText, Prism.languages[language], language);
            codeElement.innerHTML = highlightedCode;
            highlightedCount++;
          }
          
          // Add copy button
          addCopyButtonToCodeBlock(preElement, codeText);
          
        } catch (error) {
          console.warn(`Slack Markdown Renderer: Error highlighting code block ${index}:`, error);
        }
      });
      
      console.log(`Slack Markdown Renderer: Applied syntax highlighting to ${highlightedCount} code blocks`);
      return highlightedCount > 0;
      
    } catch (error) {
      console.error('Slack Markdown Renderer: Error applying syntax highlighting:', error);
      return false;
    }
  }

  /**
   * Adds a copy button to a code block
   * @param {HTMLElement} preElement - The pre element containing the code
   * @param {string} codeText - The code text to copy
   */
  function addCopyButtonToCodeBlock(preElement, codeText) {
    try {
      // Remove existing copy button if present
      const existingButton = preElement.querySelector('.copy-button');
      if (existingButton) {
        existingButton.remove();
      }
      
      // Create copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.textContent = 'Copy';
      copyButton.title = 'Copy code to clipboard';
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');
      
      // Add click handler
      copyButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          await navigator.clipboard.writeText(codeText);
          
          // Show feedback
          copyButton.textContent = 'Copied!';
          copyButton.classList.add('copied');
          
          // Reset after 2 seconds
          setTimeout(() => {
            copyButton.textContent = 'Copy';
            copyButton.classList.remove('copied');
          }, 2000);
          
        } catch (error) {
          console.warn('Slack Markdown Renderer: Could not copy to clipboard:', error);
          
          // Fallback: select text
          const range = document.createRange();
          const codeElement = preElement.querySelector('code');
          if (codeElement) {
            range.selectNodeContents(codeElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          copyButton.textContent = 'Selected';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 2000);
        }
      });
      
      // Add button to pre element
      preElement.style.position = 'relative';
      preElement.appendChild(copyButton);
      
    } catch (error) {
      console.warn('Slack Markdown Renderer: Error adding copy button:', error);
    }
  }

  /**
   * Configures syntax highlighting theme
   * @param {string} theme - Theme name ('default', 'dark')
   * @returns {boolean} True if theme was successfully applied
   */
  function setSyntaxHighlightingTheme(theme = 'default') {
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      console.warn('Slack Markdown Renderer: No container found for syntax highlighting theme');
      return false;
    }
    
    try {
      const renderedContent = container.querySelector('.slack-markdown-renderer-content');
      if (!renderedContent) {
        console.warn('Slack Markdown Renderer: No rendered content found for syntax highlighting theme');
        return false;
      }
      
      // Remove existing theme classes
      renderedContent.classList.remove('theme-dark');
      
      // Apply new theme
      if (theme === 'dark') {
        renderedContent.classList.add('theme-dark');
      }
      
      console.log(`Slack Markdown Renderer: Syntax highlighting theme set to ${theme}`);
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error setting syntax highlighting theme:', error);
      return false;
    }
  }

  /**
   * Style Controller Functions
   */
  
  /**
   * Available background themes
   */
  const BACKGROUND_THEMES = {
    WHITE: 'theme-white',
    LIGHT_GRAY: 'theme-light-gray',
    WARM_WHITE: 'theme-warm-white',
    PAPER: 'theme-paper'
  };

  /**
   * Applies base styles to the rendered content
   */
  function applyBaseStyles() {
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      console.warn('Slack Markdown Renderer: No container found for applying base styles');
      return false;
    }
    
    try {
      // Ensure the container has the base styling class
      const renderedContent = container.querySelector('.slack-markdown-renderer-content');
      if (renderedContent) {
        renderedContent.classList.add('slack-markdown-renderer-content');
        console.log('Slack Markdown Renderer: Base styles applied');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error applying base styles:', error);
      return false;
    }
  }

  /**
   * Sets the background color theme for rendered content
   * @param {string} theme - The theme name (white, light-gray, warm-white, paper)
   * @returns {boolean} True if theme was successfully applied
   */
  function setBackgroundTheme(theme = 'white') {
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      console.warn('Slack Markdown Renderer: No container found for setting background theme');
      return false;
    }
    
    try {
      const renderedContent = container.querySelector('.slack-markdown-renderer-content');
      if (!renderedContent) {
        console.warn('Slack Markdown Renderer: No rendered content found for theme application');
        return false;
      }
      
      // Remove existing theme classes
      Object.values(BACKGROUND_THEMES).forEach(themeClass => {
        renderedContent.classList.remove(themeClass);
      });
      
      // Apply new theme
      const themeClass = BACKGROUND_THEMES[theme.toUpperCase().replace('-', '_')] || BACKGROUND_THEMES.WHITE;
      renderedContent.classList.add(themeClass);
      
      // Save theme preference
      saveThemePreference(theme);
      
      console.log(`Slack Markdown Renderer: Background theme set to ${theme}`);
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error setting background theme:', error);
      return false;
    }
  }

  /**
   * Gets the current background theme
   * @returns {string} The current theme name
   */
  function getCurrentBackgroundTheme() {
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      return 'white'; // default
    }
    
    const renderedContent = container.querySelector('.slack-markdown-renderer-content');
    if (!renderedContent) {
      return 'white'; // default
    }
    
    // Check which theme class is applied
    for (const [themeName, themeClass] of Object.entries(BACKGROUND_THEMES)) {
      if (renderedContent.classList.contains(themeClass)) {
        return themeName.toLowerCase().replace('_', '-');
      }
    }
    
    return 'white'; // default
  }

  /**
   * Saves theme preference to session storage
   * @param {string} theme - The theme to save
   */
  function saveThemePreference(theme) {
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('slack-markdown-renderer-theme-preference', theme);
      }
      console.log(`Slack Markdown Renderer: Theme preference saved: ${theme}`);
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not save theme preference:', error);
    }
  }

  /**
   * Loads theme preference from session storage
   * @returns {string} The saved theme preference or default
   */
  function loadThemePreference() {
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        const savedTheme = sessionStorage.getItem('slack-markdown-renderer-theme-preference');
        if (savedTheme && Object.keys(BACKGROUND_THEMES).includes(savedTheme.toUpperCase().replace('-', '_'))) {
          console.log(`Slack Markdown Renderer: Theme preference loaded: ${savedTheme}`);
          return savedTheme;
        }
      }
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not load theme preference:', error);
    }
    
    return 'white'; // default
  }

  /**
   * Applies typography and spacing enhancements
   * @returns {boolean} True if enhancements were successfully applied
   */
  function applyTypographyEnhancements() {
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      console.warn('Slack Markdown Renderer: No container found for typography enhancements');
      return false;
    }
    
    try {
      const renderedContent = container.querySelector('.slack-markdown-renderer-content');
      if (!renderedContent) {
        console.warn('Slack Markdown Renderer: No rendered content found for typography enhancements');
        return false;
      }
      
      // Apply enhanced typography class if not already present
      if (!renderedContent.classList.contains('enhanced-typography')) {
        renderedContent.classList.add('enhanced-typography');
      }
      
      console.log('Slack Markdown Renderer: Typography enhancements applied');
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error applying typography enhancements:', error);
      return false;
    }
  }

  /**
   * Applies color scheme and contrast settings
   * @param {string} scheme - The color scheme ('default', 'high-contrast')
   * @returns {boolean} True if color scheme was successfully applied
   */
  function applyColorScheme(scheme = 'default') {
    const container = currentContentContainer || findContentContainer();
    if (!container) {
      console.warn('Slack Markdown Renderer: No container found for color scheme');
      return false;
    }
    
    try {
      const renderedContent = container.querySelector('.slack-markdown-renderer-content');
      if (!renderedContent) {
        console.warn('Slack Markdown Renderer: No rendered content found for color scheme');
        return false;
      }
      
      // Remove existing color scheme classes
      renderedContent.classList.remove('high-contrast-scheme');
      
      // Apply new color scheme
      if (scheme === 'high-contrast') {
        renderedContent.classList.add('high-contrast-scheme');
      }
      
      console.log(`Slack Markdown Renderer: Color scheme set to ${scheme}`);
      return true;
    } catch (error) {
      console.error('Slack Markdown Renderer: Error applying color scheme:', error);
      return false;
    }
  }

  /**
   * Session Preference Management Functions
   */
  
  /**
   * Saves user preference for the current session
   * @param {string} viewMode - The preferred view mode ('raw' or 'rendered')
   */
  function saveSessionPreference(viewMode) {
    if (viewMode !== 'raw' && viewMode !== 'rendered') {
      console.warn('Slack Markdown Renderer: Invalid view mode for session preference:', viewMode);
      return;
    }
    
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('slack-markdown-renderer-view-preference', viewMode);
      }
      sessionPreferences.defaultView = viewMode;
      console.log(`Slack Markdown Renderer: Session preference saved: ${viewMode}`);
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not save session preference:', error);
    }
  }

  /**
   * Loads user preference from the current session
   * @returns {string} The saved view preference or default
   */
  function loadSessionPreference() {
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        const savedPreference = sessionStorage.getItem('slack-markdown-renderer-view-preference');
        if (savedPreference === 'raw' || savedPreference === 'rendered') {
          sessionPreferences.defaultView = savedPreference;
          console.log(`Slack Markdown Renderer: Session preference loaded: ${savedPreference}`);
          return savedPreference;
        }
      }
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not load session preference:', error);
    }
    
    // Return default preference
    return sessionPreferences.defaultView;
  }

  /**
   * Clears session preferences
   */
  function clearSessionPreference() {
    try {
      // Check if sessionStorage is available (not available in Node.js test environment)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('slack-markdown-renderer-view-preference');
      }
      sessionPreferences.defaultView = 'rendered'; // Reset to default
      console.log('Slack Markdown Renderer: Session preference cleared');
    } catch (error) {
      console.warn('Slack Markdown Renderer: Could not clear session preference:', error);
    }
  }

  /**
   * Gets current session preferences
   * @returns {Object} Current session preferences
   */
  function getSessionPreferences() {
    return {
      defaultView: sessionPreferences.defaultView,
      rememberPreference: sessionPreferences.rememberPreference,
      currentSession: loadSessionPreference()
    };
  }

  /**
   * State Management Functions
   */
  
  /**
   * Gets comprehensive current state of the extension
   * @returns {Object} Complete state information
   */
  function getCurrentState() {
    return {
      page: {
        isSlackRawPage: isSlackRawPage(),
        url: window.location.href
      },
      content: getContentState(),
      toggle: getToggleButtonState(),
      view: {
        currentView: currentView,
        hasProcessedHTML: !!processedMarkdownHTML
      },
      preferences: getSessionPreferences()
    };
  }

  /**
   * Initializes the extension with user preferences
   * @param {string} preferredView - The preferred initial view
   */
  function initializeWithPreferences(preferredView = null) {
    // Load session preference if no preference specified
    const initialView = preferredView || loadSessionPreference();
    
    console.log(`Slack Markdown Renderer: Initializing with preferred view: ${initialView}`);
    
    // Set the initial view based on preference
    if (initialView === 'raw' && currentView === 'rendered') {
      // Switch to RAW view if that's the preference
      switchToRawView();
    } else if (initialView === 'rendered' && currentView === 'raw') {
      // Switch to rendered view if that's the preference
      switchToRenderedView();
    }
    
    // Update session preference
    saveSessionPreference(currentView);
  }

  /**
   * Handles toggle button click events (async version)
   */
  async function handleToggleClick() {
    console.log('Slack Markdown Renderer: Toggle button clicked, current view:', currentView);
    
    // Disable button during processing to prevent multiple clicks
    if (toggleButton) {
      toggleButton.disabled = true;
      toggleButton.style.opacity = '0.6';
      toggleButton.style.cursor = 'not-allowed';
    }
    
    try {
      const success = await toggleView();
      if (!success) {
        console.error('Slack Markdown Renderer: Failed to toggle view');
        // Could show user notification here in the future
      }
    } catch (error) {
      console.error('Slack Markdown Renderer: Error during view toggle:', error);
    } finally {
      // Re-enable button
      if (toggleButton) {
        toggleButton.disabled = false;
        toggleButton.style.opacity = '1';
        toggleButton.style.cursor = 'pointer';
      }
    }
  }

  /**
   * Synchronous version of handleToggleClick for backward compatibility
   */
  function handleToggleClickSync() {
    console.log('Slack Markdown Renderer: Toggle button clicked, current view:', currentView);
    
    const success = toggleViewSync();
    if (!success) {
      console.error('Slack Markdown Renderer: Failed to toggle view');
      // Could show user notification here in the future
    }
  }

  /**
   * Gets the current toggle button state
   * @returns {Object} Current button state information
   */
  function getToggleButtonState() {
    return {
      exists: !!toggleButton,
      isAttached: !!(toggleButton && toggleButton.parentNode),
      currentView: currentView,
      buttonText: toggleButton ? toggleButton.textContent : null
    };
  }

  /**
   * Main async processing pipeline for Markdown content
   * @param {string} content - The content to process
   * @param {string} fileExtension - File extension if available
   * @returns {Promise<Object>} Processing result
   */
  async function processContentAsync(content, fileExtension = null) {
    // Show loading indicator for operations that might take time
    const contentLength = content?.length || 0;
    const shouldShowLoading = contentLength > 10000; // Show for large content
    
    if (shouldShowLoading) {
      showLoadingIndicator('Analyzing content...', 15000);
    }
    
    try {
      // Use enhanced content handling to determine processing strategy
      const contentHandling = await new Promise(resolve => {
        // Yield control before analysis
        setTimeout(() => {
          const result = handleNonMarkdownContent(content, fileExtension);
          resolve(result);
        }, 0);
      });
      
      if (shouldShowLoading) {
        updateLoadingIndicator({ stage: 'analyzing', progress: 0.1 });
      }
      
      console.log('Slack Markdown Renderer: Content handling decision:', {
        action: contentHandling.action,
        reason: contentHandling.reason,
        confidence: contentHandling.confidence,
        fileExtension: fileExtension
      });
      
      if (contentHandling.action === 'process_as_markdown') {
        console.log('Slack Markdown Renderer: Processing content as Markdown');
        
        // Process the Markdown content with progress tracking
        const progressCallback = shouldShowLoading ? updateLoadingIndicator : null;
        const processingResult = await processMarkdownContent(content, progressCallback);
        
        if (processingResult.success || processingResult.fallbackUsed) {
          console.log('Slack Markdown Renderer: Markdown processing completed', {
            success: processingResult.success,
            fallbackUsed: processingResult.fallbackUsed
          });
          
          // Store processed HTML for toggle functionality
          processedMarkdownHTML = processingResult.styledHTML;
          
          // Replace content with rendered HTML
          const replacementResult = await performContentReplacement(
            processingResult.styledHTML, 
            progressCallback
          );
          
          if (replacementResult.success || replacementResult.fallbackUsed) {
            console.log('Slack Markdown Renderer: Content replacement completed', {
              success: replacementResult.success,
              fallbackUsed: replacementResult.fallbackUsed,
              state: replacementResult.state
            });
            
            // Apply enhanced styling with error handling
            await new Promise(resolve => {
              setTimeout(() => {
                safeExecute(() => applyBaseStyles(), 'Base styles application', ERROR_CATEGORIES.DOM);
                safeExecute(() => applyTypographyEnhancements(), 'Typography enhancements', ERROR_CATEGORIES.DOM);
                resolve();
              }, 0);
            });
            
            // Load and apply saved theme preference
            const savedTheme = safeExecute(
              () => loadThemePreference(),
              'Theme preference loading',
              ERROR_CATEGORIES.VALIDATION,
              'white'
            );
            safeExecute(() => setBackgroundTheme(savedTheme), 'Background theme application', ERROR_CATEGORIES.DOM);
            
            // Apply default color scheme
            safeExecute(() => applyColorScheme('default'), 'Color scheme application', ERROR_CATEGORIES.DOM);
            
            // Apply syntax highlighting asynchronously
            const container = currentContentContainer || findContentContainer();
            if (container) {
              await applySyntaxHighlighting(container, progressCallback);
              safeExecute(() => setSyntaxHighlightingTheme('default'), 'Syntax highlighting theme', ERROR_CATEGORIES.DOM);
            }
            
            // Create and add toggle button with error handling
            const button = safeExecute(
              () => createToggleButton(),
              'Toggle button creation',
              ERROR_CATEGORIES.DOM,
              null
            );
            
            if (button) {
              const buttonAdded = safeExecute(
                () => addToggleButtonToPage(),
                'Toggle button addition',
                ERROR_CATEGORIES.DOM,
                false
              );
              
              if (buttonAdded) {
                // Set initial view to rendered mode
                safeExecute(() => updateToggleButton('rendered'), 'Toggle button update', ERROR_CATEGORIES.DOM);
                
                // Initialize with user preferences
                safeExecute(() => initializeWithPreferences(), 'Preferences initialization', ERROR_CATEGORIES.VALIDATION);
                
                console.log('Slack Markdown Renderer: Toggle button successfully added');
                console.log('Final state:', getCurrentState());
              } else {
                console.error('Slack Markdown Renderer: Failed to add toggle button to page');
                logError(new Error('Toggle button addition failed'), 'Toggle button setup', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.MEDIUM);
              }
            } else {
              console.error('Slack Markdown Renderer: Failed to create toggle button');
              logError(new Error('Toggle button creation failed'), 'Toggle button setup', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.MEDIUM);
            }
            
            return { success: true, processed: true };
          } else {
            console.error('Slack Markdown Renderer: Content replacement failed:', replacementResult.error);
            logError(new Error(replacementResult.error), 'Content replacement pipeline', ERROR_CATEGORIES.DOM, ERROR_SEVERITY.HIGH);
            return { success: false, error: replacementResult.error };
          }
        } else {
          console.error('Slack Markdown Renderer: Markdown processing failed:', processingResult.error);
          logError(new Error(processingResult.error), 'Markdown processing pipeline', ERROR_CATEGORIES.PARSING, ERROR_SEVERITY.HIGH);
          return { success: false, error: processingResult.error };
        }
      } else {
        // Content should be preserved as-is
        console.log('Slack Markdown Renderer: Preserving content as non-Markdown:', contentHandling.reason);
        
        // Log the preservation decision
        logError(
          new Error('Content preserved as non-Markdown'),
          'Content preservation decision',
          ERROR_CATEGORIES.VALIDATION,
          ERROR_SEVERITY.LOW,
          {
            reason: contentHandling.reason,
            confidence: contentHandling.confidence,
            contentType: contentHandling.structuredAnalysis?.type || 'unknown',
            fileExtension: fileExtension
          }
        );
        
        // No modification to the page - extension remains inactive for this content
        console.log('Slack Markdown Renderer: Extension inactive for this content type');
        return { success: true, processed: false, reason: contentHandling.reason };
      }
    } finally {
      // Always hide loading indicator
      if (shouldShowLoading) {
        hideLoadingIndicator();
      }
    }
  }

  /**
   * Complete workflow integration function
   * Connects URL detection, content analysis, parsing, rendering, and toggle functionality
   * @returns {Promise<Object>} Complete workflow result
   */
  async function executeCompleteWorkflow() {
    console.log('Slack Markdown Renderer: Starting complete workflow integration');
    
    try {
      // Step 1: URL Detection and Validation
      console.log('Step 1: URL Detection and Validation');
      if (!isSlackRawPage()) {
        console.log('Slack Markdown Renderer: Not a Slack RAW file page, workflow terminated');
        return {
          success: false,
          reason: 'Not a Slack RAW file page',
          step: 'url_detection',
          url: window.location.href
        };
      }
      
      const currentUrl = window.location.href;
      const urlValidation = validateUrl(currentUrl);
      if (!urlValidation) {
        console.warn('Slack Markdown Renderer: URL validation failed');
        return {
          success: false,
          reason: 'URL validation failed',
          step: 'url_validation',
          url: currentUrl
        };
      }
      
      console.log('✓ URL detection and validation successful');
      
      // Step 2: Content Extraction and Analysis
      console.log('Step 2: Content Extraction and Analysis');
      const content = safeExecute(
        () => extractTextContent(),
        'Content extraction',
        ERROR_CATEGORIES.DOM,
        ''
      );
      
      if (!content || content.trim().length === 0) {
        console.warn('Slack Markdown Renderer: No content found to process');
        return {
          success: false,
          reason: 'No content found',
          step: 'content_extraction'
        };
      }
      
      const fileExtension = safeExecute(
        () => extractFileExtension(),
        'File extension extraction',
        ERROR_CATEGORIES.VALIDATION,
        null
      );
      
      console.log('✓ Content extraction successful', {
        contentLength: content.length,
        fileExtension: fileExtension
      });
      
      // Step 3: Content Type Analysis and Processing Decision
      console.log('Step 3: Content Type Analysis and Processing Decision');
      const contentHandling = handleNonMarkdownContent(content, fileExtension);
      
      console.log('Content analysis result:', {
        action: contentHandling.action,
        reason: contentHandling.reason,
        confidence: contentHandling.confidence
      });
      
      if (contentHandling.action !== 'process_as_markdown') {
        console.log('Slack Markdown Renderer: Content determined to be non-Markdown, preserving original');
        return {
          success: true,
          reason: 'Content preserved as non-Markdown',
          step: 'content_analysis',
          action: contentHandling.action,
          analysis: contentHandling
        };
      }
      
      console.log('✓ Content determined to be Markdown, proceeding with processing');
      
      // Step 4: Markdown Parsing and HTML Generation
      console.log('Step 4: Markdown Parsing and HTML Generation');
      const processingResult = await processMarkdownContent(content, (progress) => {
        console.log(`Processing progress: ${progress.stage} - ${(progress.progress * 100).toFixed(1)}%`);
      });
      
      if (!processingResult.success && !processingResult.fallbackUsed) {
        console.error('Slack Markdown Renderer: Markdown processing failed completely');
        return {
          success: false,
          reason: 'Markdown processing failed',
          step: 'markdown_processing',
          error: processingResult.error
        };
      }
      
      console.log('✓ Markdown processing completed', {
        success: processingResult.success,
        fallbackUsed: processingResult.fallbackUsed
      });
      
      // Store processed HTML for toggle functionality
      processedMarkdownHTML = processingResult.styledHTML;
      
      // Step 5: DOM Content Replacement
      console.log('Step 5: DOM Content Replacement');
      const replacementResult = await performContentReplacement(processingResult.styledHTML);
      
      if (!replacementResult.success && !replacementResult.fallbackUsed) {
        console.error('Slack Markdown Renderer: Content replacement failed');
        return {
          success: false,
          reason: 'Content replacement failed',
          step: 'content_replacement',
          error: replacementResult.error
        };
      }
      
      console.log('✓ Content replacement completed', {
        success: replacementResult.success,
        fallbackUsed: replacementResult.fallbackUsed
      });
      
      // Step 6: Style Application and Enhancement
      console.log('Step 6: Style Application and Enhancement');
      
      // Apply base styles
      const baseStylesApplied = safeExecute(
        () => applyBaseStyles(),
        'Base styles application',
        ERROR_CATEGORIES.DOM,
        false
      );
      
      // Apply typography enhancements
      const typographyApplied = safeExecute(
        () => applyTypographyEnhancements(),
        'Typography enhancements',
        ERROR_CATEGORIES.DOM,
        false
      );
      
      // Load and apply saved theme preference
      const savedTheme = safeExecute(
        () => loadThemePreference(),
        'Theme preference loading',
        ERROR_CATEGORIES.VALIDATION,
        'white'
      );
      
      const themeApplied = safeExecute(
        () => setBackgroundTheme(savedTheme),
        'Background theme application',
        ERROR_CATEGORIES.DOM,
        false
      );
      
      // Apply color scheme
      const colorSchemeApplied = safeExecute(
        () => applyColorScheme('default'),
        'Color scheme application',
        ERROR_CATEGORIES.DOM,
        false
      );
      
      console.log('✓ Style application completed', {
        baseStyles: baseStylesApplied,
        typography: typographyApplied,
        theme: themeApplied,
        colorScheme: colorSchemeApplied,
        appliedTheme: savedTheme
      });
      
      // Step 7: Syntax Highlighting
      console.log('Step 7: Syntax Highlighting');
      const container = currentContentContainer || findContentContainer();
      let syntaxHighlightingApplied = false;
      
      if (container) {
        syntaxHighlightingApplied = await applySyntaxHighlighting(container, (progress) => {
          console.log(`Syntax highlighting progress: ${progress.stage} - ${(progress.progress * 100).toFixed(1)}%`);
        });
        
        // Set syntax highlighting theme
        safeExecute(
          () => setSyntaxHighlightingTheme('default'),
          'Syntax highlighting theme application',
          ERROR_CATEGORIES.DOM
        );
      }
      
      console.log('✓ Syntax highlighting completed', {
        applied: syntaxHighlightingApplied,
        containerFound: !!container
      });
      
      // Step 8: Toggle Button Creation and Integration
      console.log('Step 8: Toggle Button Creation and Integration');
      
      const toggleButton = safeExecute(
        () => createToggleButton(),
        'Toggle button creation',
        ERROR_CATEGORIES.DOM,
        null
      );
      
      let toggleButtonAdded = false;
      if (toggleButton) {
        toggleButtonAdded = safeExecute(
          () => addToggleButtonToPage(),
          'Toggle button addition',
          ERROR_CATEGORIES.DOM,
          false
        );
        
        if (toggleButtonAdded) {
          // Set initial view to rendered mode
          safeExecute(
            () => updateToggleButton('rendered'),
            'Toggle button state update',
            ERROR_CATEGORIES.DOM
          );
        }
      }
      
      console.log('✓ Toggle button integration completed', {
        created: !!toggleButton,
        added: toggleButtonAdded
      });
      
      // Step 9: Session Preference Management
      console.log('Step 9: Session Preference Management');
      
      // Initialize with user preferences
      safeExecute(
        () => initializeWithPreferences(),
        'Preferences initialization',
        ERROR_CATEGORIES.VALIDATION
      );
      
      // Save current state as rendered
      safeExecute(
        () => saveSessionPreference('rendered'),
        'Session preference saving',
        ERROR_CATEGORIES.VALIDATION
      );
      
      console.log('✓ Session preference management completed');
      
      // Step 10: Error Handling Integration Test
      console.log('Step 10: Error Handling Integration Test');
      
      // Test error logging system
      const errorLogTest = safeExecute(
        () => {
          const testErrors = getErrorLog();
          return Array.isArray(testErrors);
        },
        'Error logging system test',
        ERROR_CATEGORIES.VALIDATION,
        false
      );
      
      console.log('✓ Error handling integration test completed', {
        errorLogWorking: errorLogTest
      });
      
      // Final State Verification
      const finalState = getCurrentState();
      
      console.log('🎉 Complete workflow integration successful!');
      console.log('Final state:', finalState);
      
      return {
        success: true,
        reason: 'Complete workflow executed successfully',
        step: 'complete',
        state: finalState,
        results: {
          urlDetection: true,
          contentExtraction: true,
          contentAnalysis: contentHandling,
          markdownProcessing: processingResult,
          contentReplacement: replacementResult,
          styleApplication: {
            baseStyles: baseStylesApplied,
            typography: typographyApplied,
            theme: themeApplied,
            colorScheme: colorSchemeApplied
          },
          syntaxHighlighting: syntaxHighlightingApplied,
          toggleButton: {
            created: !!toggleButton,
            added: toggleButtonAdded
          },
          errorHandling: errorLogTest
        }
      };
      
    } catch (error) {
      // Comprehensive error handling for the entire workflow
      logError(error, 'Complete workflow execution', ERROR_CATEGORIES.UNKNOWN, ERROR_SEVERITY.CRITICAL, {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      console.error('Slack Markdown Renderer: Critical workflow error:', error);
      
      return {
        success: false,
        reason: 'Critical workflow error',
        step: 'error_handling',
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Initialize extension with complete workflow integration
   * This is the main entry point that connects all components
   */
  async function initializeExtension() {
    console.log('Slack Markdown Renderer: Initializing extension with complete workflow integration');
    console.log('Extension version: 1.0.0');
    console.log('Page URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
      // Execute the complete integrated workflow
      const workflowResult = await executeCompleteWorkflow();
      
      if (workflowResult.success) {
        console.log('✅ Extension initialization completed successfully');
        console.log('Workflow result:', workflowResult);
        
        // Log successful initialization for debugging
        logError(
          new Error('Extension initialized successfully'),
          'Successful initialization',
          ERROR_CATEGORIES.VALIDATION,
          ERROR_SEVERITY.LOW,
          {
            workflowResult: workflowResult,
            finalState: workflowResult.state
          }
        );
        
      } else {
        console.log('⚠️ Extension initialization completed with limitations');
        console.log('Workflow result:', workflowResult);
        
        // Log initialization limitations
        logError(
          new Error(`Extension initialization limited: ${workflowResult.reason}`),
          'Limited initialization',
          ERROR_CATEGORIES.VALIDATION,
          ERROR_SEVERITY.MEDIUM,
          {
            workflowResult: workflowResult,
            step: workflowResult.step,
            reason: workflowResult.reason
          }
        );
      }
      
    } catch (error) {
      // Final catch-all error handler
      logError(error, 'Extension initialization', ERROR_CATEGORIES.UNKNOWN, ERROR_SEVERITY.CRITICAL, {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      console.error('❌ Slack Markdown Renderer: Critical initialization error:', error);
      
      // Try to show user-friendly error notification
      try {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'slack-markdown-renderer-error-notification';
        errorNotification.innerHTML = `
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 12px; margin: 10px 0; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px;">
            <strong>⚠️ Slack Markdown Renderer Error</strong><br>
            The extension encountered an error during initialization. Please refresh the page to try again.
          </div>
        `;
        
        if (document.body) {
          document.body.insertBefore(errorNotification, document.body.firstChild);
          
          // Auto-remove after 10 seconds
          setTimeout(() => {
            if (errorNotification.parentNode) {
              errorNotification.parentNode.removeChild(errorNotification);
            }
          }, 10000);
        }
      } catch (notificationError) {
        console.error('Could not show error notification:', notificationError);
      }
    }
  }

  // Initialize the extension when the script loads
  initializeExtension();
  
})();