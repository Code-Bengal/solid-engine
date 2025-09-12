// Enhanced MCP Provider with Streamable HTTP Support
// Supports both legacy WebSocket and new Streamable HTTP MCP servers

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import mcpWebSocketManager from '@/lib/mcpWebSocketManager';
import { getStreamableMCPClient } from '@/lib/streamableMCPClient';
import { getClickableElements, getCurrentPage } from '@/lib/mcpElementCollector';
import { logMCPEvent } from '@/lib/mcpErrorHandling';
import type { ElementInfo, PageInfo } from '@/lib/mcpElementCollector';

type MCPConnectionMode = 'websocket' | 'streamable' | 'auto';

interface MCPContextType {
  isConnected: boolean;
  connectionError: string | null;
  clickableElements: ElementInfo[];
  currentPage: PageInfo;
  isConnecting: boolean;
  lastError: string | null;
  connectionMode: MCPConnectionMode;
  actualConnectionType: 'websocket' | 'streamable' | null;
  sessionId: string | null;
  connect: (mode?: MCPConnectionMode) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  refreshElements: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  switchConnectionMode: (mode: MCPConnectionMode) => Promise<void>;
}

const MCPContext = createContext<MCPContextType | null>(null);

interface MCPProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  preferredMode?: MCPConnectionMode;
  streamableServerUrl?: string;
}

export function StreamableMCPProvider({ 
  children, 
  autoConnect = false, 
  preferredMode = 'auto',
  streamableServerUrl = 'http://localhost:3001'
}: MCPProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [clickableElements, setClickableElements] = useState<ElementInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<PageInfo>({ url: '', title: '', path: '/' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<MCPConnectionMode>(preferredMode);
  const [actualConnectionType, setActualConnectionType] = useState<'websocket' | 'streamable' | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get streamable client instance
  const streamableClient = getStreamableMCPClient(streamableServerUrl);

  // Update page info
  const updatePageInfo = useCallback(() => {
    if (typeof window !== 'undefined') {
      const pageInfo = getCurrentPage();
      setCurrentPage(pageInfo);
    }
  }, []);

  // Refresh clickable elements
  const refreshElements = useCallback(async () => {
    try {
      const result = await getClickableElements();
      if (result.success && result.data) {
        setClickableElements(result.data);
        setLastError(null);
        logMCPEvent('debug', 'Enhanced Provider: Refreshed clickable elements', { count: result.data.length });
      } else {
        setLastError(result.error?.message || 'Failed to refresh elements');
        logMCPEvent('error', 'Enhanced Provider: Failed to refresh elements', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      logMCPEvent('error', 'Enhanced Provider: Error refreshing elements', error);
    }
  }, []);

  // Test connection to determine best mode
  const testConnectionMode = useCallback(async (): Promise<'websocket' | 'streamable' | null> => {
    // First try streamable (preferred)
    try {
      await streamableClient.connect();
      if (streamableClient.isConnected()) {
        logMCPEvent('info', 'Streamable connection test successful');
        return 'streamable';
      }
    } catch (error) {
      console.log('Streamable connection test failed:', error);
      streamableClient.disconnect();
    }

    // Fallback to WebSocket
    try {
      const wsResult = await mcpWebSocketManager.connect();
      if (wsResult.success) {
        logMCPEvent('info', 'WebSocket connection test successful');
        return 'websocket';
      }
    } catch (error) {
      console.log('WebSocket connection test failed:', error);
      mcpWebSocketManager.disconnect();
    }

    logMCPEvent('error', 'Both connection modes failed');
    return null;
  }, [streamableClient]);

  // Connect using specified mode
  const connectWithMode = useCallback(async (mode: 'websocket' | 'streamable'): Promise<boolean> => {
    try {
      if (mode === 'streamable') {
        await streamableClient.connect();
        if (streamableClient.isConnected()) {
          setActualConnectionType('streamable');
          setSessionId(streamableClient.getSessionId());
          setIsConnected(true);
          setConnectionError(null);
          logMCPEvent('info', 'Connected via streamable client', { sessionId: streamableClient.getSessionId() });
          return true;
        }
      } else if (mode === 'websocket') {
        const result = await mcpWebSocketManager.connect();
        if (result.success) {
          const status = mcpWebSocketManager.getStatus();
          setActualConnectionType('websocket');
          setSessionId(null);
          setIsConnected(status.isConnected);
          setConnectionError(status.connectionError);
          logMCPEvent('info', 'Connected via WebSocket');
          return true;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      logMCPEvent('error', `Failed to connect via ${mode}`, error);
    }

    return false;
  }, [streamableClient]);

  // Main connect function
  const connect = useCallback(async (mode: MCPConnectionMode = connectionMode) => {
    setIsConnecting(true);
    setLastError(null);
    setConnectionError(null);
    
    try {
      let targetMode: 'websocket' | 'streamable' | null = null;

      if (mode === 'auto') {
        targetMode = await testConnectionMode();
      } else {
        targetMode = mode as 'websocket' | 'streamable';
      }

      if (!targetMode) {
        throw new Error('No available connection modes');
      }

      const success = await connectWithMode(targetMode);
      
      if (success) {
        await refreshElements();
        updatePageInfo();
        setConnectionMode(mode);
      } else {
        throw new Error(`Failed to connect via ${targetMode}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      setConnectionError(errorMessage);
      setIsConnected(false);
      setActualConnectionType(null);
      logMCPEvent('error', 'Enhanced Provider: Connection failed', error);
    } finally {
      setIsConnecting(false);
    }
  }, [connectionMode, testConnectionMode, connectWithMode, refreshElements, updatePageInfo]);

  // Disconnect from current connection
  const disconnect = useCallback(() => {
    streamableClient.disconnect();
    mcpWebSocketManager.disconnect();
    
    setIsConnected(false);
    setConnectionError(null);
    setActualConnectionType(null);
    setSessionId(null);
    setLastError(null);
    
    logMCPEvent('info', 'Enhanced Provider: Disconnected from all connections');
  }, [streamableClient]);

  // Reconnect using current mode
  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await connect(connectionMode);
  }, [disconnect, connect, connectionMode]);

  // Switch connection mode
  const switchConnectionMode = useCallback(async (newMode: MCPConnectionMode) => {
    disconnect();
    setConnectionMode(newMode);
    await connect(newMode);
  }, [disconnect, connect]);

  // Test current connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      if (actualConnectionType === 'streamable') {
        return streamableClient.isConnected();
      } else if (actualConnectionType === 'websocket') {
        const status = mcpWebSocketManager.getStatus();
        return status.isConnected;
      }
      return false;
    } catch (error) {
      logMCPEvent('error', 'Enhanced Provider: Connection test failed', error);
      return false;
    }
  }, [actualConnectionType, streamableClient]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Update page info on navigation
    const handleNavigation = () => {
      updatePageInfo();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleNavigation);
      return () => window.removeEventListener('popstate', handleNavigation);
    }
  }, [autoConnect, connect, updatePageInfo]);

  // Listen for custom MCP notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleNotification = (event: CustomEvent) => {
        logMCPEvent('info', 'Received MCP notification', event.detail);
        // Handle notifications as needed
      };

      window.addEventListener('mcp-notification', handleNotification as EventListener);
      return () => window.removeEventListener('mcp-notification', handleNotification as EventListener);
    }
  }, []);

  const contextValue: MCPContextType = {
    isConnected,
    connectionError,
    clickableElements,
    currentPage,
    isConnecting,
    lastError,
    connectionMode,
    actualConnectionType,
    sessionId,
    connect,
    disconnect,
    reconnect,
    refreshElements,
    testConnection,
    switchConnectionMode
  };

  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
}

export const useStreamableMCP = () => {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useStreamableMCP must be used within StreamableMCPProvider');
  }
  return context;
};

// Export both providers for compatibility
export { MCPProvider } from './MCPProvider';
export const useMCP = useStreamableMCP; // Alias for backward compatibility
