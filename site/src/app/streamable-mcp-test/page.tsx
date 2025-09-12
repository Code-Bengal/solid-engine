'use client';

import { useState, useEffect } from 'react';
import { StreamableMCPProvider, useStreamableMCP } from '@/components/StreamableMCPProvider';
import { getStreamableMCPClient } from '@/lib/streamableMCPClient';

interface MCPTestResult {
  method: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: string;
}

function MCPTestDashboard() {
  const {
    isConnected,
    connectionError,
    isConnecting,
    connectionMode,
    actualConnectionType,
    sessionId,
    connect,
    disconnect,
    switchConnectionMode,
    testConnection,
    refreshElements,
    clickableElements,
    currentPage
  } = useStreamableMCP();

  const [testResults, setTestResults] = useState<MCPTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addTestResult = (method: string, success: boolean, result?: any, error?: string) => {
    const testResult: MCPTestResult = {
      method,
      success,
      result,
      error,
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const runMCPTest = async (method: string, params: any = {}) => {
    try {
      const client = getStreamableMCPClient();
      const result = await client.sendMCPRequest(method, params);
      addTestResult(method, true, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(method, false, null, errorMessage);
      throw error;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    
    try {
      // Test echo
      await runMCPTest('echo', { message: 'Hello from streamable MCP!' });
      
      // Test getCurrentPage
      await runMCPTest('getCurrentPage');
      
      // Test getElements
      await runMCPTest('getElements', { elementType: 'clickable' });
      
      // Test getElements for inputs
      await runMCPTest('getElements', { elementType: 'input' });
      
      // Test getElements for all
      await runMCPTest('getElements', { elementType: 'all' });
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Streamable MCP Server Test Dashboard
        </h1>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Connection Status</div>
              <div className={`text-lg font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Connection Type</div>
              <div className="text-lg font-semibold">
                {actualConnectionType || 'None'}
                {connectionMode !== actualConnectionType && ` (${connectionMode} requested)`}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Session ID</div>
              <div className="text-sm font-mono break-all">
                {sessionId || 'N/A'}
              </div>
            </div>
          </div>

          {connectionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-600 font-medium">Connection Error:</div>
              <div className="text-red-700">{connectionError}</div>
            </div>
          )}

          {/* Connection Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => connect('streamable')}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Connect Streamable
            </button>
            
            <button
              onClick={() => connect('websocket')}
              disabled={isConnecting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Connect WebSocket
            </button>
            
            <button
              onClick={() => connect('auto')}
              disabled={isConnecting}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Auto Connect
            </button>
            
            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect
            </button>
            
            <button
              onClick={() => testConnection()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">MCP Tests</h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={runAllTests}
              disabled={!isConnected || isRunningTests}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </button>
            
            <button
              onClick={() => runMCPTest('echo', { message: 'Test message' })}
              disabled={!isConnected}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Test Echo
            </button>
            
            <button
              onClick={() => runMCPTest('getCurrentPage')}
              disabled={!isConnected}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Get Current Page
            </button>
            
            <button
              onClick={() => runMCPTest('getElements', { elementType: 'all' })}
              disabled={!isConnected}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Get All Elements
            </button>
            
            <button
              onClick={refreshElements}
              disabled={!isConnected}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              Refresh Elements
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Recent Test Results</h3>
            {testResults.length === 0 ? (
              <div className="text-gray-500 italic">No tests run yet</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={`${result.timestamp}-${index}`}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{result.method}</span>
                        <span className={`ml-2 text-sm ${
                          result.success ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.success ? '✅ Success' : '❌ Failed'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {result.error && (
                      <div className="text-red-600 text-sm mt-1">
                        Error: {result.error}
                      </div>
                    )}
                    
                    {result.result && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-600 cursor-pointer">
                          View Result
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current Page Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Page Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Title</div>
              <div className="font-medium">{currentPage.title || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">URL</div>
              <div className="font-medium break-all">{currentPage.url || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Path</div>
              <div className="font-medium">{currentPage.path || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Elements List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Clickable Elements ({clickableElements.length})
          </h2>
          
          {clickableElements.length === 0 ? (
            <div className="text-gray-500 italic">No elements found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clickableElements.map((element, index) => (
                <div
                  key={`${element.name}-${index}`}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="font-medium">{element.name}</div>
                  <div className="text-sm text-gray-600">{element.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Type: {element.elementType} | Visible: {element.isVisible ? '✅' : '❌'}
                  </div>
                  <div className="text-xs font-mono text-gray-400 mt-1 break-all">
                    {element.selector}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StreamableMCPTestPage() {
  return (
    <StreamableMCPProvider autoConnect={false} preferredMode="auto">
      <MCPTestDashboard />
    </StreamableMCPProvider>
  );
}
