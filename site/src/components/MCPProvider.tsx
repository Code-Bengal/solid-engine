// MCP Provider component for React context
// Provides MCP functionality throughout the application

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import mcpWebSocketManager from '@/lib/mcpWebSocketManager';
import { getClickableElements, getCurrentPage } from '@/lib/mcpElementCollector';
import { logMCPEvent } from '@/lib/mcpErrorHandling';
import type { ClickableElement, PageInfo } from '@/lib/mcpElementCollector';

interface MCPContextType {
  isConnected: boolean;
  connectionError: string | null;
  clickableElements: ClickableElement[];
  currentPage: PageInfo;
  isConnecting: boolean;
  lastError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  refreshElements: () => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const MCPContext = createContext<MCPContextType | null>(null);

interface MCPProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

export function MCPProvider({ children, autoConnect = false }: MCPProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [clickableElements, setClickableElements] = useState<ClickableElement[]>([]);
  const [currentPage, setCurrentPage] = useState<PageInfo>({ url: '', title: '', path: '/' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Update connection status
  const updateStatus = () => {
    const status = mcpWebSocketManager.getStatus();
    setIsConnected(status.isConnected);
    setConnectionError(status.connectionError);
    setIsConnecting(false);
  };

  // Update page info
  const updatePageInfo = () => {
    if (typeof window !== 'undefined') {
      const pageInfo = getCurrentPage();
      setCurrentPage(pageInfo);
    }
  };

  // Refresh clickable elements
  const refreshElements = useCallback(async () => {
    try {
      const result = await getClickableElements();
      if (result.success && result.data) {
        setClickableElements(result.data);
        setLastError(null);
        logMCPEvent('debug', 'Provider: Refreshed clickable elements', { count: result.data.length });
      } else {
        setLastError(result.error?.message || 'Failed to refresh elements');
        logMCPEvent('error', 'Provider: Failed to refresh elements', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      logMCPEvent('error', 'Provider: Error refreshing elements', error);
    }
  }, []);

  // Connect to MCP server
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setLastError(null);
    
    try {
      const result = await mcpWebSocketManager.connect();
      if (result.success) {
        logMCPEvent('info', 'Provider: Successfully connected');
        await refreshElements();
        updatePageInfo();
      } else {
        setLastError(result.error?.message || 'Connection failed');
        logMCPEvent('error', 'Provider: Connection failed', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      logMCPEvent('error', 'Provider: Error during connection', error);
    } finally {
      updateStatus();
    }
  }, [refreshElements]);

  // Disconnect from MCP server
  const disconnect = () => {
    mcpWebSocketManager.disconnect();
    setIsConnected(false);
    setConnectionError(null);
    setIsConnecting(false);
    setClickableElements([]);
    setLastError(null);
    logMCPEvent('info', 'Provider: Disconnected');
  };

  // Reconnect to MCP server
  const reconnect = useCallback(async () => {
    setIsConnecting(true);
    setLastError(null);
    
    try {
      const result = await mcpWebSocketManager.reconnect();
      if (result.success) {
        logMCPEvent('info', 'Provider: Successfully reconnected');
        await refreshElements();
        updatePageInfo();
      } else {
        setLastError(result.error?.message || 'Reconnection failed');
        logMCPEvent('error', 'Provider: Reconnection failed', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      logMCPEvent('error', 'Provider: Error during reconnection', error);
    } finally {
      updateStatus();
    }
  }, [refreshElements]);

  // Test connection
  const testConnection = async (): Promise<boolean> => {
    try {
      const result = await mcpWebSocketManager.testConnection();
      if (result.success) {
        logMCPEvent('info', 'Provider: Connection test successful');
        setLastError(null);
        return true;
      } else {
        setLastError(result.error?.message || 'Connection test failed');
        logMCPEvent('error', 'Provider: Connection test failed', result.error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      logMCPEvent('error', 'Provider: Error during connection test', error);
      return false;
    }
  };

  // Initialize and setup
  useEffect(() => {
    // Initialize page info
    updatePageInfo();
    
    // Initial status update
    updateStatus();

    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Listen for page changes
    const handlePopState = () => {
      updatePageInfo();
      if (isConnected) {
        refreshElements();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
    }

    // Periodic status updates
    const statusInterval = setInterval(updateStatus, 5000);

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
      }
      clearInterval(statusInterval);
    };
  }, [autoConnect, connect, isConnected, refreshElements]);

  // Auto-refresh elements when page or connection changes
  useEffect(() => {
    if (isConnected) {
      refreshElements();
    }
  }, [currentPage.path, isConnected, refreshElements]);

  const contextValue: MCPContextType = {
    isConnected,
    connectionError,
    clickableElements,
    currentPage,
    isConnecting,
    lastError,
    connect,
    disconnect,
    reconnect,
    refreshElements,
    testConnection
  };

  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
}

export function useMCPContext() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCPContext must be used within an MCPProvider');
  }
  return context;
}
