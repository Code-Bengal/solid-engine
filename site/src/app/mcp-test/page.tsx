'use client';

import { useState } from 'react';
import { useBookingFormStore } from '@/store/bookingFormStore';
import { MCPControlPanel } from '@/components/MCPControlPanel';
import { useMCPContext } from '@/components/MCPProvider';

function MCPTestContent() {
  const { isConnected } = useMCPContext();
  const { values, reset } = useBookingFormStore();
  const [emitResult, setEmitResult] = useState<string>('');

  const testMCPConnection = () => {
    setEmitResult(`MCP Connection Status: ${isConnected ? 'Connected' : 'Disconnected'}\nWebSocket URL: ${process.env.NEXT_PUBLIC_MCP_SOCKET_URL || 'Not configured'}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">MCP Integration Test</h1>
          <p className="text-xl text-gray-600">Test the Socket.IO connection and booking form auto-fill</p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Connection Status</h2>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>{isConnected ? 'Connected to MCP Server' : 'Disconnected from MCP Server'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testMCPConnection}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              data-clickable-element="mcp-check-connection"
              data-element-description="Check MCP WebSocket connection status"
            >
              Check MCP Connection
            </button>
            
            <button
              onClick={reset}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              data-clickable-element="mcp-reset-form"
              data-element-description="Reset all form state values to empty"
            >
              Reset Form State
            </button>
          </div>

          {emitResult && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Server Response:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {emitResult}
              </pre>
            </div>
          )}
        </div>

        {/* Fill Input Tool Test Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Fill Input Tool Test</h2>
          <p className="text-gray-600 mb-6">
            Test form with various input types to demonstrate the fillInput tool functionality.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text Input</label>
              <input
                type="text"
                data-input-element="test-text-input"
                data-element-description="Test text input for fillInput tool demonstration"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter text here..."
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Input</label>
              <input
                type="email"
                data-input-element="test-email-input"
                data-element-description="Test email input for fillInput tool demonstration"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email here..."
              />
            </div>

            {/* Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number Input</label>
              <input
                type="number"
                data-input-element="test-number-input"
                data-element-description="Test number input for fillInput tool demonstration"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter number here..."
              />
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Input</label>
              <input
                type="date"
                data-input-element="test-date-input"
                data-element-description="Test date input for fillInput tool demonstration"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Select Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Dropdown</label>
              <select
                data-input-element="test-select-input"
                data-element-description="Test select dropdown for fillInput tool demonstration"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an option...</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>

            {/* Range Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Range Slider</label>
              <input
                type="range"
                min="0"
                max="100"
                data-input-element="test-range-input"
                data-element-description="Test range slider for fillInput tool demonstration"
                className="w-full"
              />
            </div>

            {/* Checkbox */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                data-input-element="test-checkbox-input"
                data-element-description="Test checkbox for fillInput tool demonstration"
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">Test Checkbox</label>
            </div>

            {/* Radio Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Radio Buttons</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="test-radio"
                    value="radio1"
                    data-input-element="test-radio-1"
                    data-element-description="Test radio button option 1 for fillInput tool demonstration"
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">Radio Option 1</label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="test-radio"
                    value="radio2"
                    data-input-element="test-radio-2"
                    data-element-description="Test radio button option 2 for fillInput tool demonstration"
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">Radio Option 2</label>
                </div>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Textarea</label>
            <textarea
              rows={4}
              data-input-element="test-textarea-input"
              data-element-description="Test textarea for fillInput tool demonstration"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              placeholder="Enter multiple lines of text here..."
            ></textarea>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">MCP fillInput Tool Examples:</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <div><code>fillInput("test-text-input", "text", "Hello World")</code></div>
              <div><code>fillInput("test-email-input", "email", "test@example.com")</code></div>
              <div><code>fillInput("test-checkbox-input", "checkbox", true)</code></div>
              <div><code>fillInput("test-select-input", "select", "option2")</code></div>
              <div><code>fillInput("test-radio-1", "radio", true)</code></div>
            </div>
          </div>
        </div>

        {/* Current Form State */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Booking Form State</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.customer_name || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.customer_email || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.customer_phone || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Room ID</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.room_id || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Check-in Date</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.check_in_date || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.check_out_date || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Guests</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.guests || 'Empty'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Special Requests</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">{values.special_requests || 'Empty'}</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Test</h2>
          
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <p>Make sure your MCP server is running and accessible at the configured WebSocket URL</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <p>Click &quot;Check MCP Connection&quot; to verify the WebSocket connection status</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <p>Use the MCP Control Panel below to test sending events to the MCP server</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <p>Watch the form state update automatically when MCP events are received</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <p>Visit <a href="/booking" className="text-blue-600 hover:underline" data-clickable-element="mcp-to-booking" data-element-description="Navigate to booking page to see MCP integration in action">/booking</a> to see the integration in the actual booking form</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Environment Setup</h3>
            <p className="text-yellow-700">
              Make sure <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_MCP_SOCKET_URL</code> is set in your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file.
              <br />
              Example: <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_MCP_SOCKET_URL=ws://localhost:3001</code>
            </p>
          </div>
        </div>

        {/* MCP Control Panel */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">MCP Control Panel</h2>
          <MCPControlPanel showElementsList={true} compact={false} />
        </div>
      </div>
    </div>
  );
}

export default function MCPTest() {
  return <MCPTestContent />;
}
