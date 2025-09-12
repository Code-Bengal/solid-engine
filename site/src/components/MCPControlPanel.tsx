// MCP Control Panel component for testing and monitoring
// Provides UI for managing MCP connection and viewing clickable elements

'use client';

import React, { useState } from 'react';
import { useMCP } from '@/hooks/useMCP';

interface MCPControlPanelProps {
  showElementsList?: boolean;
  compact?: boolean;
}

export function MCPControlPanel({ showElementsList = true, compact = false }: MCPControlPanelProps) {
  const {
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
  } = useMCP();

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await testConnection();
    } finally {
      setTesting(false);
    }
  };

  if (compact && !isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-colors ${
            isConnected ? 'bg-green-500 hover:bg-green-600' : 
            isConnecting ? 'bg-yellow-500 hover:bg-yellow-600' :
            'bg-red-500 hover:bg-red-600'
          }`}
          title={`MCP Status: ${isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}`}
        >
          {isConnecting ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'fixed bottom-4 right-4 z-50' : ''} bg-white rounded-lg shadow-lg border border-gray-200 p-4 ${compact ? 'w-96' : 'w-full'}`}>
      {compact && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">MCP Control Panel</h3>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Connection Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900">Connection Status</h4>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? 'bg-green-100 text-green-800'
              : isConnecting
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'
            } ${isConnecting ? 'animate-pulse' : ''}`} />
            <span>
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>

        {connectionError && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Connection Error:</strong> {connectionError}
          </div>
        )}

        {lastError && (
          <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-700 text-sm">
            <strong>Last Error:</strong> {lastError}
          </div>
        )}

        <div className="flex space-x-2 flex-wrap gap-y-2">
          {!isConnected && !isConnecting && (
            <button
              onClick={connect}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              data-clickable-element="mcp-panel-connect"
              data-element-description="Connect to MCP server for remote control"
            >
              Connect
            </button>
          )}
          
          {isConnected && (
            <button
              onClick={disconnect}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              data-clickable-element="mcp-panel-disconnect"
              data-element-description="Disconnect from MCP server"
            >
              Disconnect
            </button>
          )}
          
          <button
            onClick={reconnect}
            disabled={isConnecting}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
            data-clickable-element="mcp-panel-reconnect"
            data-element-description="Reconnect to MCP server"
          >
            Reconnect
          </button>
          
          <button
            onClick={refreshElements}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
            data-clickable-element="mcp-panel-refresh"
            data-element-description="Refresh list of clickable elements"
          >
            Refresh Elements
          </button>

          {isConnected && (
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              data-clickable-element="mcp-panel-test"
              data-element-description="Test MCP server connection"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          )}
        </div>
      </div>

      {/* Page Info */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 mb-2">Current Page</h4>
        <div className="p-2 bg-gray-50 rounded text-sm font-mono text-gray-700">
          <div className="font-medium">{currentPage.path}</div>
          {currentPage.title && (
            <div className="text-xs text-gray-500 mt-1">Title: {currentPage.title}</div>
          )}
          <div className="text-xs text-gray-500 mt-1">URL: {currentPage.url}</div>
        </div>
      </div>

      {/* Clickable Elements List */}
      {showElementsList && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">
              Clickable Elements ({clickableElements.length})
            </h4>
          </div>
          
          <div className={`space-y-2 ${compact ? 'max-h-64 overflow-y-auto' : ''}`}>
            {clickableElements.length === 0 ? (
              <div className="text-gray-500 text-sm p-2 border border-gray-200 rounded">
                No clickable elements found on this page.
              </div>
            ) : (
              clickableElements.map((element, index) => (
                <div
                  key={index}
                  className="p-2 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-gray-900">
                      {element.name}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        element.isVisible 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {element.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {element.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {element.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">
                    {element.selector}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Debug Info
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify({
                isConnected,
                connectionError,
                lastError,
                currentPage,
                elementsCount: clickableElements.length,
                socketUrl: process.env.NEXT_PUBLIC_MCP_SOCKET_URL || 'http://localhost:3001'
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
