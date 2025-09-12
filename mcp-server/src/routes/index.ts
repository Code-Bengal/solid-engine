// Main router index - aggregates all route modules
import { Router } from 'express';
import { createMCPRoutes } from './mcpRoutes.js';
import { createToolRoutes, ToolHandlerMap } from './toolRoutes.js';
import { createSystemRoutes, createSessionRoutes } from './systemRoutes.js';
import { StreamableHTTPTransport } from '../transports/streamableHttpTransport.js';

export interface RouteConfig {
  mcpTransport: StreamableHTTPTransport;
  toolHandlers: ToolHandlerMap;
}

export function createAllRoutes(config: RouteConfig): Router {
  const router = Router();

  // System routes (health, info, notifications)
  router.use('/', createSystemRoutes());

  // Session management routes
  router.use('/sessions', createSessionRoutes());

  // MCP protocol routes
  router.use('/mcp', createMCPRoutes(config.mcpTransport));

  // Individual tool routes (REST-style)
  router.use('/mcp/tools', createToolRoutes(config.toolHandlers));

  return router;
}

// Export individual route creators and types
export { createMCPRoutes } from './mcpRoutes.js';
export { createToolRoutes, type ToolHandlerMap } from './toolRoutes.js';
export { createSystemRoutes, createSessionRoutes } from './systemRoutes.js';
