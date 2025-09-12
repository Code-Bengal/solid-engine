import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare function initializeSocketIO(httpServer: HTTPServer): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function sendRequestToFrontend(method: string, params: any, sessionId?: string, timeoutMs?: number): Promise<any>;
export declare function emitToFrontend(event: string, payload: any, sessionId?: string): void;
export declare function getConnectedClientsCount(): number;
export declare function isSessionConnected(sessionId: string): boolean;
//# sourceMappingURL=nextSocketClient.d.ts.map