import { z } from 'zod';
export const JsonRpcVersionSchema = z.literal('2.0');
export const JsonRpcIdSchema = z.union([
    z.string(),
    z.number(),
    z.null()
]);
export const JsonRpcRequestSchema = z.object({
    jsonrpc: JsonRpcVersionSchema,
    method: z.string(),
    params: z.unknown().optional(),
    id: JsonRpcIdSchema.optional()
});
export const JsonRpcErrorSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional()
});
export const JsonRpcResponseSchema = z.object({
    jsonrpc: JsonRpcVersionSchema,
    result: z.unknown().optional(),
    error: JsonRpcErrorSchema.optional(),
    id: JsonRpcIdSchema
}).refine(data => {
    return (data.result !== undefined) !== (data.error !== undefined);
}, {
    message: "Response must have either 'result' or 'error', but not both"
});
export const McpMethodSchema = z.enum([
    'initialize',
    'tools/list',
    'tools/call',
    'resources/list',
    'resources/read',
    'prompts/list',
    'prompts/get',
    'notifications/initialized',
    'notifications/cancelled',
    'notifications/progress',
    'logging/setLevel'
]);
export const McpToolsListRequestSchema = z.object({
    jsonrpc: JsonRpcVersionSchema,
    method: z.literal('tools/list'),
    params: z.object({}).optional(),
    id: JsonRpcIdSchema
});
export const McpToolsCallRequestSchema = z.object({
    jsonrpc: JsonRpcVersionSchema,
    method: z.literal('tools/call'),
    params: z.object({
        name: z.string(),
        arguments: z.record(z.unknown()).optional()
    }),
    id: JsonRpcIdSchema
});
export const McpInitializeRequestSchema = z.object({
    jsonrpc: JsonRpcVersionSchema,
    method: z.literal('initialize'),
    params: z.object({
        protocolVersion: z.string(),
        capabilities: z.object({
            tools: z.object({}).optional(),
            resources: z.object({}).optional(),
            prompts: z.object({}).optional(),
            logging: z.object({}).optional()
        }).optional(),
        clientInfo: z.object({
            name: z.string(),
            version: z.string()
        })
    }),
    id: JsonRpcIdSchema
});
export const ToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.object({
        type: z.literal('object'),
        properties: z.record(z.unknown()),
        required: z.array(z.string()).optional()
    })
});
export function validateJsonRpcRequest(data) {
    return JsonRpcRequestSchema.parse(data);
}
export function validateJsonRpcResponse(data) {
    return JsonRpcResponseSchema.parse(data);
}
export function createJsonRpcError(code, message, data, id) {
    return {
        jsonrpc: '2.0',
        error: {
            code,
            message,
            data
        },
        id: id ?? null
    };
}
export function createJsonRpcSuccess(result, id) {
    return {
        jsonrpc: '2.0',
        result,
        id
    };
}
export const JsonRpcErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    SERVER_ERROR_START: -32099,
    SERVER_ERROR_END: -32000
};
//# sourceMappingURL=jsonrpc.js.map