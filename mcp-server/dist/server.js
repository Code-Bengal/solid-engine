#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
class StreamableMCPServer {
    constructor() {
        this.nextjsClients = new Map();
        this.app = express();
        this.httpServer = createServer(this.app);
        this.server = new Server({
            name: 'hotel-booking-streamable-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupMiddleware();
        this.setupMCPTools();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Credentials', 'true');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            }
            else {
                next();
            }
        });
    }
    setupMCPTools() {
        const tools = [
            {
                name: 'echo',
                description: 'Echo back the input message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Message to echo back'
                        }
                    },
                    required: ['message']
                }
            },
            {
                name: 'getCurrentPage',
                description: 'Get current page information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
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
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: []
                }
            },
            {
                name: 'clickElement',
                description: 'Click a named element',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Element name to click'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: ['name']
                }
            },
            {
                name: 'fillInput',
                description: 'Fill an input element with data (supports text inputs, radio buttons, checkboxes, select dropdowns, textareas)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The data-input-element attribute value of the input to fill'
                        },
                        type: {
                            type: 'string',
                            description: 'The type of input (text, email, password, radio, checkbox, select, textarea, etc.)'
                        },
                        value: {
                            type: ['string', 'boolean'],
                            description: 'The data to fill into the input'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: ['name', 'type', 'value']
                }
            },
            {
                name: 'navigatePage',
                description: 'Navigate to a page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'string',
                            description: 'Page name or path to navigate to (e.g., "contact" or "/contact")'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: ['page']
                }
            }
        ];
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return { tools };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const sessionId = args?.sessionId;
            console.log(`🎯 [CallTool] Tool: ${name}, SessionId: ${sessionId || 'auto-select'}`);
            try {
                let result;
                switch (name) {
                    case 'echo':
                        result = { message: args.message, timestamp: new Date().toISOString() };
                        break;
                    case 'getCurrentPage':
                        result = await this.getCurrentPage(sessionId);
                        break;
                    case 'getElements':
                        result = await this.getElements(sessionId, args?.elementType || 'clickable');
                        break;
                    case 'clickElement':
                        result = await this.clickElement(sessionId, args.name);
                        break;
                    case 'fillInput':
                        console.log(`🔍 [HTTP fillInput] Received args:`, args);
                        console.log(`🔍 [HTTP fillInput] Args keys:`, Object.keys(args || {}));
                        result = await this.fillInput(sessionId, args.name, args.value, args.type);
                        break;
                    case 'navigatePage':
                        result = await this.navigatePage(sessionId, args.page);
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                console.error(`❌ Error executing tool ${name}:`, error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: true,
                                message: error instanceof Error ? error.message : 'Unknown error',
                                tool: name,
                                sessionId,
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                server: 'Streamable MCP Server',
                timestamp: new Date().toISOString(),
                connectedClients: Array.from(this.nextjsClients.keys()),
                clientCount: this.nextjsClients.size
            });
        });
        this.app.post('/mcp', async (req, res) => {
            try {
                const request = req.body;
                console.log('📨 [HTTP] Received MCP request:', request);
                if (request.method === 'tools/list') {
                    const tools = [
                        { name: 'echo', description: 'Echo back the input message' },
                        { name: 'getCurrentPage', description: 'Get current page information' },
                        { name: 'getElements', description: 'Get clickable elements on current page' },
                        { name: 'clickElement', description: 'Click a named element' },
                        { name: 'fillInput', description: 'Fill an input field' },
                        { name: 'navigatePage', description: 'Navigate to a page' }
                    ];
                    const response = {
                        jsonrpc: '2.0',
                        result: { tools }
                    };
                    if (request.id !== undefined) {
                        response.id = request.id;
                    }
                    res.json(response);
                    return;
                }
                if (request.method === 'tools/call') {
                    const { name, arguments: args } = request.params;
                    console.log(`🎯 [HTTP] Tool call: ${name}`, args);
                    let result;
                    try {
                        switch (name) {
                            case 'echo':
                                result = { message: args.message, timestamp: new Date().toISOString() };
                                break;
                            case 'getCurrentPage':
                                result = await this.getCurrentPage(args?.sessionId);
                                break;
                            case 'getElements':
                                result = await this.getElements(args?.sessionId, args?.elementType || 'clickable');
                                break;
                            case 'clickElement':
                                result = await this.clickElement(args?.sessionId, args?.name);
                                break;
                            case 'fillInput':
                                console.log(`🔍 [MCP fillInput] Received args:`, args);
                                console.log(`🔍 [MCP fillInput] Args keys:`, Object.keys(args || {}));
                                result = await this.fillInput(args?.sessionId, args?.name, args?.value, args?.type);
                                break;
                            case 'navigatePage':
                                result = await this.navigatePage(args?.sessionId, args?.page);
                                break;
                            default:
                                throw new Error(`Unknown tool: ${name}`);
                        }
                        const successResponse = {
                            jsonrpc: '2.0',
                            result: {
                                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                            }
                        };
                        if (request.id !== undefined) {
                            successResponse.id = request.id;
                        }
                        res.json(successResponse);
                    }
                    catch (error) {
                        console.error('❌ [HTTP] Tool execution error:', error);
                        const errorResponse = {
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: error instanceof Error ? error.message : 'Internal error',
                                data: { tool: name, args }
                            }
                        };
                        if (request.id !== undefined) {
                            errorResponse.id = request.id;
                        }
                        res.json(errorResponse);
                    }
                    return;
                }
                const methodNotFoundResponse = {
                    jsonrpc: '2.0',
                    error: { code: -32601, message: 'Method not found' }
                };
                if (request.id !== undefined) {
                    methodNotFoundResponse.id = request.id;
                }
                res.status(400).json(methodNotFoundResponse);
            }
            catch (error) {
                console.error('❌ [HTTP] Request parsing error:', error);
                res.status(400).json({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: 'Parse error' }
                });
            }
        });
    }
    setupSocketIO() {
        this.io = new SocketIOServer(this.httpServer, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });
        setInterval(() => {
            this.cleanupStaleConnections();
        }, 30000);
        this.io.on('connection', (socket) => {
            console.log(`🔌 [MAIN] Client connected to main namespace: ${socket.id}`);
            console.log(`🔌 [MAIN] Total clients connected: ${this.nextjsClients.size}`);
            socket.on('register:nextjs', () => {
                console.log(`✅ [MAIN] Next.js client registered: ${socket.id}`);
                this.nextjsClients.set(socket.id, socket);
                console.log(`✅ [MAIN] Updated client list:`, Array.from(this.nextjsClients.keys()));
            });
            socket.on('disconnect', () => {
                console.log(`❌ [MAIN] Client disconnected from main namespace: ${socket.id}`);
                this.nextjsClients.delete(socket.id);
                console.log(`❌ [MAIN] Remaining clients:`, Array.from(this.nextjsClients.keys()));
            });
        });
        const toolsNamespace = this.io.of('/tools');
        toolsNamespace.on('connection', (socket) => {
            console.log(`🔌 [TOOLS] Client connected to tools namespace: ${socket.id}`);
            console.log(`🔌 [TOOLS] Total clients connected: ${this.nextjsClients.size}`);
            this.nextjsClients.set(socket.id, socket);
            console.log(`✅ [TOOLS] Auto-registered Next.js client: ${socket.id}`);
            console.log(`✅ [TOOLS] Updated client list:`, Array.from(this.nextjsClients.keys()));
            socket.on('register:nextjs', () => {
                console.log(`✅ [TOOLS] Next.js client explicitly registered: ${socket.id}`);
                this.nextjsClients.set(socket.id, socket);
                console.log(`✅ [TOOLS] Updated client list:`, Array.from(this.nextjsClients.keys()));
            });
            socket.on('disconnect', () => {
                console.log(`❌ [TOOLS] Client disconnected from tools namespace: ${socket.id}`);
                this.nextjsClients.delete(socket.id);
                console.log(`❌ [TOOLS] Remaining clients:`, Array.from(this.nextjsClients.keys()));
            });
        });
    }
    cleanupStaleConnections() {
        console.log('🧹 [CLEANUP] Starting stale connection cleanup...');
        const staleConnections = [];
        for (const [socketId, socket] of this.nextjsClients.entries()) {
            if (!socket.connected) {
                console.log(`🗑️ [CLEANUP] Found stale connection: ${socketId} (connected: ${socket.connected})`);
                staleConnections.push(socketId);
            }
        }
        staleConnections.forEach(socketId => {
            this.nextjsClients.delete(socketId);
            console.log(`🗑️ [CLEANUP] Removed stale connection: ${socketId}`);
        });
        if (staleConnections.length > 0) {
            console.log(`🧹 [CLEANUP] Cleaned up ${staleConnections.length} stale connections`);
            console.log(`✅ [CLEANUP] Active clients after cleanup:`, Array.from(this.nextjsClients.keys()));
        }
        else {
            console.log('✅ [CLEANUP] No stale connections found');
        }
    }
    getBestAvailableClient() {
        this.cleanupStaleConnections();
        if (this.nextjsClients.size === 0) {
            console.log('❌ [CLIENT] No clients available');
            return null;
        }
        const connectedClients = Array.from(this.nextjsClients.entries())
            .filter(([_, socket]) => socket.connected)
            .map(([id, socket]) => ({ id, socket }));
        if (connectedClients.length === 0) {
            console.log('❌ [CLIENT] No connected clients available');
            return null;
        }
        const bestClient = connectedClients[connectedClients.length - 1];
        console.log(`✅ [CLIENT] Selected best available client: ${bestClient.id}`);
        console.log(`✅ [CLIENT] Client is connected: ${bestClient.socket.connected}`);
        return bestClient.socket;
    }
    async getCurrentPage(sessionId) {
        console.log(`🔍 [getCurrentPage] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}`);
        return new Promise((resolve, reject) => {
            let socket = sessionId ? this.nextjsClients.get(sessionId) : null;
            if (!socket) {
                socket = this.getBestAvailableClient();
            }
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [getCurrentPage] No available Next.js client found`);
                console.log(`❌ [getCurrentPage] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [getCurrentPage] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [getCurrentPage] Emitting 'mcp:getCurrentPage' to client`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [getCurrentPage] Timeout after 5 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 5000);
            const handler = (pageInfo) => {
                console.log(`📥 [getCurrentPage] Received response from client:`, pageInfo);
                clearTimeout(timeout);
                socket.off('mcp:pageInfo', handler);
                resolve(pageInfo);
            };
            socket.on('mcp:pageInfo', handler);
            socket.emit('mcp:getCurrentPage');
        });
    }
    async getElements(sessionId, elementType = 'clickable') {
        console.log(`🔍 [getElements] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, elementType: ${elementType}`);
        return new Promise((resolve, reject) => {
            let socket = sessionId ? this.nextjsClients.get(sessionId) : null;
            if (!socket) {
                socket = this.getBestAvailableClient();
            }
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [getElements] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
                console.log(`❌ [getElements] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [getElements] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [getElements] Emitting 'mcp:getElements' to client with elementType: ${elementType}`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [getElements] Timeout after 5 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 5000);
            const handler = (response) => {
                console.log(`📥 [getElements] Received response from client:`, response);
                console.log(`📊 [getElements] Received ${response?.elements?.length || 0} ${elementType} elements`);
                clearTimeout(timeout);
                socket.off('mcp:elements', handler);
                resolve(response.elements || []);
            };
            socket.on('mcp:elements', handler);
            socket.emit('mcp:getElements', elementType);
        });
    }
    async getClickableElements(sessionId) {
        console.log(`🔍 [getClickableElements] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}`);
        return new Promise((resolve, reject) => {
            let socket = sessionId ? this.nextjsClients.get(sessionId) : null;
            if (!socket) {
                socket = this.getBestAvailableClient();
            }
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [getClickableElements] No available Next.js client found`);
                console.log(`❌ [getClickableElements] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [getClickableElements] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [getClickableElements] Emitting 'mcp:getClickableElements' to client`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [getClickableElements] Timeout after 5 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 5000);
            const handler = (elements) => {
                console.log(`📥 [getClickableElements] Received response from client:`, elements);
                clearTimeout(timeout);
                socket.off('mcp:clickableElements', handler);
                resolve(elements);
            };
            socket.on('mcp:clickableElements', handler);
            socket.emit('mcp:getClickableElements');
        });
    }
    async clickElement(sessionId, elementName) {
        console.log(`🔍 [clickElement] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, element: ${elementName}`);
        return new Promise((resolve, reject) => {
            let socket = sessionId ? this.nextjsClients.get(sessionId) : null;
            if (!socket) {
                socket = this.getBestAvailableClient();
            }
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [clickElement] No available Next.js client found`);
                console.log(`❌ [clickElement] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [clickElement] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [clickElement] Emitting 'mcp:clickElement' to client with element: ${elementName}`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [clickElement] Timeout after 5 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 5000);
            const handler = (result) => {
                console.log(`📥 [clickElement] Received response from client:`, result);
                clearTimeout(timeout);
                socket.off('mcp:clickResult', handler);
                resolve(result);
            };
            socket.on('mcp:clickResult', handler);
            socket.emit('mcp:clickElement', elementName);
        });
    }
    async fillInput(sessionId, inputName, value, inputType = 'text') {
        console.log(`🔍 [fillInput] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, input: ${inputName}, value: ${value}, type: ${inputType}`);
        return new Promise((resolve, reject) => {
            let socket = sessionId ? this.nextjsClients.get(sessionId) : null;
            if (!socket) {
                socket = this.getBestAvailableClient();
            }
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [fillInput] No available Next.js client found`);
                console.log(`❌ [fillInput] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [fillInput] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [fillInput] Emitting 'mcp:fillInput' to client with input: ${inputName}, value: ${value}, type: ${inputType}`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [fillInput] Timeout after 5 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 5000);
            const handler = (result) => {
                console.log(`📥 [fillInput] Received response from client:`, result);
                clearTimeout(timeout);
                socket.off('mcp:fillInputResult', handler);
                resolve(result);
            };
            socket.on('mcp:fillInputResult', handler);
            const fillInputPayload = { name: inputName, value, type: inputType };
            console.log(`📤 [fillInput] Sending payload to client:`, fillInputPayload);
            console.log(`📤 [fillInput] Payload keys:`, Object.keys(fillInputPayload));
            console.log(`📤 [fillInput] Payload values:`, Object.values(fillInputPayload));
            socket.emit('mcp:fillInput', fillInputPayload);
        });
    }
    async navigatePage(sessionId, page) {
        console.log(`🔍 [navigatePage] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, page: ${page}`);
        return new Promise((resolve, reject) => {
            let socket = sessionId ? this.nextjsClients.get(sessionId) : null;
            if (!socket) {
                socket = this.getBestAvailableClient();
            }
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [navigatePage] No available Next.js client found`);
                console.log(`❌ [navigatePage] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [navigatePage] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [navigatePage] Emitting 'mcp:navigatePage' to client with page: ${page}`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [navigatePage] Timeout after 5 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 5000);
            const handler = (result) => {
                console.log(`📥 [navigatePage] Received response from client:`, result);
                clearTimeout(timeout);
                socket.off('mcp:navigationResult', handler);
                resolve(result);
            };
            socket.on('mcp:navigationResult', handler);
            socket.emit('mcp:navigatePage', page);
        });
    }
    start(port = 3001) {
        this.setupSocketIO();
        this.httpServer.listen(port, () => {
            console.log(`🚀 Streamable MCP Server running on port ${port}`);
            console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
            console.log(`🔌 Socket.io endpoint: http://localhost:${port}`);
            console.log(`🛠️ Tools namespace: http://localhost:${port}/tools`);
            console.log(`🏥 Health check: http://localhost:${port}/health`);
        });
    }
    async stop() {
        if (this.io) {
            this.io.close();
        }
        if (this.httpServer) {
            this.httpServer.close();
        }
        console.log('🛑 Streamable MCP Server stopped');
    }
}
const mcpServer = new StreamableMCPServer();
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await mcpServer.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await mcpServer.stop();
    process.exit(0);
});
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
mcpServer.start(PORT);
//# sourceMappingURL=server.js.map