import { Router } from 'express';
import { createMCPRoutes } from './mcpRoutes.js';
import { createToolRoutes } from './toolRoutes.js';
import { createSystemRoutes, createSessionRoutes } from './systemRoutes.js';
export function createAllRoutes(config) {
    const router = Router();
    router.use('/', createSystemRoutes());
    router.use('/sessions', createSessionRoutes());
    router.use('/mcp', createMCPRoutes(config.mcpTransport));
    router.use('/mcp/tools', createToolRoutes(config.toolHandlers));
    return router;
}
export { createMCPRoutes } from './mcpRoutes.js';
export { createToolRoutes } from './toolRoutes.js';
export { createSystemRoutes, createSessionRoutes } from './systemRoutes.js';
//# sourceMappingURL=index.js.map