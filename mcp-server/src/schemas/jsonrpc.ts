import { z } from 'zod';

// JSON-RPC 2.0 base schemas
export const JsonRpcVersionSchema = z.literal('2.0');

export const JsonRpcIdSchema = z.union([
  z.string(),
  z.number(),
  z.null()
]);

// JSON-RPC Request schema
export const JsonRpcRequestSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  method: z.string(),
  params: z.unknown().optional(),
  id: JsonRpcIdSchema.optional()
});

// JSON-RPC Error schema
export const JsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional()
});

// JSON-RPC Response schema
export const JsonRpcResponseSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  result: z.unknown().optional(),
  error: JsonRpcErrorSchema.optional(),
  id: JsonRpcIdSchema
}).refine(data => {
  // Either result or error must be present, but not both
  return (data.result !== undefined) !== (data.error !== undefined);
}, {
  message: "Response must have either 'result' or 'error', but not both"
});

// MCP specific method schemas
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

// MCP tools/list request
export const McpToolsListRequestSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  method: z.literal('tools/list'),
  params: z.object({}).optional(),
  id: JsonRpcIdSchema
});

// MCP tools/call request
export const McpToolsCallRequestSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.unknown()).optional()
  }),
  id: JsonRpcIdSchema
});

// MCP initialize request
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

// Tool definition schema
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional()
  })
});

// Type exports
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;
export type McpToolsListRequest = z.infer<typeof McpToolsListRequestSchema>;
export type McpToolsCallRequest = z.infer<typeof McpToolsCallRequestSchema>;
export type McpInitializeRequest = z.infer<typeof McpInitializeRequestSchema>;
export type Tool = z.infer<typeof ToolSchema>;

// Validation helper functions
export function validateJsonRpcRequest(data: unknown): JsonRpcRequest {
  return JsonRpcRequestSchema.parse(data);
}

export function validateJsonRpcResponse(data: unknown): JsonRpcResponse {
  return JsonRpcResponseSchema.parse(data);
}

export function createJsonRpcError(
  code: number,
  message: string,
  data?: unknown,
  id?: string | number | null
): JsonRpcResponse {
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

export function createJsonRpcSuccess(
  result: unknown,
  id: string | number | null
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    result,
    id
  };
}

// JSON-RPC error codes
export const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32099,
  SERVER_ERROR_END: -32000
} as const;
