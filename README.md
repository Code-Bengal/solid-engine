# MCP WebSocket Integration System

A comprehensive Model Context Protocol (MCP) implementation that enables real-time communication between AI agents and Next.js applications through WebSocket connections. This system allows AI agents to interact with web applications by reading page content, clicking elements, filling forms, and navigating pages.

## Overview

This project consists of two main components:
- **MCP Server**: A Node.js/Express server that implements the MCP protocol with WebSocket support
- **Next.js Frontend**: A hotel booking application with integrated MCP client capabilities

## Architecture

```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐
│   AI Agent      │ ◄─────────────────► │   MCP Server    │
│   (Claude, etc) │                     │   (Port 3001)   │
└─────────────────┘                     └─────────────────┘
                                                  │
                                        WebSocket │
                                                  ▼
                                        ┌─────────────────┐
                                        │   Next.js App   │
                                        │   (Port 3000)   │
                                        └─────────────────┘
```

## Features

### 🔧 Core MCP Tools

#### 1. `getCurrentPage`
Get current page information from the frontend application.

**Usage:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "getCurrentPage",
    "arguments": {
      "sessionId": "optional-session-id"
    }
  }
}
```

**Response:**
```json
{
  "url": "http://localhost:3000/booking",
  "title": "Hotel Booking - Book Your Stay",
  "path": "/booking"
}
```

#### 2. `getElements`
Retrieve elements from the current page by type (clickable, input, or all).

**Usage:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "getElements",
    "arguments": {
      "elementType": "clickable",
      "sessionId": "optional-session-id"
    }
  }
}
```

**Element Types:**
- `clickable`: Buttons, links, and clickable elements
- `input`: Form inputs, checkboxes, selects, textareas
- `all`: Both clickable and input elements

#### 3. `clickElement`
Click on a named element in the frontend application.

**Usage:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "clickElement",
    "arguments": {
      "name": "submit-btn",
      "sessionId": "optional-session-id"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "elementName": "submit-btn",
  "message": "Successfully clicked element \"submit-btn\"",
  "newUrl": "http://localhost:3000/payment",
  "currentPage": {
    "url": "http://localhost:3000/payment",
    "title": "Payment",
    "path": "/payment"
  }
}
```

#### 4. `fillInput`
Fill form inputs with data. Supports text inputs, checkboxes, radio buttons, selects, and textareas.

**Usage:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "fillInput",
    "arguments": {
      "inputName": "customer-email",
      "inputType": "email",
      "data": "john@example.com",
      "sessionId": "optional-session-id"
    }
  }
}
```

**Supported Input Types:**
- `text`, `email`, `password`, `tel`, `url`
- `checkbox`, `radio`
- `select`
- `textarea`
- `number`, `date`, `range`

#### 5. `navigatePage`
Navigate to a different page in the application.

**Usage:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "navigatePage",
    "arguments": {
      "page": "/contact",
      "sessionId": "optional-session-id"
    }
  }
}
```

#### 6. `fillBookingForm`
Specialized tool for filling the hotel booking form.

**Usage:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "fillBookingForm",
    "arguments": {
      "checkIn": "2024-12-01",
      "checkOut": "2024-12-03",
      "guests": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "sessionId": "optional-session-id"
    }
  }
}
```

## API Endpoints

### MCP Server (Port 3001)

#### WebSocket Endpoints
- `ws://localhost:3001/tools` - Main WebSocket connection for Next.js frontend

#### HTTP Endpoints

##### Core MCP Protocol
- `POST /mcp` - Main MCP JSON-RPC endpoint
- `GET /mcp/tools` - Get available tools with documentation

##### REST-style Tool Endpoints
- `POST /mcp/tools/echo` - Echo test endpoint
- `POST /mcp/tools/get-current-page` - Get current page info
- `POST /mcp/tools/get-elements` - Get page elements
- `POST /mcp/tools/click-element` - Click an element
- `POST /mcp/tools/fill-input` - Fill form input
- `POST /mcp/tools/navigate-page` - Navigate to page

##### System Endpoints
- `GET /health` - Health check
- `GET /info` - Server information
- `POST /notify-frontend` - Send notifications to frontend

##### Session Management
- `GET /sessions` - List all sessions
- `GET /sessions/:sessionId/status` - Get session status

### Next.js Frontend (Port 3000)

#### API Routes
- `GET /api/mcp/test` - MCP connectivity test
- `POST /api/mcp/test` - Test MCP event emission

## Installation and Setup

### Prerequisites
- Node.js 18+ 
- pnpm (preferred) or npm

### 1. Install Dependencies

**MCP Server:**
```bash
cd mcp-server
npm install
```

**Next.js Frontend:**
```bash
cd site
pnpm install
```

### 2. Environment Configuration

Create `.env.local` in the `site` directory:
```env
NEXT_PUBLIC_MCP_SOCKET_URL=http://localhost:3001
```

### 3. Database Setup (Next.js)

Initialize the SQLite database:
```bash
cd site
pnpm run seed
```

### 4. Start the Applications

**Terminal 1 - MCP Server:**
```bash
cd mcp-server
npm run dev
```

**Terminal 2 - Next.js Frontend:**
```bash
cd site
pnpm run dev
```

The applications will be available at:
- Next.js Frontend: http://localhost:3000
- MCP Server: http://localhost:3001

## Testing the Integration

### 1. Frontend Test Page
Visit http://localhost:3000/mcp-test to access the comprehensive test interface that includes:
- Connection status testing
- Form filling demonstrations
- Element interaction examples
- Real-time MCP event monitoring

### 2. MCP Tool Testing

#### Using cURL (REST API)
```bash
# Get current page
curl -X POST http://localhost:3001/mcp/tools/get-current-page \
  -H "Content-Type: application/json" \
  -d '{}'

# Get clickable elements
curl -X POST http://localhost:3001/mcp/tools/get-elements \
  -H "Content-Type: application/json" \
  -d '{"elementType": "clickable"}'

# Click an element
curl -X POST http://localhost:3001/mcp/tools/click-element \
  -H "Content-Type: application/json" \
  -d '{"elementName": "mcp-check-connection"}'

# Fill an input
curl -X POST http://localhost:3001/mcp/tools/fill-input \
  -H "Content-Type: application/json" \
  -d '{"inputName": "test-email-input", "inputType": "email", "data": "test@example.com"}'
```

#### Using JSON-RPC (MCP Protocol)
```bash
# List available tools
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Call a tool
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getCurrentPage",
      "arguments": {}
    }
  }'
```

## Postman Collection

You can use this system like a Postman collection for testing web automation. Here's how to set up common workflows:

### Collection: Hotel Booking Automation

#### 1. Health Check
```bash
GET http://localhost:3001/health
```

#### 2. Navigate to Booking Page
```json
POST http://localhost:3001/mcp/tools/navigate-page
{
  "page": "/booking"
}
```

#### 3. Get Form Elements
```json
POST http://localhost:3001/mcp/tools/get-elements
{
  "elementType": "input"
}
```

#### 4. Fill Booking Form
```json
POST http://localhost:3001/mcp/tools/fill-booking-form
{
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-03",
  "guests": 2,
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### 5. Submit Form
```json
POST http://localhost:3001/mcp/tools/click-element
{
  "elementName": "submit-booking"
}
```

## Element Attribute System

The system uses data attributes to identify interactive elements:

### Clickable Elements
```html
<button 
  data-clickable-element="submit-btn"
  data-element-description="Submit the booking form"
>
  Submit Booking
</button>
```

### Input Elements
```html
<input 
  type="email"
  data-input-element="customer-email"
  data-element-description="Customer email address"
/>
```

## Session Management

The system supports multiple concurrent sessions:

- **Auto-selection**: Tools automatically select the best available client
- **Session-specific**: Target specific frontend sessions using `sessionId`
- **Multi-client**: Handle multiple frontend connections simultaneously

## Error Handling

The system provides comprehensive error handling:

```json
{
  "success": false,
  "error": {
    "type": "ELEMENT_NOT_FOUND",
    "message": "Clickable element with name \"invalid-btn\" not found",
    "timestamp": 1703123456789
  }
}
```

## Rate Limiting

Built-in rate limiting prevents abuse:
- Default: 10 requests per 10-second window
- Configurable per tool type
- Automatic cleanup of old request records

## Logging and Debugging

### Server Logs
The MCP server provides detailed logging:
```
🔌 [TOOLS] Client connected to tools namespace: abc123
🎯 [CallTool] Tool: getCurrentPage, SessionId: auto-select
📤 [getCurrentPage] Emitting 'mcp:getCurrentPage' to client
📥 [getCurrentPage] Received response from client: {...}
```

### Frontend Logs
The Next.js frontend includes debug logging:
```
🔌 [MCP Debug] Connected to MCP server
📍 [MCP Debug] Received mcp:getCurrentPage request
🖱️ [MCP Debug] Received mcp:clickElement request: submit-btn
```

## Development

### Project Structure
```
├── mcp-server/
│   ├── src/
│   │   ├── mcpMain.ts          # Main MCP server implementation
│   │   ├── server.ts           # Streamable HTTP server
│   │   ├── types/mcp.ts        # Type definitions
│   │   ├── tools/              # Tool implementations
│   │   ├── routes/             # HTTP route handlers
│   │   └── middleware/         # Validation middleware
│   └── package.json
├── site/
│   ├── src/
│   │   ├── app/                # Next.js 13+ app directory
│   │   ├── components/         # React components
│   │   ├── lib/                # MCP integration libraries
│   │   └── hooks/              # React hooks for MCP
│   └── package.json
└── README.md
```

### Key Libraries
- **MCP Server**: `@modelcontextprotocol/sdk`, `socket.io`, `express`
- **Frontend**: `socket.io-client`, `next`, `react`
- **Database**: `better-sqlite3`
- **Validation**: `zod`

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure MCP server is running on port 3001
   - Check `NEXT_PUBLIC_MCP_SOCKET_URL` environment variable
   - Verify no firewall blocking WebSocket connections

2. **Elements Not Found**
   - Ensure elements have proper `data-clickable-element` or `data-input-element` attributes
   - Check if elements are visible and not disabled
   - Use the MCP test page to verify element detection

3. **Form Filling Not Working**
   - Verify input type matches the actual element type
   - Check if inputs are enabled and not readonly
   - Ensure proper data format (boolean for checkboxes/radios)

### Debug Mode

Enable debug mode by setting environment variables:
```bash
# MCP Server
DEBUG=mcp:* npm run dev

# Next.js Frontend  
NEXT_PUBLIC_DEBUG=true pnpm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the ISC License.

## Links

- **Live Demo**: http://localhost:3000 (when running locally)
- **MCP Server API**: http://localhost:3001/mcp/tools
- **Test Interface**: http://localhost:3000/mcp-test
- **Health Check**: http://localhost:3001/health
- **Postman Collection**: https://.postman.co/workspace/API-DEV~ee750a99-084d-4bcd-aaae-4319aba45ff7/collection/42553015-745179ea-3fb6-4655-92a9-6dc280aceead?action=share&creator=42553015

---

*This MCP WebSocket Integration System provides a powerful foundation for AI agents to interact with web applications in real-time, enabling sophisticated automation and testing workflows.*
