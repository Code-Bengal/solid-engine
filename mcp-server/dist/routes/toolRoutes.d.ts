import { Router } from 'express';
export interface ToolHandlerMap {
    [key: string]: (args: any) => Promise<any>;
}
export declare function createToolRoutes(toolHandlers: ToolHandlerMap): Router;
//# sourceMappingURL=toolRoutes.d.ts.map