import { Router } from 'express';
export function createToolRoutes(toolHandlers) {
    const router = Router();
    router.post('/echo', async (req, res) => {
        await handleRestToolCall('echo', req, res, toolHandlers);
    });
    router.post('/get-current-page', async (req, res) => {
        await handleRestToolCall('getCurrentPage', req, res, toolHandlers);
    });
    router.post('/get-elements', async (req, res) => {
        await handleRestToolCall('getElements', req, res, toolHandlers);
    });
    router.post('/click-element', async (req, res) => {
        await handleRestToolCall('clickElement', req, res, toolHandlers);
    });
    router.post('/fill-input', async (req, res) => {
        await handleRestToolCall('fillInput', req, res, toolHandlers);
    });
    router.post('/navigate-page', async (req, res) => {
        await handleRestToolCall('navigatePage', req, res, toolHandlers);
    });
    return router;
}
async function handleRestToolCall(toolName, req, res, toolHandlers) {
    try {
        console.log(`🔧 REST API call: ${toolName}`, req.body);
        if (!toolHandlers[toolName]) {
            res.status(404).json({
                success: false,
                error: `Tool '${toolName}' not found`,
                availableTools: Object.keys(toolHandlers)
            });
            return;
        }
        const handler = toolHandlers[toolName];
        const result = await handler(req.body);
        res.json({
            success: true,
            tool: toolName,
            result: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`❌ Error in REST tool call ${toolName}:`, error);
        res.status(500).json({
            success: false,
            tool: toolName,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
}
//# sourceMappingURL=toolRoutes.js.map