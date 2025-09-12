// Core element collection and interaction functionality for MCP integration
// Handles finding, collecting, and clicking elements in the DOM

import { 
  createMCPError, 
  logMCPEvent, 
  validateElementName, 
  validatePagePath, 
  withErrorHandling, 
  mcpRateLimiter,
  type MCPError 
} from './mcpErrorHandling';

export interface ElementInfo {
  name: string;
  description: string;
  selector: string;
  type: string;
  isVisible: boolean;
  elementType: 'clickable' | 'input';
}

// Backward compatibility alias
export type ClickableElement = ElementInfo;

export interface PageInfo {
  url: string;
  title: string;
  path: string;
}

export type MCPResult<T> = {
  success: boolean;
  data?: T;
  error?: MCPError;
};

// Global state for element observer
let elementObserver: MutationObserver | null = null;

/**
 * Collects elements on the current page based on type
 * @param elementType - 'clickable' for data-clickable-element, 'input' for data-input-element, or 'all' for both
 */
export async function getElements(elementType: 'clickable' | 'input' | 'all' = 'clickable'): Promise<MCPResult<ElementInfo[]>> {
  if (!mcpRateLimiter.canProceed('getElements')) {
    return {
      success: false,
      error: createMCPError('TIMEOUT_ERROR', 'Rate limit exceeded for getElements').toJSON()
    };
  }

  const collectElements = async (): Promise<ElementInfo[]> => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return [];
    }

    let selectors: string[] = [];
    let types: Array<'clickable' | 'input'> = [];
    
    if (elementType === 'clickable') {
      selectors = ['[data-clickable-element]'];
      types = ['clickable'];
    } else if (elementType === 'input') {
      selectors = ['[data-input-element]'];
      types = ['input'];
    } else if (elementType === 'all') {
      selectors = ['[data-clickable-element]', '[data-input-element]'];
      types = ['clickable', 'input'];
    }

    const result: ElementInfo[] = [];
    
    selectors.forEach((selector, selectorIndex) => {
      const elements = document.querySelectorAll(selector);
      const currentType = types[selectorIndex];
      const attributeName = currentType === 'clickable' ? 'data-clickable-element' : 'data-input-element';
      
      elements.forEach((element, index) => {
        const name = element.getAttribute(attributeName);
        const description = element.getAttribute('data-element-description');
        
        if (name) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           rect.top >= 0 && rect.left >= 0 &&
                           window.getComputedStyle(element).visibility !== 'hidden';

          const elementInfo: ElementInfo = {
            name,
            description: description || name,
            selector: `[${attributeName}="${name}"]`,
            type: element.tagName.toLowerCase(),
            isVisible,
            elementType: currentType
          };
          result.push(elementInfo);
        } else {
          console.log(`❌ MCP Debug: ${currentType} element ${index + 1} has no name attribute`);
        }
      });
    });

    logMCPEvent('info', `Collected ${result.length} ${elementType} elements`);
    return result;
  };

  return withErrorHandling(collectElements, 'UNKNOWN_ERROR')();
}

/**
 * Backward compatibility function - collects clickable elements only
 */
export async function getClickableElements(): Promise<MCPResult<ElementInfo[]>> {
  return getElements('clickable');
}

/**
 * Fills an input element with the provided data
 * @param inputName - The data-input-element attribute value
 * @param inputType - The type of input (text, email, password, radio, checkbox, select, textarea, etc.)
 * @param data - The data to fill into the input
 */
export async function fillInput(inputName: string, inputType: string, data: string | boolean): Promise<MCPResult<{ success: boolean; message: string }>> {
  if (!mcpRateLimiter.canProceed('fillInput')) {
    return {
      success: false,
      error: createMCPError('TIMEOUT_ERROR', 'Rate limit exceeded for fillInput').toJSON()
    };
  }

  const validation = validateElementName(inputName);
  if (!validation.valid) {
    return {
      success: false,
      error: createMCPError('ELEMENT_NOT_FOUND', validation.error!).toJSON()
    };
  }

  const performFill = async (): Promise<{ success: boolean; message: string }> => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw createMCPError('UNKNOWN_ERROR', 'Browser environment not available');
    }

    // Find the input element
    const element = document.querySelector(`[data-input-element="${inputName}"]`) as HTMLElement;
    
    if (!element) {
      throw createMCPError('ELEMENT_NOT_FOUND', `Input element with name "${inputName}" not found`);
    }

    // Check if element is visible and enabled
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    const isEnabled = !element.hasAttribute('disabled') && 
                     !element.hasAttribute('readonly') &&
                     window.getComputedStyle(element).pointerEvents !== 'none';

    if (!isVisible) {
      console.warn(`⚠️ MCP: Input element "${inputName}" is not visible, but will attempt to fill`);
    }

    if (!isEnabled) {
      throw createMCPError('ELEMENT_NOT_CLICKABLE', `Input element "${inputName}" is disabled or readonly`);
    }

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Wait a brief moment for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    let message = '';
    const tagName = element.tagName.toLowerCase();
    const elementType = element.getAttribute('type')?.toLowerCase() || 'text';

    try {
      // Handle different input types
      switch (tagName) {
        case 'input':
          message = await handleInputElement(element as HTMLInputElement, elementType, data);
          break;
        
        case 'textarea':
          message = await handleTextareaElement(element as HTMLTextAreaElement, data);
          break;
        
        case 'select':
          message = await handleSelectElement(element as HTMLSelectElement, data);
          break;
        
        default:
          throw createMCPError('UNKNOWN_ERROR', `Unsupported element type: ${tagName}`);
      }

      logMCPEvent('info', `Successfully filled input "${inputName}"`, { inputType, data, message });
      
      return { success: true, message };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during input fill';
      console.error(`❌ MCP: Failed to fill input "${inputName}":`, errorMessage);
      throw createMCPError('UNKNOWN_ERROR', errorMessage, error);
    }
  };

  return withErrorHandling(performFill, 'UNKNOWN_ERROR')();
}

/**
 * Handle filling input elements (text, email, password, radio, checkbox, etc.)
 */
async function handleInputElement(element: HTMLInputElement, inputType: string, data: string | boolean): Promise<string> {
  switch (inputType) {
    case 'text':
    case 'email':
    case 'password':
    case 'url':
    case 'tel':
    case 'search':
    case 'number':
    case 'date':
    case 'time':
    case 'datetime-local':
    case 'month':
    case 'week':
    case 'color':
      // Text-based inputs
      const textValue = String(data);
      element.focus();
      element.value = textValue;
      
      // Trigger events to ensure React/frameworks detect the change
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.blur();
      
      return `Filled text input with value: "${textValue}"`;
    
    case 'radio':
      // Radio button
      if (data === true || data === 'true' || String(data).toLowerCase() === element.value.toLowerCase()) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return `Selected radio button with value: "${element.value}"`;
      } else {
        return `Radio button not selected (data: "${data}" doesn't match value: "${element.value}")`;
      }
    
    case 'checkbox':
      // Checkbox
      const checked = data === true || data === 'true' || String(data).toLowerCase() === 'checked';
      element.checked = checked;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return `Set checkbox to: ${checked ? 'checked' : 'unchecked'}`;
    
    case 'range':
      // Range slider
      const rangeValue = String(data);
      element.value = rangeValue;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return `Set range slider to: ${rangeValue}`;
    
    case 'file':
      // File input - can't be programmatically set for security reasons
      return 'File inputs cannot be programmatically filled for security reasons';
    
    default:
      // Default to text handling for unknown input types
      const defaultValue = String(data);
      element.focus();
      element.value = defaultValue;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.blur();
      return `Filled input (type: ${inputType}) with value: "${defaultValue}"`;
  }
}

/**
 * Handle filling textarea elements
 */
async function handleTextareaElement(element: HTMLTextAreaElement, data: string | boolean): Promise<string> {
  const textValue = String(data);
  element.focus();
  element.value = textValue;
  
  // Trigger events to ensure React/frameworks detect the change
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
  
  return `Filled textarea with value: "${textValue}"`;
}

/**
 * Handle filling select elements (dropdowns)
 */
async function handleSelectElement(element: HTMLSelectElement, data: string | boolean): Promise<string> {
  const selectValue = String(data);
  
  // Try to find matching option by value first
  let optionFound = false;
  for (let i = 0; i < element.options.length; i++) {
    const option = element.options[i];
    if (option.value === selectValue) {
      element.selectedIndex = i;
      optionFound = true;
      break;
    }
  }
  
  // If not found by value, try to find by text content
  if (!optionFound) {
    for (let i = 0; i < element.options.length; i++) {
      const option = element.options[i];
      if (option.text.toLowerCase() === selectValue.toLowerCase()) {
        element.selectedIndex = i;
        optionFound = true;
        break;
      }
    }
  }
  
  if (optionFound) {
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return `Selected option: "${element.options[element.selectedIndex].text}" (value: "${element.value}")`;
  } else {
    throw new Error(`No option found matching "${selectValue}" in select element`);
  }
}

/**
 * Clicks an element by its data-clickable-element attribute value
 */
export async function clickElement(elementName: string): Promise<MCPResult<{ currentPage: PageInfo }>> {
  if (!mcpRateLimiter.canProceed('clickElement')) {
    return {
      success: false,
      error: createMCPError('TIMEOUT_ERROR', 'Rate limit exceeded for clickElement').toJSON()
    };
  }

  const validation = validateElementName(elementName);
  if (!validation.valid) {
    return {
      success: false,
      error: createMCPError('ELEMENT_NOT_FOUND', validation.error!).toJSON()
    };
  }

  const performClick = async (): Promise<{ currentPage: PageInfo }> => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw createMCPError('UNKNOWN_ERROR', 'Browser environment not available');
    }

    const element = document.querySelector(`[data-clickable-element="${elementName}"]`) as HTMLElement;
    
    if (!element) {
      throw createMCPError('ELEMENT_NOT_FOUND', `Element with name "${elementName}" not found`);
    }

    // Check if element is visible and enabled
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    const isEnabled = !element.hasAttribute('disabled') && 
                     window.getComputedStyle(element).pointerEvents !== 'none';

    if (!isVisible || !isEnabled) {
      throw createMCPError('ELEMENT_NOT_CLICKABLE', `Element "${elementName}" is not clickable (hidden or disabled)`);
    }

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Wait a brief moment for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture initial page info
    const initialPage = getCurrentPage();
    
    // Check if this is a navigation element (link, button with navigation, etc.)
    const isNavigationElement = element.tagName.toLowerCase() === 'a' || 
                               element.getAttribute('href') !== null ||
                               element.getAttribute('data-navigation') !== null ||
                               element.closest('a') !== null;

    // Trigger click event
    element.click();
    
    // If this is a navigation element, wait for navigation to complete
    if (isNavigationElement) {
      await waitForNavigation(initialPage);
    } else {
      // For non-navigation elements, just wait a brief moment
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    logMCPEvent('info', `Successfully clicked element "${elementName}"`);
    return { currentPage: getCurrentPage() };
  };

  return withErrorHandling(performClick, 'ELEMENT_NOT_CLICKABLE')();
}

/**
 * Wait for navigation to complete by monitoring URL/title changes and DOM changes
 */
async function waitForNavigation(initialPage: PageInfo, maxWaitTime: number = 3000): Promise<void> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    let resolved = false;
    
    const resolveOnce = (reason: string) => {
      if (!resolved) {
        resolved = true;
        console.log(`🧭 MCP: Navigation completed (${reason})`);
        resolve();
      }
    };
    
    // Method 1: Check for URL/path changes
    const checkNavigation = () => {
      if (resolved) return;
      
      const currentPage = getCurrentPage();
      const hasNavigated = currentPage.path !== initialPage.path || 
                          currentPage.url !== initialPage.url;
      
      const timeElapsed = Date.now() - startTime;
      
      if (hasNavigated) {
        console.log(`🧭 MCP: Navigation detected after ${timeElapsed}ms`);
        console.log(`🧭 MCP: From: ${initialPage.path} -> To: ${currentPage.path}`);
        resolveOnce('URL change detected');
      } else if (timeElapsed >= maxWaitTime) {
        console.log(`⏰ MCP: Navigation timeout after ${maxWaitTime}ms, proceeding anyway`);
        resolveOnce('timeout');
      } else {
        // Check again in 50ms
        setTimeout(checkNavigation, 50);
      }
    };
    
    // Method 2: Listen for popstate events (browser navigation)
    const handlePopState = () => {
      resolveOnce('popstate event');
    };
    
    // Method 3: Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const restoreHistoryMethods = () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => resolveOnce('pushState detected'), 10);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => resolveOnce('replaceState detected'), 10);
    };
    
    // Method 4: DOM change detection for content updates
    let domChangeTimeout: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      if (resolved) return;
      
      // Debounce DOM changes to avoid false positives
      clearTimeout(domChangeTimeout);
      domChangeTimeout = setTimeout(() => {
        const currentPage = getCurrentPage();
        if (currentPage.path !== initialPage.path) {
          resolveOnce('DOM change with path change');
        }
      }, 100);
    });
    
    // Observe changes to the main content area
    const mainContent = document.querySelector('main') || document.body;
    observer.observe(mainContent, {
      childList: true,
      subtree: true,
      attributes: false
    });
    
    // Set up event listeners
    window.addEventListener('popstate', handlePopState);
    
    // Cleanup function
    const cleanup = () => {
      restoreHistoryMethods();
      observer.disconnect();
      clearTimeout(domChangeTimeout);
    };
    
    // Start the navigation check
    setTimeout(checkNavigation, 100);
    
    // Ensure cleanup happens when resolved
    const originalResolve = resolve;
    resolve = (...args) => {
      cleanup();
      originalResolve(...args);
    };
  });
}

/**
 * Returns current page information
 */
export function getCurrentPage(): PageInfo {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      url: '',
      title: '',
      path: '/'
    };
  }

  return {
    url: window.location.href,
    title: document.title,
    path: window.location.pathname
  };
}

/**
 * Navigates to a specific page
 */
export async function navigatePage(page: string): Promise<MCPResult<PageInfo>> {
  if (!mcpRateLimiter.canProceed('navigatePage')) {
    return {
      success: false,
      error: createMCPError('TIMEOUT_ERROR', 'Rate limit exceeded for navigatePage').toJSON()
    };
  }

  // Normalize page path - add leading slash if not present
  const normalizedPage = page.startsWith('/') ? page : `/${page}`;

  const validation = validatePagePath(normalizedPage);
  if (!validation.valid) {
    return {
      success: false,
      error: createMCPError('INVALID_PAGE_PATH', validation.error!).toJSON()
    };
  }

  const performNavigation = async (): Promise<PageInfo> => {
    // Use Next.js router if available, otherwise fallback to window.location
    if (typeof window !== 'undefined') {
      if ((window as unknown as { next?: { router: { push: (page: string) => Promise<void> } } }).next?.router) {
        await (window as unknown as { next: { router: { push: (page: string) => Promise<void> } } }).next.router.push(normalizedPage);
      } else {
        // Fallback for client-side navigation
        window.history.pushState({}, '', normalizedPage);
        // Trigger a popstate event to notify React Router
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      
      // Wait a moment for navigation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const pageInfo = getCurrentPage();
    logMCPEvent('info', `Successfully navigated to page "${normalizedPage}"`, pageInfo);
    return pageInfo;
  };

  return withErrorHandling(performNavigation, 'NAVIGATION_FAILED')();
}

/**
 * Sets up MutationObserver to monitor DOM changes
 */
export function setupElementObserver(): MutationObserver | null {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    logMCPEvent('warn', 'MutationObserver not available in current environment');
    return null;
  }

  if (elementObserver) {
    elementObserver.disconnect();
  }

  elementObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      // Check if any nodes were added or removed
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);
        
        // Check if any added nodes have clickable/input elements or contain them
        const hasRelevantElements = [...addedNodes, ...removedNodes].some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return element.hasAttribute('data-clickable-element') ||
                   element.hasAttribute('data-input-element') ||
                   element.querySelector('[data-clickable-element]') ||
                   element.querySelector('[data-input-element]');
          }
          return false;
        });
        
        if (hasRelevantElements) {
          shouldUpdate = true;
        }
      }
      
      // Check for attribute changes on clickable/input elements
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'data-clickable-element' || 
           mutation.attributeName === 'data-input-element' ||
           mutation.attributeName === 'data-element-description')) {
        shouldUpdate = true;
      }
    });
    
    if (shouldUpdate) {
      logMCPEvent('debug', 'DOM changed, updating elements');
      // Debounce updates to avoid excessive calls
      setTimeout(() => {
        getElements('all');
      }, 100);
    }
  });

  if (typeof document !== 'undefined') {
    elementObserver.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-clickable-element', 'data-input-element', 'data-element-description']
    });

    logMCPEvent('info', 'Element observer started');
  }

  return elementObserver;
}

/**
 * Initialize the element collector system
 */
export async function initElementCollector(): Promise<MCPResult<{ count: number; observer: boolean }>> {
  const initProcess = async () => {
    // Initial collection
    const elementsResult = await getClickableElements();
    if (!elementsResult.success) {
      throw createMCPError('UNKNOWN_ERROR', 'Failed to collect initial elements', elementsResult.error);
    }

    // Setup observer for future changes
    const observer = setupElementObserver();
    
    logMCPEvent('info', 'Element collector initialized', {
      elementCount: elementsResult.data?.length || 0,
      observerActive: !!observer
    });

    return {
      count: elementsResult.data?.length || 0,
      observer: !!observer
    };
  };

  return withErrorHandling(initProcess, 'UNKNOWN_ERROR')();
}

/**
 * Cleanup function to disconnect observer
 */
export function cleanupElementCollector(): void {
  if (elementObserver) {
    elementObserver.disconnect();
    elementObserver = null;
    logMCPEvent('info', 'Element observer disconnected');
  }
}
