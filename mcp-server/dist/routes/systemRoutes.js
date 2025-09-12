import { Router } from 'express';
import { getConnectedClientsCount, isSessionConnected, emitToFrontend } from '../clients/nextSocketClient.js';
export function createSystemRoutes() {
    const router = Router();
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            connectedClients: getConnectedClientsCount(),
            timestamp: new Date().toISOString(),
            server: 'streamable-mcp-server',
            version: '1.0.0'
        });
    });
    router.get('/info', (req, res) => {
        res.json({
            name: 'hotel-booking-streamable-mcp-server',
            version: '1.0.0',
            description: 'Streamable HTTP Model Context Protocol server with Socket.io integration',
            endpoints: {
                health: '/health',
                info: '/info',
                mcp: '/mcp',
                tools: '/mcp/tools',
                sessions: '/sessions',
                notifications: '/notify-frontend'
            },
            capabilities: {
                tools: true,
                socketio: true,
                sessions: true,
                notifications: true
            },
            connectedClients: getConnectedClientsCount(),
            timestamp: new Date().toISOString()
        });
    });
    router.post('/notify-frontend', (req, res) => {
        try {
            const { message, sessionId, event = 'notification' } = req.body;
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }
            emitToFrontend(event, { message, timestamp: new Date().toISOString() }, sessionId);
            return res.json({
                success: true,
                status: 'Notification sent to frontend',
                event,
                sessionId: sessionId || 'all',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    return router;
}
export function createSessionRoutes() {
    const router = Router();
    router.get('/:sessionId/status', (req, res) => {
        const { sessionId } = req.params;
        const isConnected = isSessionConnected(sessionId);
        res.json({
            sessionId,
            connected: isConnected,
            timestamp: new Date().toISOString()
        });
    });
    router.get('/', (req, res) => {
        res.json({
            totalConnectedClients: getConnectedClientsCount(),
            timestamp: new Date().toISOString()
        });
    });
    return router;
}
//# sourceMappingURL=systemRoutes.js.map