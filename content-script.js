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
   * Switches to the rendered Markdown view
   * @returns {boolean} True if switch was successful
   */
  function switchToRenderedView() {
    if (!processedMarkdownHTML) {
      console.error('Slack Markdown Renderer: No processed HTML available for rendered view');
      return false;
    }
    
    try {
      const success = replaceContentWithHTML(processedMarkdownHTML);
      if (success) {
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
   * Toggles between RAW and rendered views
   * @returns {boolean} True if toggle was successful
   */
  function toggleView() {
    if (currentView === 'raw') {
      return switchToRenderedView();
    } else {
      return switchToRawView();
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
      // Use sessionStorage to persist preference for the current session
      sessionStorage.setItem('slack-markdown-renderer-view-preference', viewMode);
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
      const savedPreference = sessionStorage.getItem('slack-markdown-renderer-view-preference');
      if (savedPreference === 'raw' || savedPreference === 'rendered') {
        sessionPreferences.defaultView = savedPreference;
        console.log(`Slack Markdown Renderer: Session preference loaded: ${savedPreference}`);
        return savedPreference;
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
      sessionStorage.removeItem('slack-markdown-renderer-view-preference');
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
   * Handles toggle button click events
   */
  function handleToggleClick() {
    console.log('Slack Markdown Renderer: Toggle button clicked, current view:', currentView);
    
    const success = toggleView();
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
        
        // Store processed HTML for toggle functionality
        processedMarkdownHTML = processingResult.styledHTML;
        
        // Replace content with rendered HTML
        const replacementResult = performContentReplacement(processingResult.styledHTML);
        
        if (replacementResult.success) {
          console.log('Slack Markdown Renderer: Content replacement successful');
          console.log('Current state:', replacementResult.state);
          
          // Create and add toggle button
          const button = createToggleButton();
          const buttonAdded = addToggleButtonToPage();
          
          if (buttonAdded) {
            // Set initial view to rendered mode
            updateToggleButton('rendered');
            
            // Initialize with user preferences
            initializeWithPreferences();
            
            console.log('Slack Markdown Renderer: Toggle button successfully added');
            console.log('Final state:', getCurrentState());
          } else {
            console.error('Slack Markdown Renderer: Failed to add toggle button to page');
          }
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