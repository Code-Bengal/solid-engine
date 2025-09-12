import { z } from 'zod';
export declare const JsonRpcVersionSchema: z.ZodLiteral<"2.0">;
export declare const JsonRpcIdSchema: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>;
export declare const JsonRpcRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodUnknown>;
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>>;
}, "strip", z.ZodTypeAny, {
    method: string;
    jsonrpc: "2.0";
    params?: unknown;
    id?: string | number | null | undefined;
}, {
    method: string;
    jsonrpc: "2.0";
    params?: unknown;
    id?: string | number | null | undefined;
}>;
export declare const JsonRpcErrorSchema: z.ZodObject<{
    code: z.ZodNumber;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    code: number;
    message: string;
    data?: unknown;
}, {
    code: number;
    message: string;
    data?: unknown;
}>;
export declare const JsonRpcResponseSchema: z.ZodEffects<z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    result: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: number;
        message: string;
        data?: unknown;
    }, {
        code: number;
        message: string;
        data?: unknown;
    }>>;
    id: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    jsonrpc: "2.0";
    id: string | number | null;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    } | undefined;
    result?: unknown;
}, {
    jsonrpc: "2.0";
    id: string | number | null;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    } | undefined;
    result?: unknown;
}>, {
    jsonrpc: "2.0";
    id: string | number | null;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    } | undefined;
    result?: unknown;
}, {
    jsonrpc: "2.0";
    id: string | number | null;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    } | undefined;
    result?: unknown;
}>;
export declare const McpMethodSchema: z.ZodEnum<["initialize", "tools/list", "tools/call", "resources/list", "resources/read", "prompts/list", "prompts/get", "notifications/initialized", "notifications/cancelled", "notifications/progress", "logging/setLevel"]>;
export declare const McpToolsListRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"tools/list">;
    params: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    id: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    method: "tools/list";
    jsonrpc: "2.0";
    id: string | number | null;
    params?: {} | undefined;
}, {
    method: "tools/list";
    jsonrpc: "2.0";
    id: string | number | null;
    params?: {} | undefined;
}>;
export declare const McpToolsCallRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"tools/call">;
    params: z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        arguments?: Record<string, unknown> | undefined;
    }, {
        name: string;
        arguments?: Record<string, unknown> | undefined;
    }>;
    id: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    params: {
        name: string;
        arguments?: Record<string, unknown> | undefined;
    };
    method: "tools/call";
    jsonrpc: "2.0";
    id: string | number | null;
}, {
    params: {
        name: string;
        arguments?: Record<string, unknown> | undefined;
    };
    method: "tools/call";
    jsonrpc: "2.0";
    id: string | number | null;
}>;
export declare const McpInitializeRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"initialize">;
    params: z.ZodObject<{
        protocolVersion: z.ZodString;
        capabilities: z.ZodOptional<z.ZodObject<{
            tools: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            resources: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            prompts: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            logging: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            logging?: {} | undefined;
            prompts?: {} | undefined;
            resources?: {} | undefined;
            tools?: {} | undefined;
        }, {
            logging?: {} | undefined;
            prompts?: {} | undefined;
            resources?: {} | undefined;
            tools?: {} | undefined;
        }>>;
        clientInfo: z.ZodObject<{
            name: z.ZodString;
            version: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            version: string;
        }, {
            name: string;
            version: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        protocolVersion: string;
        clientInfo: {
            name: string;
            version: string;
        };
        capabilities?: {
            logging?: {} | undefined;
            prompts?: {} | undefined;
            resources?: {} | undefined;
            tools?: {} | undefined;
        } | undefined;
    }, {
        protocolVersion: string;
        clientInfo: {
            name: string;
            version: string;
        };
        capabilities?: {
            logging?: {} | undefined;
            prompts?: {} | undefined;
            resources?: {} | undefined;
            tools?: {} | undefined;
        } | undefined;
    }>;
    id: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    params: {
        protocolVersion: string;
        clientInfo: {
            name: string;
            version: string;
        };
        capabilities?: {
            logging?: {} | undefined;
            prompts?: {} | undefined;
            resources?: {} | undefined;
            tools?: {} | undefined;
        } | undefined;
    };
    method: "initialize";
    jsonrpc: "2.0";
    id: string | number | null;
}, {
    params: {
        protocolVersion: string;
        clientInfo: {
            name: string;
            version: string;
        };
        capabilities?: {
            logging?: {} | undefined;
            prompts?: {} | undefined;
            resources?: {} | undefined;
            tools?: {} | undefined;
        } | undefined;
    };
    method: "initialize";
    jsonrpc: "2.0";
    id: string | number | null;
}>;
export declare const ToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputSchema: z.ZodObject<{
        type: z.ZodLiteral<"object">;
        properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    }, {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    };
}, {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    };
}>;
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;
export type McpToolsListRequest = z.infer<typeof McpToolsListRequestSchema>;
export type McpToolsCallRequest = z.infer<typeof McpToolsCallRequestSchema>;
export type McpInitializeRequest = z.infer<typeof McpInitializeRequestSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export declare function validateJsonRpcRequest(data: unknown): JsonRpcRequest;
export declare function validateJsonRpcResponse(data: unknown): JsonRpcResponse;
export declare function createJsonRpcError(code: number, message: string, data?: unknown, id?: string | number | null): JsonRpcResponse;
export declare function createJsonRpcSuccess(result: unknown, id: string | number | null): JsonRpcResponse;
export declare const JsonRpcErrorCodes: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly SERVER_ERROR_START: -32099;
    readonly SERVER_ERROR_END: -32000;
};
//# sourceMappingURL=jsonrpc.d.ts.map