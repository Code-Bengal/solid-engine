import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Request, Response } from 'express';
export declare class StreamableHTTPTransport {
    private server;
    private toolHandlers;
    constructor(server: Server, toolHandlers?: Map<string, (args: any) => Promise<any>>);
    handleRequest(req: Request, res: Response): Promise<void>;
    private processJSONRPCRequest;
    private handleToolsList;
    private handleToolCall;
    private handleInitialize;
    close(): Promise<void>;
}
export declare function createStreamableHTTPTransport(server: Server, toolHandlers?: Map<string, (args: any) => Promise<any>>): StreamableHTTPTransport;
//# sourceMappingURL=streamableHttpTransport.d.ts.map