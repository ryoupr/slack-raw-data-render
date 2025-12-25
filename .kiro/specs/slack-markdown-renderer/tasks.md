# Implementation Plan: Slack Markdown Renderer

## Overview

Chrome拡張機能として、SlackのRAWファイルページでMarkdownコンテンツを自動レンダリングする機能を段階的に実装します。Manifest V3、Content Scripts、Marked.jsライブラリを使用し、プロパティベーステストによる品質保証を行います。

## Tasks

- [x] 1. Set up Chrome extension project structure and manifest
  - Create project directory structure
  - Create manifest.json with Manifest V3 format
  - Configure content scripts for Slack RAW file URLs
  - Set up basic permissions and metadata
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 1.1 Write unit test for manifest validation
  - Test manifest.json structure compliance with V3 specifications
  - Test permission configuration
  - _Requirements: 6.1, 6.2_

- [x] 2. Implement URL detection and content analysis
  - [x] 2.1 Create URL pattern matching functionality
    - Implement function to detect Slack RAW file URLs
    - Add URL validation logic
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Write property test for URL pattern detection
    - **Property 1: URL Pattern Detection**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.3 Implement content analysis system
    - Create content type detection logic
    - Add Markdown pattern recognition
    - Implement file extension checking
    - _Requirements: 1.3, 1.4, 4.1, 4.2, 4.3_

  - [x] 2.4 Write property test for content analysis
    - **Property 2: Content Analysis Consistency**
    - **Validates: Requirements 1.3**

  - [-] 2.5 Write property test for Markdown detection
    - **Property 3: Markdown Detection Accuracy**
    - **Validates: Requirements 1.4, 4.3**

  - [x] 2.6 Write property test for file extension recognition
    - **Property 6: File Extension Recognition**
    - **Validates: Requirements 4.1, 4.2**

- [x] 3. Integrate Markdown parser and rendering system
  - [x] 3.1 Add Marked.js library to project
    - Download and include Marked.js library
    - Configure library options for security and features
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Implement Markdown parsing functionality
    - Create wrapper functions for Marked.js
    - Add error handling for parsing failures
    - Implement HTML generation with styling
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.3 Write property test for Markdown parsing
    - **Property 4: Markdown Parsing Round Trip**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 3.4 Implement DOM replacement system
    - Create functions to replace original content with rendered HTML
    - Add content backup for toggle functionality
    - _Requirements: 2.3_

  - [ ] 3.5 Write property test for DOM replacement
    - **Property 5: DOM Replacement Integrity**
    - **Validates: Requirements 2.3, 3.3, 3.4**

- [x] 4. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement toggle functionality and UI controls
  - [x] 5.1 Create toggle button UI component
    - Design and implement toggle button
    - Add button styling and positioning
    - _Requirements: 3.1_

  - [x] 5.2 Implement view switching logic
    - Create functions to switch between RAW and rendered views
    - Add state management for current view
    - Implement session preference persistence
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Write property test for toggle functionality
    - **Property 8: Toggle State Consistency**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ] 5.4 Write property test for session persistence
    - **Property 9: Session Preference Persistence**
    - **Validates: Requirements 3.5**

- [x] 6. Implement styling and visual enhancements
  - [x] 6.1 Create CSS styles for rendered content
    - Design typography and spacing rules
    - Implement color scheme and contrast settings
    - Add background color configuration (white/configurable)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Add code syntax highlighting support
    - Integrate syntax highlighting for code blocks
    - Configure highlighting themes
    - _Requirements: 5.4_

  - [ ] 6.3 Write unit tests for styling application
    - Test CSS class application
    - Test background color setting
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Implement error handling and edge cases
  - [x] 7.1 Add comprehensive error handling
    - Implement error handlers for parsing, DOM, and network errors
    - Add fallback mechanisms for failed operations
    - Create error logging system
    - _Requirements: 6.4, 6.5_

  - [x] 7.2 Implement non-Markdown content handling
    - Add logic to preserve non-Markdown content unchanged
    - Handle mixed content appropriately
    - _Requirements: 4.4, 4.5_

  - [ ] 7.3 Write property test for error isolation
    - **Property 10: Error Isolation**
    - **Validates: Requirements 6.4, 6.5**

  - [ ] 7.4 Write property test for non-Markdown preservation
    - **Property 7: Non-Markdown Content Preservation**
    - **Validates: Requirements 4.4**

- [x] 8. Implement performance optimizations
  - [x] 8.1 Add non-blocking processing
    - Implement asynchronous processing for large content
    - Add loading indicators for long operations
    - _Requirements: 7.3, 7.5_

  - [x] 8.2 Write property test for non-blocking processing
    - **Property 11: Non-Blocking Processing**
    - **Validates: Requirements 7.3**

  - [x] 8.3 Write property test for loading state management
    - **Property 12: Loading State Management**
    - **Validates: Requirements 7.5**

- [x] 9. Final integration and testing
  - [x] 9.1 Wire all components together
    - Connect URL detection, content analysis, parsing, and rendering
    - Integrate toggle functionality and error handling
    - Test complete workflow from URL detection to rendering
    - _Requirements: All requirements_

  - [x] 9.2 Write integration tests
    - Test end-to-end functionality
    - Test various Markdown file types and content
    - _Requirements: All requirements_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Complete remaining property-based tests
  - [ ] 11.1 Fix and complete property test for URL pattern detection
    - **Property 1: URL Pattern Detection**
    - **Validates: Requirements 1.1, 1.2**
    - Fix test implementation to properly validate URL pattern matching

  - [ ] 11.2 Fix and complete property test for content analysis
    - **Property 2: Content Analysis Consistency**
    - **Validates: Requirements 1.3**
    - Ensure consistent results across multiple analysis calls

  - [ ] 11.3 Fix and complete property test for Markdown detection
    - **Property 3: Markdown Detection Accuracy**
    - **Validates: Requirements 1.4, 4.3**
    - Test detection accuracy across various Markdown patterns

  - [ ] 11.4 Fix and complete property test for DOM replacement
    - **Property 5: DOM Replacement Integrity**
    - **Validates: Requirements 2.3, 3.3, 3.4**
    - Test content backup and restoration functionality

  - [ ] 11.5 Fix and complete property test for toggle functionality
    - **Property 8: Toggle State Consistency**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - Test view switching state management

  - [ ] 11.6 Fix and complete property test for session persistence
    - **Property 9: Session Preference Persistence**
    - **Validates: Requirements 3.5**
    - Test session storage and preference loading

  - [ ] 11.7 Fix and complete property test for error isolation
    - **Property 10: Error Isolation**
    - **Validates: Requirements 6.4, 6.5**
    - Test error handling without breaking page functionality

  - [ ] 11.8 Fix and complete property test for non-Markdown preservation
    - **Property 7: Non-Markdown Content Preservation**
    - **Validates: Requirements 4.4**
    - Test preservation of non-Markdown content types

- [ ] 12. Fix test implementation issues
  - [ ] 12.1 Fix property-based test setup and execution
    - Resolve function availability issues in test environment
    - Fix test environment DOM setup
    - Ensure all required functions are properly exposed for testing
    - _Requirements: All requirements_

  - [ ] 12.2 Add missing unit tests for styling
    - Test CSS class application functionality
    - Test background color setting and theme switching
    - Test typography enhancement application
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 12.3 Improve test coverage and reliability
    - Ensure all core functions have adequate test coverage
    - Fix any failing tests and improve test stability
    - Add edge case testing for error conditions
    - _Requirements: All requirements_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The extension uses Manifest V3 and Content Scripts for modern Chrome compatibility
- Most core functionality is implemented, remaining tasks focus on completing test coverage