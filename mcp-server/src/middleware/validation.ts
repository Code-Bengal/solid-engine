import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  validateJsonRpcRequest, 
  createJsonRpcError, 
  JsonRpcErrorCodes,
  JsonRpcRequest,
  McpToolsListRequestSchema,
  McpToolsCallRequestSchema,
  McpInitializeRequestSchema
} from '../schemas/jsonrpc.js';

export interface ValidatedRequest extends Request {
  validatedJsonRpc?: JsonRpcRequest;
}

/**
 * Middleware to validate JSON-RPC requests
 */
export function validateJsonRpcMiddleware(
  req: ValidatedRequest, 
  res: Response, 
  next: NextFunction
): void {
  try {
    // Skip validation for non-POST requests
    if (req.method !== 'POST') {
      next();
      return;
    }

    // Validate the basic JSON-RPC structure
    const validatedRequest = validateJsonRpcRequest(req.body);
    
    // Store validated request for later use
    req.validatedJsonRpc = validatedRequest;
    
    console.log(`📝 Validated JSON-RPC request: ${validatedRequest.method}`, {
      id: validatedRequest.id,
      hasParams: !!validatedRequest.params
    });
    
    next();
  } catch (error) {
    console.error('❌ JSON-RPC validation failed:', error);
    
    const errorResponse = createJsonRpcError(
      JsonRpcErrorCodes.INVALID_REQUEST,
      'Invalid JSON-RPC request',
      error instanceof z.ZodError ? {
        issues: error.errors,
        message: 'Request validation failed'
      } : error,
      req.body?.id || null
    );
    
    res.status(400).json(errorResponse);
  }
}

/**
 * Middleware to validate specific MCP method requests
 */
export function validateMcpMethodMiddleware(expectedMethod: string) {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validatedRequest = req.validatedJsonRpc;
      
      if (!validatedRequest) {
        throw new Error('Request not validated with JSON-RPC middleware first');
      }

      if (validatedRequest.method !== expectedMethod) {
        const errorResponse = createJsonRpcError(
          JsonRpcErrorCodes.METHOD_NOT_FOUND,
          `Expected method '${expectedMethod}', got '${validatedRequest.method}'`,
          undefined,
          validatedRequest.id
        );
        res.status(400).json(errorResponse);
        return;
      }

      // Additional validation based on method type
      switch (expectedMethod) {
        case 'tools/list':
          McpToolsListRequestSchema.parse(validatedRequest);
          break;
        case 'tools/call':
          McpToolsCallRequestSchema.parse(validatedRequest);
          break;
        case 'initialize':
          McpInitializeRequestSchema.parse(validatedRequest);
          break;
      }

      console.log(`✅ MCP method validation passed for: ${expectedMethod}`);
      next();
    } catch (error) {
      console.error(`❌ MCP method validation failed for ${expectedMethod}:`, error);
      
      const errorResponse = createJsonRpcError(
        JsonRpcErrorCodes.INVALID_PARAMS,
        `Invalid parameters for method '${expectedMethod}'`,
        error instanceof z.ZodError ? {
          issues: error.errors,
          message: 'Method-specific validation failed'
        } : error,
        req.validatedJsonRpc?.id || null
      );
      
      res.status(400).json(errorResponse);
    }
  };
}

/**
 * Error handler for JSON-RPC responses
 */
export function jsonRpcErrorHandler(
  error: Error, 
  req: ValidatedRequest, 
  res: Response, 
  next: NextFunction
): void {
  console.error('🚨 Unhandled error in JSON-RPC handler:', error);
  
  const errorResponse = createJsonRpcError(
    JsonRpcErrorCodes.INTERNAL_ERROR,
    'Internal server error',
    {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    req.validatedJsonRpc?.id || null
  );
  
  res.status(500).json(errorResponse);
}

/**
 * Helper function to validate and parse request parameters
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  return schema.parse(params);
}

/**
 * Helper function to create successful JSON-RPC responses
 */
export function sendJsonRpcSuccess(
  res: Response, 
  result: unknown, 
  id: string | number | null
): void {
  const response = {
    jsonrpc: '2.0' as const,
    result,
    id
  };
  
  res.json(response);
}

/**
 * Helper function to send JSON-RPC errors
 */
export function sendJsonRpcError(
  res: Response,
  code: number,
  message: string,
  data?: unknown,
  id?: string | number | null,
  statusCode: number = 400
): void {
  const errorResponse = createJsonRpcError(code, message, data, id ?? null);
  res.status(statusCode).json(errorResponse);
}
