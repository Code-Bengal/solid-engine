import { Router } from 'express';
import { ToolHandlerMap } from './toolRoutes.js';
import { StreamableHTTPTransport } from '../transports/streamableHttpTransport.js';
export interface RouteConfig {
    mcpTransport: StreamableHTTPTransport;
    toolHandlers: ToolHandlerMap;
}
export declare function createAllRoutes(config: RouteConfig): Router;
export { createMCPRoutes } from './mcpRoutes.js';
export { createToolRoutes, type ToolHandlerMap } from './toolRoutes.js';
export { createSystemRoutes, createSessionRoutes } from './systemRoutes.js';
//# sourceMappingURL=index.d.ts.map