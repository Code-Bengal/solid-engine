// Streamable MCP Socket Client for Next.js Integration
// This client connects to the streamable HTTP MCP server via Socket.io

import { io, Socket } from 'socket.io-client';
import { 
  getCurrentPage, 
  getElements, 
  clickElement, 
  fillInput, 
  navigatePage
} from './mcpElementCollector';
import { logMCPEvent } from './mcpErrorHandling';

export interface StreamableMCPClient {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getSessionId(): string;
  sendMCPRequest(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

class StreamableMCPSocketClient implements StreamableMCPClient {
  private socket: Socket | null = null;
  private sessionId: string;
  private serverUrl: string;

  constructor(serverUrl: string = process.env.NEXT_MCP_URL || 'http://localhost:3001', sessionId?: string) {
    this.serverUrl = serverUrl;
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logMCPEvent('info', 'StreamableMCPSocketClient initialized', {
      serverUrl: this.serverUrl,
      sessionId: this.sessionId
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to the /tools namespace
        this.socket = io(`${this.serverUrl}/tools`, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to streamable MCP server tools namespace');
          
          // Register as Next.js client
          this.socket!.emit('register:nextjs');
          
          this.setupMCPHandlers();
          logMCPEvent('info', 'Connected to streamable MCP server', { sessionId: this.sessionId });
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Failed to connect to streamable MCP server:', error);
          logMCPEvent('error', 'Failed to connect to streamable MCP server', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`❌ Disconnected from streamable MCP server: ${reason}`);
          logMCPEvent('warn', 'Disconnected from streamable MCP server', { reason });
        });

      } catch (error) {
        console.error('❌ Error creating socket connection:', error);
        reject(error);
      }
    });
  }

  private setupMCPHandlers(): void {
    if (!this.socket) return;

    // Handle MCP tool requests from server
    this.socket.on('mcp:getCurrentPage', async () => {
      console.log('📥 Received getCurrentPage request');
      try {
        const pageInfo = await getCurrentPage();
        this.socket!.emit('mcp:pageInfo', pageInfo);
      } catch (error) {
        console.error('❌ Error getting current page:', error);
        this.socket!.emit('mcp:pageInfo', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.socket.on('mcp:getClickableElements', async () => {
      console.log('📥 Received getClickableElements request');
      try {
        const elements = await getElements();
        this.socket!.emit('mcp:clickableElements', elements);
      } catch (error) {
        console.error('❌ Error getting clickable elements:', error);
        this.socket!.emit('mcp:clickableElements', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.socket.on('mcp:clickElement', async (elementName: string) => {
      console.log('📥 Received clickElement request:', elementName);
      try {
        const result = await clickElement(elementName);
        this.socket!.emit('mcp:clickResult', result);
      } catch (error) {
        console.error('❌ Error clicking element:', error);
        this.socket!.emit('mcp:clickResult', { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.socket.on('mcp:fillInput', async (data: { name: string; value: string; type?: string }) => {
      console.log('📥 Received fillInput request:', data);
      try {
        const inputType = data.type || 'text'; // Default to 'text' if type not provided
        const result = await fillInput(data.name, inputType, data.value);
        this.socket!.emit('mcp:fillInputResult', result);
      } catch (error) {
        console.error('❌ Error filling input:', error);
        this.socket!.emit('mcp:fillInputResult', { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.socket.on('mcp:navigatePage', async (page: string) => {
      console.log('📥 Received navigatePage request:', page);
      try {
        const result = await navigatePage(page);
        this.socket!.emit('mcp:navigationResult', result);
      } catch (error) {
        console.error('❌ Error navigating page:', error);
        this.socket!.emit('mcp:navigationResult', { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      logMCPEvent('info', 'Disconnected from streamable MCP server');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async sendMCPRequest(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected()) {
        reject(new Error('Not connected to MCP server'));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up response handler
        const responseHandler = (response: unknown) => {
          if (
            typeof response === 'object' &&
            response !== null &&
            'requestId' in response &&
            (response as { requestId?: string }).requestId === requestId
          ) {
            this.socket!.off(`mcp:response:${method}`, responseHandler);
            if ('error' in response && typeof (response as { error?: unknown }).error === 'string') {
              reject(new Error((response as { error?: string }).error!));
            } else if ('result' in response) {
              resolve((response as { result?: unknown }).result);
            } else {
              resolve(undefined);
            }
          }
        };

      // Listen for response
      this.socket.on(`mcp:response:${method}`, responseHandler);

      // Send the request
      this.socket.emit('mcp:request', {
        id: requestId,
        method,
        params
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        this.socket!.off(`mcp:response:${method}`, responseHandler);
        reject(new Error(`Request timeout for method: ${method}`));
      }, 30000);
    });
  }
}

// Export singleton instance
let clientInstance: StreamableMCPSocketClient | null = null;

export function getStreamableMCPClient(serverUrl?: string, sessionId?: string): StreamableMCPClient {
  if (!clientInstance) {
    clientInstance = new StreamableMCPSocketClient(serverUrl, sessionId);
  }
  return clientInstance;
}

export function resetStreamableMCPClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}

export default StreamableMCPSocketClient;
