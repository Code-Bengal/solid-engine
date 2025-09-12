import { Router } from 'express';
import { StreamableHTTPTransport } from '../transports/streamableHttpTransport.js';

export function createMCPRoutes(mcpTransport: StreamableHTTPTransport): Router {
  const router = Router();

  // Main MCP endpoint - JSON-RPC protocol
  router.post('/', async (req, res) => {
    await mcpTransport.handleRequest(req, res);
  });

  // Get available tools with documentation
  router.get('/tools', async (req, res) => {
    try {
      const tools = await getAvailableTools();
      res.json({
        success: true,
        tools: tools,
        documentation: {
          jsonRpc: `POST ${req.protocol}://${req.get('host')}/mcp`,
          restEndpoints: {
            echo: `POST ${req.protocol}://${req.get('host')}/mcp/tools/echo`,
            getCurrentPage: `POST ${req.protocol}://${req.get('host')}/mcp/tools/get-current-page`,
            getElements: `POST ${req.protocol}://${req.get('host')}/mcp/tools/get-elements`,
            clickElement: `POST ${req.protocol}://${req.get('host')}/mcp/tools/click-element`,
            fillInput: `POST ${req.protocol}://${req.get('host')}/mcp/tools/fill-input`,
            navigatePage: `POST ${req.protocol}://${req.get('host')}/mcp/tools/navigate-page`
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

/**
 * Get available tools with their schemas and examples
 */
async function getAvailableTools(): Promise<any[]> {
  return [
    {
      name: 'echo',
      description: 'Echo back the provided message.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The message to echo back' }
        },
        required: ['message']
      },
      examples: [
        {
          title: 'Basic Echo',
          request: { message: 'Hello, World!' },
          curl: `curl -X POST http://localhost:3000/mcp/tools/echo -H "Content-Type: application/json" -d '{"message": "Hello, World!"}'`
        }
      ]
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
      },
      examples: [
        {
          title: 'Get Current Page',
          request: {},
          curl: `curl -X POST http://localhost:3000/mcp/tools/get-current-page -H "Content-Type: application/json" -d '{}'`
        }
      ]
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
      },
      examples: [
        {
          title: 'Get All Elements',
          request: { elementType: 'all' },
          curl: `curl -X POST http://localhost:3000/mcp/tools/get-elements -H "Content-Type: application/json" -d '{"elementType": "all"}'`
        }
      ]
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
      },
      examples: [
        {
          title: 'Click Button',
          request: { elementName: 'submit-btn' },
          curl: `curl -X POST http://localhost:3000/mcp/tools/click-element -H "Content-Type: application/json" -d '{"elementName": "submit-btn"}'`
        }
      ]
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
      },
      examples: [
        {
          title: 'Fill Text Input',
          request: {
            inputName: 'user-email',
            inputType: 'email',
            data: 'test@example.com'
          },
          curl: `curl -X POST http://localhost:3000/mcp/tools/fill-input -H "Content-Type: application/json" -d '{"inputName": "user-email", "inputType": "email", "data": "test@example.com"}'`
        },
        {
          title: 'Check Checkbox',
          request: {
            inputName: 'agree-terms',
            inputType: 'checkbox',
            data: true
          },
          curl: `curl -X POST http://localhost:3000/mcp/tools/fill-input -H "Content-Type: application/json" -d '{"inputName": "agree-terms", "inputType": "checkbox", "data": true}'`
        }
      ]
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
      },
      examples: [
        {
          title: 'Navigate to Page',
          request: { page: '/booking' },
          curl: `curl -X POST http://localhost:3000/mcp/tools/navigate-page -H "Content-Type: application/json" -d '{"page": "/booking"}'`
        }
      ]
    }
  ];
}
