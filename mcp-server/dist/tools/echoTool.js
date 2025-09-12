export const echoTool = {
    name: 'echo',
    description: 'Echo back the provided message.',
    inputSchema: {
        type: 'object',
        properties: {
            message: {
                type: 'string',
                description: 'The message to echo back'
            },
        },
        required: ['message'],
    },
};
export async function executeEchoTool(params) {
    const { message } = params;
    return {
        content: [
            {
                type: 'text',
                text: `Echo: ${message}`
            }
        ]
    };
}
//# sourceMappingURL=echoTool.js.map