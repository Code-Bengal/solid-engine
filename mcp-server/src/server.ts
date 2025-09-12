#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import express from 'express';

// Import types
import { 
  PageInfo, 
  ClickableElement, 
  ClickResult, 
  NavigationResult, 
  FillInputResult 
} from './types/mcp.js';

class StreamableMCPServer {
  private server: Server;
  private app: express.Application;
  private httpServer: any;
  private io?: SocketIOServer;
  private nextjsClients: Map<string, Socket> = new Map();

  constructor() {
    // Initialize Express app
    this.app = express();
    this.httpServer = createServer(this.app);

    // Initialize MCP Server
    this.server = new Server(
      {
        name: 'hotel-booking-streamable-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupMiddleware();
    this.setupMCPTools();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupMCPTools(): void {
    const tools: Tool[] = [
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
      const sessionId = (args as any)?.sessionId;
      
      console.log(`🎯 [CallTool] Tool: ${name}, SessionId: ${sessionId || 'auto-select'}`);

      try {
        let result: any;

        switch (name) {
          case 'echo':
            result = { message: (args as any).message, timestamp: new Date().toISOString() };
            break;
          case 'getCurrentPage':
            result = await this.getCurrentPage(sessionId);
            break;
          case 'getElements':
            result = await this.getElements(sessionId, (args as any)?.elementType || 'clickable');
            break;
          case 'clickElement':
            result = await this.clickElement(sessionId, (args as any).name);
            break;
          case 'fillInput':
            console.log(`🔍 [HTTP fillInput] Received args:`, args);
            console.log(`🔍 [HTTP fillInput] Args keys:`, Object.keys(args || {}));
            result = await this.fillInput(sessionId, (args as any).name, (args as any).value, (args as any).type);
            break;
          case 'navigatePage':
            result = await this.navigatePage(sessionId, (args as any).page);
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
      } catch (error) {
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

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'Streamable MCP Server',
        timestamp: new Date().toISOString(),
        connectedClients: Array.from(this.nextjsClients.keys()),
        clientCount: this.nextjsClients.size
      });
    });

    // MCP HTTP endpoint
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

          const response: any = {
            jsonrpc: '2.0',
            result: { tools }
          };
          
          // Only include id if it was provided in the request
          if (request.id !== undefined) {
            response.id = request.id;
          }

          res.json(response);
          return;
        }

        if (request.method === 'tools/call') {
          const { name, arguments: args } = request.params;
          console.log(`🎯 [HTTP] Tool call: ${name}`, args);

          let result: any;
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

            const successResponse: any = {
              jsonrpc: '2.0',
              result: {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
              }
            };
            
            // Only include id if it was provided in the request
            if (request.id !== undefined) {
              successResponse.id = request.id;
            }
            
            res.json(successResponse);
          } catch (error) {
            console.error('❌ [HTTP] Tool execution error:', error);
            
            const errorResponse: any = {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : 'Internal error',
                data: { tool: name, args }
              }
            };
            
            // Only include id if it was provided in the request
            if (request.id !== undefined) {
              errorResponse.id = request.id;
            }
            
            res.json(errorResponse);
          }
          return;
        }

        const methodNotFoundResponse: any = {
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' }
        };
        
        // Only include id if it was provided in the request
        if (request.id !== undefined) {
          methodNotFoundResponse.id = request.id;
        }
        
        res.status(400).json(methodNotFoundResponse);

      } catch (error) {
        console.error('❌ [HTTP] Request parsing error:', error);
        res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' }
        });
      }
    });
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Start periodic cleanup of stale connections
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Clean up every 30 seconds

    // Handle main namespace connections
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

    // Handle /tools namespace connections (for Next.js MCP client)
    const toolsNamespace = this.io.of('/tools');
    toolsNamespace.on('connection', (socket) => {
      console.log(`🔌 [TOOLS] Client connected to tools namespace: ${socket.id}`);
      console.log(`🔌 [TOOLS] Total clients connected: ${this.nextjsClients.size}`);
      
      // Auto-register Next.js clients in the tools namespace
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

  /**
   * Clean up stale connections by testing socket connectivity
   */
  private cleanupStaleConnections(): void {
    console.log('🧹 [CLEANUP] Starting stale connection cleanup...');
    const staleConnections: string[] = [];
    
    for (const [socketId, socket] of this.nextjsClients.entries()) {
      if (!socket.connected) {
        console.log(`🗑️ [CLEANUP] Found stale connection: ${socketId} (connected: ${socket.connected})`);
        staleConnections.push(socketId);
      }
    }
    
    // Remove stale connections
    staleConnections.forEach(socketId => {
      this.nextjsClients.delete(socketId);
      console.log(`🗑️ [CLEANUP] Removed stale connection: ${socketId}`);
    });
    
    if (staleConnections.length > 0) {
      console.log(`🧹 [CLEANUP] Cleaned up ${staleConnections.length} stale connections`);
      console.log(`✅ [CLEANUP] Active clients after cleanup:`, Array.from(this.nextjsClients.keys()));
    } else {
      console.log('✅ [CLEANUP] No stale connections found');
    }
  }

  /**
   * Get the best available client (most recently connected)
   */
  private getBestAvailableClient(): Socket | null {
    // Clean up stale connections first
    this.cleanupStaleConnections();
    
    if (this.nextjsClients.size === 0) {
      console.log('❌ [CLIENT] No clients available');
      return null;
    }
    
    // Get all connected clients
    const connectedClients = Array.from(this.nextjsClients.entries())
      .filter(([_, socket]) => socket.connected)
      .map(([id, socket]) => ({ id, socket }));
    
    if (connectedClients.length === 0) {
      console.log('❌ [CLIENT] No connected clients available');
      return null;
    }
    
    // Use the most recently connected client (last in the map)
    const bestClient = connectedClients[connectedClients.length - 1];
    console.log(`✅ [CLIENT] Selected best available client: ${bestClient.id}`);
    console.log(`✅ [CLIENT] Client is connected: ${bestClient.socket.connected}`);
    
    return bestClient.socket;
  }

  // Tool implementation methods
  private async getCurrentPage(sessionId?: string): Promise<PageInfo> {
    console.log(`🔍 [getCurrentPage] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}`);
    
    return new Promise((resolve, reject) => {
      // First try to get the specific client, then fallback to best available
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

      const handler = (pageInfo: PageInfo) => {
        console.log(`📥 [getCurrentPage] Received response from client:`, pageInfo);
        clearTimeout(timeout);
        socket.off('mcp:pageInfo', handler);
        resolve(pageInfo);
      };

      socket.on('mcp:pageInfo', handler);
      socket.emit('mcp:getCurrentPage');
    });
  }

  private async getElements(sessionId?: string, elementType: 'clickable' | 'input' | 'all' = 'clickable'): Promise<ClickableElement[]> {
    console.log(`🔍 [getElements] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, elementType: ${elementType}`);
    
    return new Promise((resolve, reject) => {
      // First try to get the specific client, then fallback to best available
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

      const handler = (response: { elements: ClickableElement[], elementType: string }) => {
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

  private async getClickableElements(sessionId?: string): Promise<ClickableElement[]> {
    console.log(`🔍 [getClickableElements] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}`);
    
    return new Promise((resolve, reject) => {
      // First try to get the specific client, then fallback to best available
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

      const handler = (elements: ClickableElement[]) => {
        console.log(`📥 [getClickableElements] Received response from client:`, elements);
        clearTimeout(timeout);
        socket.off('mcp:clickableElements', handler);
        resolve(elements);
      };

      socket.on('mcp:clickableElements', handler);
      socket.emit('mcp:getClickableElements');
    });
  }

  private async clickElement(sessionId: string | undefined, elementName: string): Promise<ClickResult> {
    console.log(`🔍 [clickElement] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, element: ${elementName}`);
    
    return new Promise((resolve, reject) => {
      // First try to get the specific client, then fallback to best available
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

      const handler = (result: ClickResult) => {
        console.log(`📥 [clickElement] Received response from client:`, result);
        clearTimeout(timeout);
        socket.off('mcp:clickResult', handler);
        resolve(result);
      };

      socket.on('mcp:clickResult', handler);
      socket.emit('mcp:clickElement', elementName);
    });
  }

  private async fillInput(sessionId: string | undefined, inputName: string, value: string, inputType: string = 'text'): Promise<FillInputResult> {
    console.log(`🔍 [fillInput] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, input: ${inputName}, value: ${value}, type: ${inputType}`);
    
    return new Promise((resolve, reject) => {
      // First try to get the specific client, then fallback to best available
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

      const handler = (result: FillInputResult) => {
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

  private async navigatePage(sessionId: string | undefined, page: string): Promise<NavigationResult> {
    console.log(`🔍 [navigatePage] Starting${sessionId ? ` for sessionId: ${sessionId}` : ' with best available client'}, page: ${page}`);
    
    return new Promise((resolve, reject) => {
      // First try to get the specific client, then fallback to best available
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

      const handler = (result: NavigationResult) => {
        console.log(`📥 [navigatePage] Received response from client:`, result);
        clearTimeout(timeout);
        socket.off('mcp:navigationResult', handler);
        resolve(result);
      };

      socket.on('mcp:navigationResult', handler);
      socket.emit('mcp:navigatePage', page);
    });
  }

  public start(port: number = 3001): void {
    this.setupSocketIO();
    
    this.httpServer.listen(port, () => {
      console.log(`🚀 Streamable MCP Server running on port ${port}`);
      console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`🔌 Socket.io endpoint: http://localhost:${port}`);
      console.log(`🛠️ Tools namespace: http://localhost:${port}/tools`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
    });
  }

  public async stop(): Promise<void> {
    if (this.io) {
      this.io.close();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    console.log('🛑 Streamable MCP Server stopped');
  }
}

// Initialize and start server
const mcpServer = new StreamableMCPServer();

// Handle graceful shutdown
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

// Start the server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
mcpServer.start(PORT);
