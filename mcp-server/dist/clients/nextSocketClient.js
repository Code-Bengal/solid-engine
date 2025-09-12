import { Server as SocketIOServer } from 'socket.io';
let io;
const connectedClients = new Map();
export function initializeSocketIO(httpServer) {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/socket.io'
    });
    io.on('connection', (socket) => {
        console.log(`✅ Next.js app connected via socket.io: ${socket.id}`);
        connectedClients.set(socket.id, socket);
        socket.on('register-client', (data) => {
            if (data.sessionId) {
                connectedClients.set(data.sessionId, socket);
                socket.join(data.sessionId);
                console.log(`📝 Client registered with session ID: ${data.sessionId}`);
            }
        });
        socket.on('mcp-request', async (data) => {
            console.log(`📥 Received MCP request from frontend:`, data);
            try {
                const response = await processMCPRequest(data.method, data.params, data.sessionId);
                socket.emit('mcp-response', {
                    requestId: data.requestId,
                    response: response
                });
            }
            catch (error) {
                console.error('❌ Error processing MCP request:', error);
                socket.emit('mcp-error', {
                    requestId: data.requestId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        socket.on('frontend-response', (data) => {
            console.log(`📤 Received response from frontend:`, data);
            handleFrontendResponse(data);
        });
        socket.on('disconnect', () => {
            console.log(`❌ Next.js frontend disconnected: ${socket.id}`);
            connectedClients.delete(socket.id);
            for (const [sessionId, clientSocket] of connectedClients.entries()) {
                if (clientSocket.id === socket.id) {
                    connectedClients.delete(sessionId);
                    break;
                }
            }
        });
    });
    return io;
}
const pendingRequests = new Map();
export function sendRequestToFrontend(method, params, sessionId, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        if (!io) {
            reject(new Error('Socket.io not initialized'));
            return;
        }
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        pendingRequests.set(requestId, { resolve, reject, timeout });
        const requestData = { method, params, requestId };
        if (sessionId && connectedClients.has(sessionId)) {
            connectedClients.get(sessionId).emit('frontend-request', requestData);
        }
        else {
            io.emit('frontend-request', requestData);
        }
        console.log(`📡 Sent request to frontend:`, requestData);
    });
}
function handleFrontendResponse(data) {
    const pendingRequest = pendingRequests.get(data.requestId);
    if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        pendingRequests.delete(data.requestId);
        if (data.error) {
            pendingRequest.reject(new Error(data.error));
        }
        else {
            pendingRequest.resolve(data.result);
        }
    }
}
async function processMCPRequest(method, params, sessionId) {
    console.log(`🔄 Processing MCP request: ${method}`, params);
    return await sendRequestToFrontend(method, params, sessionId);
}
export function emitToFrontend(event, payload, sessionId) {
    if (!io) {
        console.warn('⚠️ Socket.io not initialized, cannot emit to frontend');
        return;
    }
    if (sessionId && connectedClients.has(sessionId)) {
        connectedClients.get(sessionId).emit(event, payload);
    }
    else {
        io.emit(event, payload);
    }
    console.log(`📡 Emitted to frontend: ${event}`, payload);
}
export function getConnectedClientsCount() {
    return connectedClients.size;
}
export function isSessionConnected(sessionId) {
    return connectedClients.has(sessionId);
}
//# sourceMappingURL=nextSocketClient.js.map