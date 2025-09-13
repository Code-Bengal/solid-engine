/**
 * Cloudflare Worker entry point for MCP Server
 * This is a simplified version that works with Workers runtime
 */

// Import MCP SDK components
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

// Import types
import { 
  PageInfo, 
  ClickableElement, 
  ClickResult, 
  NavigationResult, 
  FillInputResult 
} from './types/mcp.js';

class WorkerMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'hotel-booking-worker-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });
    
    this.setupMCPTools();
  }

  private setupMCPTools() {
    // Echo tool
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
            name: 'get_page_info',
            description: 'Get information about the current page',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to get information about'
                }
              },
              required: ['url']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'echo':
          return {
            content: [
              {
                type: 'text',
                text: `Echo: ${args?.message || 'No message provided'}`
              }
            ]
          };

        case 'get_page_info':
          // Simplified page info - in a real implementation you'd fetch and parse the page
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  url: args?.url || 'No URL provided',
                  title: 'Sample Page',
                  description: 'This is a sample page response from the Worker MCP server'
                }, null, 2)
              }
            ]
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        }
      });
    }

    // Handle health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', service: 'MCP Worker Server' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Handle MCP requests
    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const body = await request.json();
        
        // This is a simplified MCP request handler
        // In a full implementation, you'd use the MCP SDK's transport layer
        const response = await this.processMCPRequest(body);
        
        return new Response(JSON.stringify(response), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Default response
    return new Response('MCP Worker Server - Use POST /mcp for MCP requests', {
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  private async processMCPRequest(request: any) {
    // This is a simplified version - normally you'd use the MCP SDK's request processing
    if (request.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
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
            }
          ]
        }
      };
    }

    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;
      
      if (name === 'echo') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Echo: ${args?.message || 'No message provided'}`
              }
            ]
          }
        };
      }
    }

    throw new Error(`Unsupported method: ${request.method}`);
  }
}

// Export the main handler
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const server = new WorkerMCPServer();
    return server.handleRequest(request);
  },
};