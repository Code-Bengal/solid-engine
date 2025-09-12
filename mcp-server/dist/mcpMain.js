#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
class SimpleMCPServer {
    constructor() {
        this.nextjsClients = new Map();
        this.server = new Server({
            name: 'hotel-booking-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupTools();
    }
    setupTools() {
        const tools = [
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
                name: 'getClickableElements',
                description: 'Get clickable elements on current page (backward compatibility)',
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
                name: 'fillInput',
                description: 'Fill an input element with data (supports text inputs, radio buttons, checkboxes, select dropdowns, textareas)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        inputName: {
                            type: 'string',
                            description: 'The data-input-element attribute value of the input to fill'
                        },
                        inputType: {
                            type: 'string',
                            description: 'The type of input element (text, email, password, radio, checkbox, select, textarea, etc.)'
                        },
                        data: {
                            oneOf: [
                                { type: 'string' },
                                { type: 'boolean' }
                            ],
                            description: 'The data to fill into the input element'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: ['inputName', 'inputType', 'data']
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
                name: 'navigatePage',
                description: 'Navigate to a page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'string',
                            description: 'Page path to navigate to'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: ['page']
                }
            },
            {
                name: 'fillBookingForm',
                description: 'Fill booking form',
                inputSchema: {
                    type: 'object',
                    properties: {
                        checkIn: { type: 'string' },
                        checkOut: { type: 'string' },
                        guests: { type: 'number' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        sessionId: {
                            type: 'string',
                            description: 'Optional session ID to target specific client'
                        }
                    },
                    required: []
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
                    case 'getCurrentPage':
                        result = await this.getCurrentPage(sessionId);
                        break;
                    case 'getElements':
                        result = await this.getElements(sessionId, args?.elementType || 'clickable');
                        break;
                    case 'getClickableElements':
                        result = await this.getClickableElements(sessionId);
                        break;
                    case 'fillInput':
                        result = await this.fillInput(sessionId, args.inputName, args.inputType, args.data);
                        break;
                    case 'clickElement':
                        result = await this.clickElement(sessionId, args.name);
                        break;
                    case 'navigatePage':
                        result = await this.navigatePage(sessionId, args.page);
                        break;
                    case 'fillBookingForm':
                        result = await this.fillBookingForm(sessionId, args);
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
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [getCurrentPage] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
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
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
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
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [getClickableElements] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
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
                console.log(`📊 [getClickableElements] Received ${elements?.length || 0} elements`);
                clearTimeout(timeout);
                socket.off('mcp:clickableElements', handler);
                resolve(elements);
            };
            socket.on('mcp:clickableElements', handler);
            socket.emit('mcp:getClickableElements');
        });
    }
    async fillInput(sessionId, inputName, inputType, data) {
        console.log(`📝 [fillInput] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, input: ${inputName}, type: ${inputType}, data:`, data);
        return new Promise((resolve, reject) => {
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [fillInput] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
                console.log(`❌ [fillInput] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [fillInput] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [fillInput] Emitting 'mcp:fillInput' to client with inputName: ${inputName}, inputType: ${inputType}, data:`, data);
            const timeout = setTimeout(() => {
                console.log(`⏰ [fillInput] Timeout after 10 seconds for client: ${socket.id}, input: ${inputName}`);
                reject(new Error('Timeout'));
            }, 10000);
            const handler = (result) => {
                console.log(`📥 [fillInput] Received response from client:`, result);
                clearTimeout(timeout);
                socket.off('mcp:fillInputResult', handler);
                resolve(result);
            };
            socket.on('mcp:fillInputResult', handler);
            socket.emit('mcp:fillInput', inputName, inputType, data);
        });
    }
    async clickElement(sessionId, elementName) {
        console.log(`🖱️ [clickElement] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, element: ${elementName}`);
        return new Promise((resolve, reject) => {
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [clickElement] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
                console.log(`❌ [clickElement] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [clickElement] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [clickElement] Emitting 'mcp:clickElement' to client with elementName: ${elementName}`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [clickElement] Timeout after 10 seconds for client: ${socket.id}, element: ${elementName}`);
                reject(new Error('Timeout'));
            }, 10000);
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
    async navigatePage(sessionId, page) {
        console.log(`🧭 [navigatePage] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, page: ${page}`);
        return new Promise((resolve, reject) => {
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [navigatePage] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
                console.log(`❌ [navigatePage] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [navigatePage] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [navigatePage] Emitting 'mcp:navigatePage' to client with page: ${page}`);
            const timeout = setTimeout(() => {
                console.log(`⏰ [navigatePage] Timeout after 10 seconds for client: ${socket.id}, page: ${page}`);
                reject(new Error('Timeout'));
            }, 10000);
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
    async fillBookingForm(sessionId, formData) {
        console.log(`📝 [fillBookingForm] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, formData:`, formData);
        return new Promise((resolve, reject) => {
            const socket = sessionId ? this.nextjsClients.get(sessionId) : this.getBestAvailableClient();
            if (!socket) {
                const clientsList = Array.from(this.nextjsClients.keys());
                console.log(`❌ [fillBookingForm] No ${sessionId ? 'matching' : 'available'} Next.js client found`);
                console.log(`❌ [fillBookingForm] Available clients:`, clientsList);
                reject(new Error('No Next.js client connected'));
                return;
            }
            console.log(`✅ [fillBookingForm] Found client: ${socket.id} (connected: ${socket.connected})`);
            console.log(`📤 [fillBookingForm] Emitting 'mcp:fillBookingForm' to client with formData:`, formData);
            const timeout = setTimeout(() => {
                console.log(`⏰ [fillBookingForm] Timeout after 15 seconds for client: ${socket.id}`);
                reject(new Error('Timeout'));
            }, 15000);
            const handler = (result) => {
                console.log(`📥 [fillBookingForm] Received response from client:`, result);
                clearTimeout(timeout);
                socket.off('mcp:bookingFormResult', handler);
                resolve(result);
            };
            socket.on('mcp:bookingFormResult', handler);
            socket.emit('mcp:fillBookingForm', formData);
        });
    }
    async startStdio() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
    async startHttp(port = 3001) {
        this.httpServer = createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            if (req.method === 'GET' && req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'healthy',
                    server: 'MCP Server',
                    timestamp: new Date().toISOString(),
                    connectedClients: Array.from(this.nextjsClients.keys()),
                    clientCount: this.nextjsClients.size
                }));
                return;
            }
            if (req.method === 'POST' && req.url === '/mcp') {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    try {
                        const request = JSON.parse(body);
                        console.log('📨 [HTTP] Received MCP request:', request);
                        if (request.method === 'tools/list') {
                            const tools = [
                                { name: 'getCurrentPage', description: 'Get current page information' },
                                { name: 'getElements', description: 'Get elements on current page by type (clickable, input, or all)' },
                                { name: 'getClickableElements', description: 'Get clickable elements on current page' },
                                { name: 'clickElement', description: 'Click a named element' },
                                { name: 'navigatePage', description: 'Navigate to a page' },
                                { name: 'fillBookingForm', description: 'Fill booking form' }
                            ];
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                jsonrpc: '2.0',
                                id: request.id,
                                result: { tools }
                            }));
                            return;
                        }
                        if (request.method === 'tools/call') {
                            const { name, arguments: args } = request.params;
                            console.log(`🎯 [HTTP] Tool call: ${name}`, args);
                            let result;
                            try {
                                switch (name) {
                                    case 'getCurrentPage':
                                        result = await this.getCurrentPage(args?.sessionId);
                                        break;
                                    case 'getElements':
                                        result = await this.getElements(args?.sessionId, args?.elementType || 'clickable');
                                        break;
                                    case 'getClickableElements':
                                        result = await this.getClickableElements(args?.sessionId);
                                        break;
                                    case 'clickElement':
                                        result = await this.clickElement(args?.sessionId, args?.name);
                                        break;
                                    case 'navigatePage':
                                        result = await this.navigatePage(args?.sessionId, args?.page);
                                        break;
                                    case 'fillBookingForm':
                                        result = await this.fillBookingForm(args?.sessionId, args);
                                        break;
                                    default:
                                        throw new Error(`Unknown tool: ${name}`);
                                }
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: request.id,
                                    result: {
                                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                                    }
                                }));
                            }
                            catch (error) {
                                console.error('❌ [HTTP] Tool execution error:', error);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: request.id,
                                    error: {
                                        code: -32603,
                                        message: error instanceof Error ? error.message : 'Internal error',
                                        data: { tool: name, args }
                                    }
                                }));
                            }
                            return;
                        }
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: request.id,
                            error: { code: -32601, message: 'Method not found' }
                        }));
                    }
                    catch (error) {
                        console.error('❌ [HTTP] Request parsing error:', error);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: null,
                            error: { code: -32700, message: 'Parse error' }
                        }));
                    }
                });
                return;
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        });
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
        this.httpServer.listen(port, () => {
            console.log(`MCP Server running on port ${port}`);
            console.log(`Socket.IO listening on http://localhost:${port}`);
            console.log(`Tools namespace available at http://localhost:${port}/tools`);
        });
    }
    async start() {
        const mode = process.argv[2] || 'stdio';
        if (mode === 'http') {
            await this.startHttp();
        }
        else if (mode === 'both') {
            await this.startHttp();
            await this.startStdio();
        }
        else {
            await this.startStdio();
        }
    }
}
const server = new SimpleMCPServer();
server.start().catch(console.error);
//# sourceMappingURL=mcpMain.js.map