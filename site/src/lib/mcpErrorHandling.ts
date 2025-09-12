// Error handling utilities for MCP integration
// Provides consistent error handling and logging across the MCP system

export interface MCPError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export class MCPException extends Error {
  public code: string;
  public details?: unknown;
  public timestamp: string;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'MCPException';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): MCPError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export const MCPErrorCodes = {
  CONNECTION_FAILED: 'MCP_CONNECTION_FAILED',
  ELEMENT_NOT_FOUND: 'MCP_ELEMENT_NOT_FOUND',
  ELEMENT_NOT_CLICKABLE: 'MCP_ELEMENT_NOT_CLICKABLE',
  NAVIGATION_FAILED: 'MCP_NAVIGATION_FAILED',
  INVALID_PAGE_PATH: 'MCP_INVALID_PAGE_PATH',
  SOCKET_ERROR: 'MCP_SOCKET_ERROR',
  TIMEOUT_ERROR: 'MCP_TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'MCP_UNKNOWN_ERROR'
} as const;

/**
 * Creates a standardized MCP error
 */
export function createMCPError(
  code: keyof typeof MCPErrorCodes,
  message: string,
  details?: unknown
): MCPException {
  return new MCPException(MCPErrorCodes[code], message, details);
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorCode: keyof typeof MCPErrorCodes = 'UNKNOWN_ERROR'
) {
  return async (...args: T): Promise<{ success: boolean; data?: R; error?: MCPError }> => {
    try {
      const result = await fn(...args);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const mcpError = error instanceof MCPException 
        ? error 
        : createMCPError(errorCode, error instanceof Error ? error.message : 'Unknown error', error);
      
      console.error('❌ MCP Error:', mcpError.toJSON());
      
      return {
        success: false,
        error: mcpError.toJSON()
      };
    }
  };
}

/**
 * Logs MCP events for debugging
 */
export function logMCPEvent(
  type: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: unknown
): void {
  const timestamp = new Date().toISOString();
  const logData = data ? { ...data, timestamp } : { timestamp };
  
  switch (type) {
    case 'info':
      console.log(`ℹ️ MCP: ${message}`, logData);
      break;
    case 'warn':
      console.warn(`⚠️ MCP: ${message}`, logData);
      break;
    case 'error':
      console.error(`❌ MCP: ${message}`, logData);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(`🐛 MCP: ${message}`, logData);
      }
      break;
  }
}

/**
 * Validates element name for MCP operations
 */
export function validateElementName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Element name must be a non-empty string' };
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Element name too long (max 100 characters)' };
  }
  
  // Check for potentially dangerous characters
  if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
    return { valid: false, error: 'Element name contains invalid characters (only letters, numbers, hyphens, and underscores allowed)' };
  }
  
  return { valid: true };
}

/**
 * Validates page path for navigation
 */
export function validatePagePath(path: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Page path must be a non-empty string' };
  }
  
  if (!path.startsWith('/')) {
    return { valid: false, error: 'Page path must start with /' };
  }
  
  if (path.length > 500) {
    return { valid: false, error: 'Page path too long (max 500 characters)' };
  }
  
  // Check for potentially dangerous characters or patterns
  if (path.includes('..') || path.includes('//')) {
    return { valid: false, error: 'Page path contains invalid patterns' };
  }
  
  return { valid: true };
}

/**
 * Rate limiter for MCP operations
 */
export class MCPRateLimiter {
  private operations: Map<string, number[]> = new Map();
  private readonly maxOperations: number;
  private readonly timeWindow: number; // in milliseconds

  constructor(maxOperations: number = 10, timeWindowMs: number = 1000) {
    this.maxOperations = maxOperations;
    this.timeWindow = timeWindowMs;
  }

  canProceed(operationType: string): boolean {
    const now = Date.now();
    const operations = this.operations.get(operationType) || [];
    
    // Remove old operations outside the time window
    const recentOperations = operations.filter(time => now - time < this.timeWindow);
    
    if (recentOperations.length >= this.maxOperations) {
      logMCPEvent('warn', `Rate limit exceeded for operation: ${operationType}`);
      return false;
    }
    
    // Add current operation
    recentOperations.push(now);
    this.operations.set(operationType, recentOperations);
    
    return true;
  }
}

// Global rate limiter instance
export const mcpRateLimiter = new MCPRateLimiter();
