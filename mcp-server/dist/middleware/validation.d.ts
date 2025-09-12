import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { JsonRpcRequest } from '../schemas/jsonrpc.js';
export interface ValidatedRequest extends Request {
    validatedJsonRpc?: JsonRpcRequest;
}
export declare function validateJsonRpcMiddleware(req: ValidatedRequest, res: Response, next: NextFunction): void;
export declare function validateMcpMethodMiddleware(expectedMethod: string): (req: ValidatedRequest, res: Response, next: NextFunction) => void;
export declare function jsonRpcErrorHandler(error: Error, req: ValidatedRequest, res: Response, next: NextFunction): void;
export declare function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T;
export declare function sendJsonRpcSuccess(res: Response, result: unknown, id: string | number | null): void;
export declare function sendJsonRpcError(res: Response, code: number, message: string, data?: unknown, id?: string | number | null, statusCode?: number): void;
//# sourceMappingURL=validation.d.ts.map