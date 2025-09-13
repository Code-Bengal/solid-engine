# MCP Server - Cloudflare Workers Deployment

This MCP (Model Context Protocol) server has been successfully configured for deployment to Cloudflare Workers.

## 🚀 Deployment Status

✅ **Successfully Deployed**
- **URL**: https://mcp-server.codebengal25.workers.dev
- **Status**: Active and responding
- **Runtime**: Cloudflare Workers

## 📋 Available Endpoints

### Health Check
```bash
GET /health
```
Returns: `{"status":"ok","service":"MCP Worker Server"}`

### MCP Protocol Endpoint
```bash
POST /mcp
Content-Type: application/json
```

## 🛠️ Available Tools

### 1. Echo Tool
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "message": "Your message here"
    }
  }
}
```

### 2. List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

## 🏗️ Deployment Commands

### Build the project
```bash
pnpm run build
```

### Deploy to Cloudflare Workers
```bash
npx wrangler deploy
```

## 📁 Project Structure

- `src/worker.ts` - Cloudflare Workers-compatible entry point
- `src/server.ts` - Original Express server (for local development)
- `src/mcpMain.ts` - Standalone MCP server
- `wrangler.jsonc` - Cloudflare Workers configuration
- `dist/worker.js` - Compiled worker entry point

## 🔧 Configuration

The `wrangler.jsonc` file contains:
- Entry point: `dist/worker.js`
- Environment variables
- Compatibility settings

## 🌐 Environment Variables

- `FRONTEND_URL`: Set in wrangler.jsonc for CORS configuration

## 📝 Notes

- The original Express server with Socket.IO is not compatible with Cloudflare Workers
- A simplified worker-compatible version was created in `src/worker.ts`
- The MCP protocol is implemented using standard HTTP requests instead of stdio transport
- CORS is configured to allow cross-origin requests

## 🧪 Testing

You can test the deployed server using curl:

```bash
# Health check
curl "https://mcp-server.codebengal25.workers.dev/health"

# List available tools
curl -X POST "https://mcp-server.codebengal25.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test echo tool
curl -X POST "https://mcp-server.codebengal25.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello World!"}}}'
```