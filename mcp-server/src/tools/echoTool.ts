import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const echoTool: Tool = {
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

export async function executeEchoTool(params: any) {
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
