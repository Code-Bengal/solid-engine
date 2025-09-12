import { z } from 'zod';
import { validateJsonRpcRequest, createJsonRpcError, JsonRpcErrorCodes, McpToolsListRequestSchema, McpToolsCallRequestSchema, McpInitializeRequestSchema } from '../schemas/jsonrpc.js';
export function validateJsonRpcMiddleware(req, res, next) {
    try {
        if (req.method !== 'POST') {
            next();
            return;
        }
        const validatedRequest = validateJsonRpcRequest(req.body);
        req.validatedJsonRpc = validatedRequest;
        console.log(`📝 Validated JSON-RPC request: ${validatedRequest.method}`, {
            id: validatedRequest.id,
            hasParams: !!validatedRequest.params
        });
        next();
    }
    catch (error) {
        console.error('❌ JSON-RPC validation failed:', error);
        const errorResponse = createJsonRpcError(JsonRpcErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC request', error instanceof z.ZodError ? {
            issues: error.errors,
            message: 'Request validation failed'
        } : error, req.body?.id || null);
        res.status(400).json(errorResponse);
    }
}
export function validateMcpMethodMiddleware(expectedMethod) {
    return (req, res, next) => {
        try {
            const validatedRequest = req.validatedJsonRpc;
            if (!validatedRequest) {
                throw new Error('Request not validated with JSON-RPC middleware first');
            }
            if (validatedRequest.method !== expectedMethod) {
                const errorResponse = createJsonRpcError(JsonRpcErrorCodes.METHOD_NOT_FOUND, `Expected method '${expectedMethod}', got '${validatedRequest.method}'`, undefined, validatedRequest.id);
                res.status(400).json(errorResponse);
                return;
            }
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
        }
        catch (error) {
            console.error(`❌ MCP method validation failed for ${expectedMethod}:`, error);
            const errorResponse = createJsonRpcError(JsonRpcErrorCodes.INVALID_PARAMS, `Invalid parameters for method '${expectedMethod}'`, error instanceof z.ZodError ? {
                issues: error.errors,
                message: 'Method-specific validation failed'
            } : error, req.validatedJsonRpc?.id || null);
            res.status(400).json(errorResponse);
        }
    };
}
export function jsonRpcErrorHandler(error, req, res, next) {
    console.error('🚨 Unhandled error in JSON-RPC handler:', error);
    const errorResponse = createJsonRpcError(JsonRpcErrorCodes.INTERNAL_ERROR, 'Internal server error', {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, req.validatedJsonRpc?.id || null);
    res.status(500).json(errorResponse);
}
export function validateParams(schema, params) {
    return schema.parse(params);
}
export function sendJsonRpcSuccess(res, result, id) {
    const response = {
        jsonrpc: '2.0',
        result,
        id
    };
    res.json(response);
}
export function sendJsonRpcError(res, code, message, data, id, statusCode = 400) {
    const errorResponse = createJsonRpcError(code, message, data, id ?? null);
    res.status(statusCode).json(errorResponse);
}
//# sourceMappingURL=validation.js.map