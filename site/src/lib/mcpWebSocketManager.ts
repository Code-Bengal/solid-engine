// WebSocket connection manager for MCP integration
// Handles real-time communication with MCP server

import { io, Socket } from 'socket.io-client';
import { 
  getClickableElements, 
  getElements,
  clickElement,
  fillInput,
  getCurrentPage, 
  navigatePage,
  initElementCollector,
  cleanupElementCollector,
  type MCPResult
} from './mcpElementCollector';
import {
  createMCPError,
  logMCPEvent,
  withErrorHandling,
  mcpRateLimiter
} from './mcpErrorHandling';

export interface MCPSocketManager {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  connect: () => Promise<MCPResult<boolean>>;
  disconnect: () => void;
  reconnect: () => Promise<MCPResult<boolean>>;
}

class MCPWebSocketManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private connectionTimeout: number = 10000; // 10 seconds
  private connectionStatusInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupElementCollector();
  }

  /**
   * Initialize the element collector system
   */
  private async setupElementCollector(): Promise<void> {
    try {
      const result = await initElementCollector();
      if (result.success) {
        logMCPEvent('info', 'Element collector initialized', result.data);
      } else {
        logMCPEvent('error', 'Failed to initialize element collector', result.error);
      }
    } catch (error) {
      logMCPEvent('error', 'Failed to setup element collector', error);
    }
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<MCPResult<boolean>> {
    if (!mcpRateLimiter.canProceed('connect')) {
      return {
        success: false,
        error: createMCPError('TIMEOUT_ERROR', 'Rate limit exceeded for connection attempts').toJSON()
      };
    }

    const performConnection = async (): Promise<boolean> => {
      // Handle production vs development URLs
      let baseUrl = process.env.NEXT_PUBLIC_MCP_SOCKET_URL;
      
      console.log('🌐 [MCP Debug] Environment variable NEXT_PUBLIC_MCP_SOCKET_URL:', baseUrl);
      console.log('🌐 [MCP Debug] Current window.location.hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined (SSR)');
      console.log('🌐 [MCP Debug] Current window.location.href:', typeof window !== 'undefined' ? window.location.href : 'undefined (SSR)');
      
      if (!baseUrl) {
        console.log('🌐 [MCP Debug] No environment variable found, auto-detecting environment...');
        // Auto-detect production environment
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            baseUrl = 'http://localhost:3001';
            console.log('🌐 [MCP Debug] Detected localhost environment, using:', baseUrl);
          } else {
            // Production - use your deployed MCP server URL
            baseUrl = 'https://mcp-server.codebengal25.workers.dev';
            console.log('🌐 [MCP Debug] Detected production environment, using:', baseUrl);
          }
        } else {
          baseUrl = 'http://localhost:3001';
          console.log('🌐 [MCP Debug] SSR detected, defaulting to:', baseUrl);
        }
      } else {
        console.log('🌐 [MCP Debug] Using environment variable value:', baseUrl);
      }
      
      const socketUrl = `${baseUrl}/tools`; // Connect to /tools namespace
      console.log('🔗 [MCP Debug] Final socket URL:', socketUrl);
      console.log('🔗 [MCP Debug] Socket.io connection options:', {
        transports: ['websocket', 'polling'],
        timeout: this.connectionTimeout,
        reconnection: false,
        autoConnect: false
      });
      
      logMCPEvent('info', `Connecting to MCP server at ${socketUrl}`);
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: this.connectionTimeout,
        reconnection: false, // We handle reconnection manually
        autoConnect: false
      });

      this.setupEventHandlers();

      // Connect with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(createMCPError('CONNECTION_FAILED', 'Connection timeout'));
        }, this.connectionTimeout);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.connectionError = null;
          this.reconnectAttempts = 0;
          logMCPEvent('info', 'Successfully connected to MCP server');
          this.startConnectionStatusLogger();
          resolve(true);
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(createMCPError('CONNECTION_FAILED', `Connection failed: ${error.message}`, error));
        });

        this.socket!.connect();
      });
    };

    return withErrorHandling(performConnection, 'CONNECTION_FAILED')();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      logMCPEvent('info', 'Connected to MCP server');
      console.log('🔌 [MCP Debug] Connected to MCP server');
      console.log('🔌 [MCP Debug] Socket ID:', this.socket?.id);
      console.log('🔌 [MCP Debug] Socket connected:', this.socket?.connected);
      console.log('🔌 [MCP Debug] Connection timestamp:', new Date().toISOString());
      console.log('🔌 [MCP Debug] User agent:', navigator.userAgent);
      
      this.isConnected = true;
      this.connectionError = null;
      this.reconnectAttempts = 0;
      
      // Register as Next.js client
      console.log('📝 [MCP Debug] Emitting register:nextjs event with socket ID:', this.socket?.id);
      this.socket!.emit('register:nextjs', {
        socketId: this.socket?.id,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      logMCPEvent('info', 'Registered as Next.js client');
      console.log('✅ [MCP Debug] register:nextjs event sent with metadata');
      
      // Send initial page data
      this.sendCurrentPageInfo();
      
      // Set up page change detection
      this.setupPageChangeDetection();
      
      // Start periodic connection status logging
      this.startConnectionStatusLogger();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [MCP Debug] Disconnected from MCP server');
      console.log('❌ [MCP Debug] Socket ID:', this.socket?.id);
      console.log('❌ [MCP Debug] Socket connected:', this.socket?.connected);
      console.log('❌ [MCP Debug] Disconnect reason:', reason);
      console.log('❌ [MCP Debug] Disconnect timestamp:', new Date().toISOString());
      
      logMCPEvent('warn', 'Disconnected from MCP server', { 
        reason, 
        socketId: this.socket?.id
      });
      this.isConnected = false;
      this.connectionError = `Disconnected: ${reason}`;
      this.stopConnectionStatusLogger();
    });

    this.socket.on('connect_error', (error) => {
      logMCPEvent('error', 'Connection error', error);
      this.isConnected = false;
      this.connectionError = error.message;
    });

    // MCP command handlers - using correct MCP event names
    
    this.socket.on('mcp:getCurrentPage', () => {
      console.log('📍 [MCP Debug] Received mcp:getCurrentPage request');
      console.log('📍 [MCP Debug] Current socket ID:', this.socket?.id);
      const pageInfo = getCurrentPage();
      console.log('📍 [MCP Debug] Collected page info:', pageInfo);
      console.log('📍 [MCP Debug] Sending mcp:pageInfo response:', pageInfo);
      
      this.socket!.emit('mcp:pageInfo', {
        url: pageInfo.url,
        title: pageInfo.title,
        path: pageInfo.path,
        socketId: this.socket?.id,
        timestamp: new Date().toISOString()
      });
      console.log('📍 [MCP Debug] ✅ mcp:pageInfo response sent successfully from socket:', this.socket?.id);
    });
    
    // New generic getElements handler
    this.socket.on('mcp:getElements', async (elementType: 'clickable' | 'input' | 'all' = 'clickable') => {
      console.log(`🔍 [MCP Debug] Received mcp:getElements request for type: ${elementType}`);
      console.log('🔍 [MCP Debug] Current socket ID:', this.socket?.id);
      const result = await getElements(elementType);
      console.log('🔍 [MCP Debug] Element collection result:', result);
      
      if (result.success) {
        console.log(`🔍 [MCP Debug] Sending mcp:elements response with ${result.data?.length} elements`);
        console.log('🔍 [MCP Debug] Elements data:', result.data);
        this.socket!.emit('mcp:elements', {
          elements: result.data || [],
          elementType: elementType,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });
        console.log(`🔍 [MCP Debug] ✅ mcp:elements response sent successfully from socket: ${this.socket?.id}`);
      } else {
        console.error('❌ [MCP Debug] getElements failed:', result.error);
        this.socket!.emit('mcp:elements', {
          elements: [],
          elementType: elementType,
          error: result.error?.message,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });
        console.log(`🔍 [MCP Debug] ❌ Sent empty array due to error from socket: ${this.socket?.id}`);
      }
    });

    // Backward compatibility - keep existing getClickableElements handler
    this.socket.on('mcp:getClickableElements', async () => {
      console.log('🔍 [MCP Debug] Received mcp:getClickableElements request');
      console.log('🔍 [MCP Debug] Current socket ID:', this.socket?.id);
      const result = await getClickableElements();
      console.log('🔍 [MCP Debug] Element collection result:', result);
      
      if (result.success) {
        console.log('🔍 [MCP Debug] Sending mcp:clickableElements response with', result.data?.length, 'elements');
        console.log('🔍 [MCP Debug] Elements data:', result.data);
        this.socket!.emit('mcp:clickableElements', {
          elements: result.data || [],
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });
        console.log('🔍 [MCP Debug] ✅ mcp:clickableElements response sent successfully from socket:', this.socket?.id);
      } else {
        console.error('❌ [MCP Debug] getClickableElements failed:', result.error);
        this.socket!.emit('mcp:clickableElements', {
          elements: [],
          error: result.error?.message,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });
        console.log('🔍 [MCP Debug] ❌ Sent empty array due to error from socket:', this.socket?.id);
      }
    });

    this.socket.on('mcp:clickElement', async (elementName: string) => {
      console.log('🖱️ [MCP Debug] Received mcp:clickElement request:', elementName);
      console.log('🖱️ [MCP Debug] Current socket ID:', this.socket?.id);
      const result = await clickElement(elementName);
      console.log('🖱️ [MCP Debug] Click element result:', result);
      
      if (result.success && result.data) {
        console.log('🖱️ [MCP Debug] Sending mcp:clickResult success response');
        const response = {
          success: true,
          currentPage: {
            url: result.data.currentPage.url,
            title: result.data.currentPage.title,
            path: result.data.currentPage.path
          },
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        };
        console.log('🖱️ [MCP Debug] Response data:', response);
        this.socket!.emit('mcp:clickResult', response);
        console.log('🖱️ [MCP Debug] ✅ mcp:clickResult success response sent from socket:', this.socket?.id);
      } else {
        console.error('❌ [MCP Debug] clickElement failed:', result.error);
        const errorResponse = {
          success: false,
          error: result.error?.message || 'Click failed',
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        };
        console.log('🖱️ [MCP Debug] Error response data:', errorResponse);
        this.socket!.emit('mcp:clickResult', errorResponse);
        console.log('🖱️ [MCP Debug] ❌ mcp:clickResult error response sent from socket:', this.socket?.id);
      }
    });

    this.socket.on('mcp:navigatePage', async (page: string) => {
      console.log('🧭 [MCP Debug] Received mcp:navigatePage request:', page);
      console.log('🧭 [MCP Debug] Current socket ID:', this.socket?.id);
      const result = await navigatePage(page);
      console.log('🧭 [MCP Debug] Navigate page result:', result);
      
      if (result.success && result.data) {
        console.log('🧭 [MCP Debug] Sending mcp:navigationResult success response');
        const response = {
          success: true,
          currentPage: {
            url: result.data.url,
            title: result.data.title,
            path: result.data.path
          },
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        };
        console.log('🧭 [MCP Debug] Response data:', response);
        this.socket!.emit('mcp:navigationResult', response);
        console.log('🧭 [MCP Debug] ✅ mcp:navigationResult success response sent from socket:', this.socket?.id);
      } else {
        console.error('❌ [MCP Debug] navigatePage failed:', result.error);
        const errorResponse = {
          success: false,
          error: result.error?.message || 'Navigation failed',
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        };
        console.log('🧭 [MCP Debug] Error response data:', errorResponse);
        this.socket!.emit('mcp:navigationResult', errorResponse);
        console.log('🧭 [MCP Debug] ❌ mcp:navigationResult error response sent from socket:', this.socket?.id);
      }
    });

    this.socket.on('mcp:fillInput', async (params: { name: string, value: string | boolean, type: string }) => {
      console.log('📝 [MCP Debug] Received mcp:fillInput request:', params);
      console.log('📝 [MCP Debug] Received params type:', typeof params);
      console.log('📝 [MCP Debug] Received params keys:', Object.keys(params || {}));
      console.log('📝 [MCP Debug] Received params values:', Object.values(params || {}));
      console.log('📝 [MCP Debug] Current socket ID:', this.socket?.id);
      
      const { name: inputName, value: data, type: inputType } = params || {};
      console.log('📝 [MCP Debug] Extracted params:', { inputName, inputType, data });
      
      const result = await fillInput(inputName, inputType, data);
      console.log('📝 [MCP Debug] Fill input result:', result);
      
      if (result.success && result.data) {
        console.log('📝 [MCP Debug] Sending mcp:fillInputResult success response');
        const response = {
          success: true,
          inputName: inputName,
          message: result.data.message,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        };
        console.log('📝 [MCP Debug] Response data:', response);
        this.socket!.emit('mcp:fillInputResult', response);
        console.log('📝 [MCP Debug] ✅ mcp:fillInputResult success response sent from socket:', this.socket?.id);
      } else {
        console.error('❌ [MCP Debug] fillInput failed:', result.error);
        const errorResponse = {
          success: false,
          inputName: inputName,
          error: result.error?.message || 'Fill input failed',
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        };
        console.log('📝 [MCP Debug] Error response data:', errorResponse);
        this.socket!.emit('mcp:fillInputResult', errorResponse);
        console.log('📝 [MCP Debug] ❌ mcp:fillInputResult error response sent from socket:', this.socket?.id);
      }
    });

    this.socket.on('mcp:fillBookingForm', async (formData: Record<string, unknown>) => {
      console.log('📝 [MCP Debug] Received mcp:fillBookingForm request:', formData);
      // TODO: Implement form filling logic
      const response = {
        success: true,
        message: 'Form filling not yet implemented',
        formData: formData
      };
      console.log('📝 [MCP Debug] Response data:', response);
      this.socket!.emit('mcp:bookingFormResult', response);
      console.log('📝 [MCP Debug] ✅ mcp:bookingFormResult response sent');
    });

    logMCPEvent('debug', 'Event handlers setup complete');
  }

  /**
   * Send current page information to server
   */
  private sendCurrentPageInfo(): void {
    if (!this.socket || !this.isConnected) return;

    try {
      const pageInfo = getCurrentPage();
      console.log('📍 MCP Debug: Sending current page info to server:', pageInfo);
      
      this.socket.emit('currentPageData', {
        currentPage: pageInfo.path,
        title: pageInfo.title,
        url: pageInfo.url
      });
      
      logMCPEvent('debug', 'Current page info sent to server', pageInfo);
    } catch (error) {
      logMCPEvent('error', 'Failed to send current page info', error);
    }
  }

  /**
   * Set up page change detection
   */
  private setupPageChangeDetection(): void {
    if (typeof window === 'undefined') return;

    let currentPath = window.location.pathname;
    
    // Listen for popstate (back/forward button)
    window.addEventListener('popstate', () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        currentPath = newPath;
        console.log('🧭 MCP Debug: Page changed via popstate to:', newPath);
        setTimeout(() => this.sendCurrentPageInfo(), 100); // Small delay to ensure page is updated
      }
    });

    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(state: unknown, title: string, url?: string | URL | null) {
      originalPushState.call(history, state, title, url);
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        currentPath = newPath;
        console.log('🧭 MCP Debug: Page changed via pushState to:', newPath);
        setTimeout(() => {
          if (mcpWebSocketManager.getStatus().isConnected) {
            mcpWebSocketManager.getStatus().socket?.emit('currentPageData', {
              currentPage: window.location.pathname,
              title: document.title,
              url: window.location.href
            });
          }
        }, 100);
      }
    };

    history.replaceState = function(state: unknown, title: string, url?: string | URL | null) {
      originalReplaceState.call(history, state, title, url);
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        currentPath = newPath;
        console.log('🧭 MCP Debug: Page changed via replaceState to:', newPath);
        setTimeout(() => {
          if (mcpWebSocketManager.getStatus().isConnected) {
            mcpWebSocketManager.getStatus().socket?.emit('currentPageData', {
              currentPage: window.location.pathname,
              title: document.title,
              url: window.location.href
            });
          }
        }, 100);
      }
    };

    // Also check periodically in case we miss something
    setInterval(() => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        currentPath = newPath;
        console.log('🧭 MCP Debug: Page changed detected via interval to:', newPath);
        this.sendCurrentPageInfo();
      }
    }, 1000); // Check every second
  }

  /**
   * Send page update with elements (legacy method)
   */
  private async sendPageInfo(): Promise<void> {
    if (!this.socket || !this.isConnected) return;

    try {
      const pageInfo = getCurrentPage();
      const elementsResult = await getClickableElements();
      
      this.socket.emit('pageUpdate', {
        pageInfo,
        elements: elementsResult.success ? elementsResult.data : [],
        timestamp: new Date().toISOString()
      });
      
      logMCPEvent('debug', 'Page info sent to server', { pageInfo, elementCount: elementsResult.data?.length || 0 });
    } catch (error) {
      logMCPEvent('error', 'Failed to send page info', error);
    }
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    if (this.socket) {
      logMCPEvent('info', 'Disconnecting from MCP server');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.connectionError = null;
    this.reconnectAttempts = 0;
    
    // Cleanup element collector
    cleanupElementCollector();
    this.stopConnectionStatusLogger();
  }

  /**
   * Reconnect to MCP server with exponential backoff
   */
  async reconnect(): Promise<MCPResult<boolean>> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return {
        success: false,
        error: createMCPError('CONNECTION_FAILED', 'Maximum reconnection attempts exceeded').toJSON()
      };
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logMCPEvent('info', `Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, { delay });
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Disconnect existing connection
    this.disconnect();
    
    // Attempt new connection
    return this.connect();
  }

  /**
   * Get current connection status
   */
  getStatus(): MCPSocketManager {
    return {
      socket: this.socket,
      isConnected: this.isConnected,
      connectionError: this.connectionError,
      connect: this.connect.bind(this),
      disconnect: this.disconnect.bind(this),
      reconnect: this.reconnect.bind(this)
    };
  }

  /**
   * Send a test message to verify connection
   */
  async testConnection(): Promise<MCPResult<boolean>> {
    const testConnection = async (): Promise<boolean> => {
      if (!this.socket || !this.isConnected) {
        throw createMCPError('CONNECTION_FAILED', 'Socket not connected');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(createMCPError('TIMEOUT_ERROR', 'Test connection timeout'));
        }, 5000);

        this.socket!.emit('ping', (response: { success?: boolean }) => {
          clearTimeout(timeout);
          if (response?.success) {
            resolve(true);
          } else {
            reject(createMCPError('SOCKET_ERROR', 'Invalid ping response'));
          }
        });
      });
    };

    return withErrorHandling(testConnection, 'SOCKET_ERROR')();
  }

  /**
   * Start periodic connection status logging
   */
  private startConnectionStatusLogger(): void {
    if (this.connectionStatusInterval) {
      clearInterval(this.connectionStatusInterval);
    }

    this.connectionStatusInterval = setInterval(() => {
      if (this.socket) {
        console.log('🔄 [MCP Connection Status]');
        console.log('   ├─ Socket ID:', this.socket.id);
        console.log('   ├─ Connected:', this.socket.connected);
        console.log('   ├─ Connection State:', this.isConnected);
        console.log('   ├─ Transport:', this.socket.io?.engine?.transport?.name || 'unknown');
        console.log('   └─ Timestamp:', new Date().toISOString());
      } else {
        console.log('🔄 [MCP Connection Status] No socket connection');
      }
    }, 10000); // Log every 10 seconds
  }

  /**
   * Stop periodic connection status logging
   */
  private stopConnectionStatusLogger(): void {
    if (this.connectionStatusInterval) {
      clearInterval(this.connectionStatusInterval);
      this.connectionStatusInterval = null;
    }
  }
}

// Export singleton instance
export const mcpWebSocketManager = new MCPWebSocketManager();
export default mcpWebSocketManager;
