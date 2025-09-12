import { z } from 'zod';
import { validateJsonRpcRequest, validateJsonRpcResponse, createJsonRpcError, createJsonRpcSuccess, JsonRpcErrorCodes } from '../schemas/jsonrpc.js';
export class StreamableHTTPTransport {
    constructor(server, toolHandlers) {
        this.toolHandlers = new Map();
        this.server = server;
        if (toolHandlers) {
            this.toolHandlers = toolHandlers;
        }
    }
    async handleRequest(req, res) {
        try {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                res.status(200).end();
                return;
            }
            if (req.method !== 'POST') {
                const errorResponse = createJsonRpcError(JsonRpcErrorCodes.METHOD_NOT_FOUND, 'Method not allowed', undefined, null);
                res.status(405).json(errorResponse);
                return;
            }
            let validatedRequest;
            try {
                validatedRequest = validateJsonRpcRequest(req.body);
            }
            catch (validationError) {
                console.error('JSON-RPC validation error:', validationError);
                const errorResponse = createJsonRpcError(JsonRpcErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC request', validationError instanceof z.ZodError ? validationError.errors : validationError, req.body?.id || null);
                res.status(400).json(errorResponse);
                return;
            }
            const response = await this.processJSONRPCRequest(validatedRequest);
            try {
                const validatedResponse = validateJsonRpcResponse(response);
                res.status(200).json(validatedResponse);
            }
            catch (responseValidationError) {
                console.error('Response validation error:', responseValidationError);
                const errorResponse = createJsonRpcError(JsonRpcErrorCodes.INTERNAL_ERROR, 'Invalid server response', responseValidationError instanceof z.ZodError ? responseValidationError.errors : responseValidationError, validatedRequest.id);
                res.status(500).json(errorResponse);
            }
        }
        catch (error) {
            console.error('StreamableHTTPTransport error:', error);
            const errorResponse = createJsonRpcError(JsonRpcErrorCodes.INTERNAL_ERROR, 'Internal server error', error instanceof Error ? error.message : 'Unknown error', null);
            res.status(500).json(errorResponse);
        }
    }
    async processJSONRPCRequest(request) {
        try {
            const { method, params, id } = request;
            switch (method) {
                case 'tools/list':
                    const toolsResponse = await this.handleToolsList();
                    return createJsonRpcSuccess(toolsResponse, id || null);
                case 'tools/call':
                    if (!params || typeof params !== 'object' || !('name' in params)) {
                        return createJsonRpcError(JsonRpcErrorCodes.INVALID_PARAMS, 'Invalid tool call parameters', undefined, id || null);
                    }
                    const toolResult = await this.handleToolCall(params);
                    return createJsonRpcSuccess(toolResult, id || null);
                case 'initialize':
                    const initResponse = await this.handleInitialize(params);
                    return createJsonRpcSuccess(initResponse, id || null);
                default:
                    return createJsonRpcError(JsonRpcErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`, undefined, id || null);
            }
        }
        catch (error) {
            console.error('Error processing JSON-RPC request:', error);
            return createJsonRpcError(JsonRpcErrorCodes.INTERNAL_ERROR, 'Internal server error', error instanceof Error ? error.message : 'Unknown error', request.id || null);
        }
    }
    async handleToolsList() {
        const tools = [
            {
                name: 'echo',
                description: 'Echo back the provided message.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The message to echo back' }
                    },
                    required: ['message']
                }
            },
            {
                name: 'getCurrentPage',
                description: 'Get current page information from the Next.js frontend',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sessionId: { type: 'string', description: 'Optional session ID to target specific client' }
                    },
                    required: []
                }
            },
            {
                name: 'getElements',
                description: 'Get elements on current page by type (clickable, input, or all)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        elementType: {
                            type: 'string',
                            enum: ['clickable', 'input', 'all'],
                            description: 'Type of elements to retrieve',
                            default: 'clickable'
                        },
                        sessionId: { type: 'string', description: 'Optional session ID to target specific client' }
                    },
                    required: []
                }
            },
            {
                name: 'clickElement',
                description: 'Click an element on the current page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        elementName: { type: 'string', description: 'The data-clickable-element attribute value to click' },
                        sessionId: { type: 'string', description: 'Optional session ID to target specific client' }
                    },
                    required: ['elementName']
                }
            },
            {
                name: 'fillInput',
                description: 'Fill an input element with data',
                inputSchema: {
                    type: 'object',
                    properties: {
                        inputName: { type: 'string', description: 'The data-input-element attribute value of the input to fill' },
                        inputType: { type: 'string', description: 'The type of input' },
                        data: { type: ['string', 'boolean'], description: 'The data to fill into the input' },
                        sessionId: { type: 'string', description: 'Optional session ID to target specific client' }
                    },
                    required: ['inputName', 'inputType', 'data']
                }
            },
            {
                name: 'navigatePage',
                description: 'Navigate to a specific page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        page: { type: 'string', description: 'The page path to navigate to' },
                        sessionId: { type: 'string', description: 'Optional session ID to target specific client' }
                    },
                    required: ['page']
                }
            }
        ];
        return { tools };
    }
    async handleToolCall(params) {
        const { name, arguments: args } = params;
        console.log(`🔧 Executing tool: ${name} with args:`, args);
        if (this.toolHandlers.has(name)) {
            try {
                const handler = this.toolHandlers.get(name);
                const result = await handler(args);
                console.log(`✅ Tool ${name} executed successfully:`, result);
                return result;
            }
            catch (error) {
                console.error(`❌ Error executing tool ${name}:`, error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        }
                    ],
                    isError: true
                };
            }
        }
        console.warn(`⚠️ Unknown tool: ${name}`);
        return {
            content: [
                {
                    type: 'text',
                    text: `Tool '${name}' is not implemented. Available tools: ${Array.from(this.toolHandlers.keys()).join(', ')}`
                }
            ],
            isError: true
        };
    }
    async handleInitialize(params) {
        return {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {},
                resources: {},
                prompts: {},
                logging: {}
            },
            serverInfo: {
                name: 'hotel-booking-streamable-mcp-server',
                version: '1.0.0'
            }
        };
    }
    async close() {
        console.log('StreamableHTTPTransport closed');
    }
}
export function createStreamableHTTPTransport(server, toolHandlers) {
    return new StreamableHTTPTransport(server, toolHandlers);
}
//# sourceMappingURL=streamableHttpTransport.js.map