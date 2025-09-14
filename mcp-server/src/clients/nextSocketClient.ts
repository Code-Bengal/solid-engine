import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer;
const connectedClients: Map<string, Socket> = new Map();

export function initializeSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ,
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io'
  });

  io.on('connection', (socket: Socket) => {
    console.log(`✅ Next.js app connected via socket.io: ${socket.id}`);
    
    // Store client connection
    connectedClients.set(socket.id, socket);

    // Handle client registration with optional session ID
    socket.on('register-client', (data: { sessionId?: string }) => {
      if (data.sessionId) {
        connectedClients.set(data.sessionId, socket);
        socket.join(data.sessionId);
        console.log(`📝 Client registered with session ID: ${data.sessionId}`);
      }
    });

    // Handle MCP requests from frontend
    socket.on('mcp-request', async (data: { 
      method: string; 
      params: any; 
      requestId: string;
      sessionId?: string;
    }) => {
      console.log(`📥 Received MCP request from frontend:`, data);
      
      try {
        // Process the MCP request and get response
        const response = await processMCPRequest(data.method, data.params, data.sessionId);
        
        // Send response back to frontend
        socket.emit('mcp-response', {
          requestId: data.requestId,
          response: response
        });
      } catch (error) {
        console.error('❌ Error processing MCP request:', error);
        socket.emit('mcp-error', {
          requestId: data.requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle responses from frontend for MCP calls
    socket.on('frontend-response', (data: {
      requestId: string;
      result: any;
      error?: string;
    }) => {
      console.log(`📤 Received response from frontend:`, data);
      // This will be handled by pending requests
      handleFrontendResponse(data);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Next.js frontend disconnected: ${socket.id}`);
      connectedClients.delete(socket.id);
      
      // Remove from session-based connections too
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

// Pending requests tracking
const pendingRequests: Map<string, {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}> = new Map();

/**
 * Send a request to the frontend and wait for response
 */
export function sendRequestToFrontend(
  method: string, 
  params: any, 
  sessionId?: string,
  timeoutMs: number = 10000
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!io) {
      reject(new Error('Socket.io not initialized'));
      return;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Store pending request
    pendingRequests.set(requestId, { resolve, reject, timeout });

    // Send request to specific client or broadcast
    const requestData = { method, params, requestId };
    
    if (sessionId && connectedClients.has(sessionId)) {
      connectedClients.get(sessionId)!.emit('frontend-request', requestData);
    } else {
      // Broadcast to all connected clients
      io.emit('frontend-request', requestData);
    }

    console.log(`📡 Sent request to frontend:`, requestData);
  });
}

/**
 * Handle response from frontend
 */
function handleFrontendResponse(data: {
  requestId: string;
  result: any;
  error?: string;
}) {
  const pendingRequest = pendingRequests.get(data.requestId);
  
  if (pendingRequest) {
    clearTimeout(pendingRequest.timeout);
    pendingRequests.delete(data.requestId);
    
    if (data.error) {
      pendingRequest.reject(new Error(data.error));
    } else {
      pendingRequest.resolve(data.result);
    }
  }
}

/**
 * Process MCP requests (this will be implemented based on your tools)
 */
async function processMCPRequest(method: string, params: any, sessionId?: string): Promise<any> {
  // This function will route MCP requests to appropriate handlers
  // For now, just echo back the request
  console.log(`🔄 Processing MCP request: ${method}`, params);
  
  // Forward to frontend for actual execution
  return await sendRequestToFrontend(method, params, sessionId);
}

/**
 * Emit event to frontend
 */
export function emitToFrontend(event: string, payload: any, sessionId?: string): void {
  if (!io) {
    console.warn('⚠️ Socket.io not initialized, cannot emit to frontend');
    return;
  }

  if (sessionId && connectedClients.has(sessionId)) {
    connectedClients.get(sessionId)!.emit(event, payload);
  } else {
    io.emit(event, payload);
  }
  
  console.log(`📡 Emitted to frontend: ${event}`, payload);
}

/**
 * Get connected clients count
 */
export function getConnectedClientsCount(): number {
  return connectedClients.size;
}

/**
 * Check if a specific session is connected
 */
export function isSessionConnected(sessionId: string): boolean {
  return connectedClients.has(sessionId);
}
