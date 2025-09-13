// React hook for MCP integration
// Provides easy-to-use interface for React components

import { useEffect, useState, useCallback } from 'react';
import mcpWebSocketManager from '@/lib/mcpWebSocketManager';
import { getElements, fillInput, getCurrentPage } from '@/lib/mcpElementCollector';
import { logMCPEvent } from '@/lib/mcpErrorHandling';
import type { ClickableElement, PageInfo } from '@/lib/mcpElementCollector';

export interface MCPHookState {
  isConnected: boolean;
  connectionError: string | null;
  clickableElements: ClickableElement[];
  currentPage: PageInfo;
  isConnecting: boolean;
  lastError: string | null;
}

export interface MCPHookActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  refreshElements: () => Promise<void>;
  refreshElementsByType: (elementType: 'clickable' | 'input' | 'all') => Promise<void>;
  fillInputElement: (inputName: string, inputType: string, data: string | boolean) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
}

export function useMCP(): MCPHookState & MCPHookActions {
  const [state, setState] = useState<MCPHookState>({
    isConnected: false,
    connectionError: null,
    clickableElements: [],
    currentPage: { url: '', title: '', path: '/' },
    isConnecting: false,
    lastError: null
  });

  // Update connection status
  const updateStatus = useCallback(() => {
    const status = mcpWebSocketManager.getStatus();
    setState(prev => ({
      ...prev,
      isConnected: status.isConnected,
      connectionError: status.connectionError,
      isConnecting: false
    }));
  }, []);

  // Update page info
  const updatePageInfo = useCallback(() => {
    if (typeof window !== 'undefined') {
      const pageInfo = getCurrentPage();
      setState(prev => ({
        ...prev,
        currentPage: pageInfo
      }));
    }
  }, []);

  // Refresh elements by type (new generic function)
  const refreshElementsByType = useCallback(async (elementType: 'clickable' | 'input' | 'all' = 'clickable') => {
    try {
      const result = await getElements(elementType);
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          clickableElements: result.data || [],
          lastError: null
        }));
        logMCPEvent('debug', `Refreshed ${elementType} elements`, { count: result.data.length });
      } else {
        setState(prev => ({
          ...prev,
          lastError: result.error?.message || 'Failed to refresh elements'
        }));
        logMCPEvent('error', 'Failed to refresh elements', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      logMCPEvent('error', 'Error refreshing elements', error);
    }
  }, []);

  // Refresh clickable elements (backward compatibility)
  const refreshElements = useCallback(async () => {
    return refreshElementsByType('clickable');
  }, [refreshElementsByType]);

  // Connect to MCP server
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, lastError: null }));
    
    try {
      const result = await mcpWebSocketManager.connect();
      if (result.success) {
        logMCPEvent('info', 'Successfully connected via hook');
        await refreshElements();
        updatePageInfo();
      } else {
        setState(prev => ({
          ...prev,
          lastError: result.error?.message || 'Connection failed'
        }));
        logMCPEvent('error', 'Connection failed via hook', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      logMCPEvent('error', 'Error during connection', error);
    } finally {
      updateStatus();
    }
  }, [refreshElements, updatePageInfo, updateStatus]);
  // Disconnect from MCP server
  const disconnect = useCallback(() => {
    mcpWebSocketManager.disconnect();
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionError: null,
      isConnecting: false,
      clickableElements: [],
      lastError: null
    }));
    logMCPEvent('info', 'Disconnected via hook');
  }, []);

  // Reconnect to MCP server
  const reconnect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, lastError: null }));
    
    try {
      const result = await mcpWebSocketManager.reconnect();
      if (result.success) {
        logMCPEvent('info', 'Successfully reconnected via hook');
        await refreshElements();
        updatePageInfo();
      } else {
        setState(prev => ({
          ...prev,
          lastError: result.error?.message || 'Reconnection failed'
        }));
        logMCPEvent('error', 'Reconnection failed via hook', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      logMCPEvent('error', 'Error during reconnection', error);
    } finally {
      updateStatus();
    }
  }, [refreshElements, updatePageInfo, updateStatus]);

  // Fill input element with data
  const fillInputElement = useCallback(async (inputName: string, inputType: string, data: string | boolean): Promise<boolean> => {
    try {
      const result = await fillInput(inputName, inputType, data);
      if (result.success && result.data) {
        setState(prev => ({ ...prev, lastError: null }));
        logMCPEvent('info', `Successfully filled input "${inputName}"`, { inputType, data, message: result.data.message });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          lastError: result.error?.message || 'Failed to fill input'
        }));
        logMCPEvent('error', 'Failed to fill input', result.error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      logMCPEvent('error', 'Error filling input', error);
      return false;
    }
  }, []);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const result = await mcpWebSocketManager.testConnection();
      if (result.success) {
        logMCPEvent('info', 'Connection test successful');
        setState(prev => ({ ...prev, lastError: null }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          lastError: result.error?.message || 'Connection test failed'
        }));
        logMCPEvent('error', 'Connection test failed', result.error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      logMCPEvent('error', 'Error during connection test', error);
      return false;
    }
  }, []);
  // Setup effect for initialization and cleanup
  useEffect(() => {
    // Initialize page info
    updatePageInfo();
    
    // Initial status update
    updateStatus();

    // Listen for page changes (for SPA navigation)
    const handlePopState = () => {
      updatePageInfo();
      refreshElements();
    };

    const handleRouteChange = () => {
      updatePageInfo();
      refreshElements();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
      
      // Monitor for URL changes (compatible with App Router)
      let currentUrl = window.location.href;
      const urlCheckInterval = setInterval(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          handleRouteChange();
        }
      }, 100); // Check every 100ms
      
      // Store interval ID for cleanup
      (window as unknown as { mcpUrlCheckInterval?: NodeJS.Timeout }).mcpUrlCheckInterval = urlCheckInterval;
    }

    // Periodic status updates
    const statusInterval = setInterval(updateStatus, 5000);

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
        
        // Clear URL monitoring interval
        const urlCheckInterval = (window as unknown as { mcpUrlCheckInterval?: NodeJS.Timeout }).mcpUrlCheckInterval;
        if (urlCheckInterval) {
          clearInterval(urlCheckInterval);
          delete (window as unknown as { mcpUrlCheckInterval?: NodeJS.Timeout }).mcpUrlCheckInterval;
        }
      }
      
      clearInterval(statusInterval);
    };
  }, [updatePageInfo, updateStatus, refreshElements]);

  // Auto-refresh elements when page changes
  useEffect(() => {
    if (state.isConnected) {
      refreshElements();
    }
  }, [state.currentPage.path, state.isConnected, refreshElements]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
    refreshElements,
    refreshElementsByType,
    fillInputElement,
    testConnection
  };
}
