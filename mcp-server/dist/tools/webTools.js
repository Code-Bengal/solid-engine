export const getCurrentPageTool = {
    name: 'getCurrentPage',
    description: 'Get current page information from the Next.js frontend',
    inputSchema: {
        type: 'object',
        properties: {
            sessionId: {
                type: 'string',
                description: 'Optional session ID to target specific client'
            }
        },
        required: []
    }
};
export const getElementsTool = {
    name: 'getElements',
    description: 'Get elements on current page by type (clickable, input, or all)',
    inputSchema: {
        type: 'object',
        properties: {
            elementType: {
                type: 'string',
                enum: ['clickable', 'input', 'all'],
                description: 'Type of elements to retrieve',
                default: 'clickable'
            },
            sessionId: {
                type: 'string',
                description: 'Optional session ID to target specific client'
            }
        },
        required: []
    }
};
export const clickElementTool = {
    name: 'clickElement',
    description: 'Click an element on the current page',
    inputSchema: {
        type: 'object',
        properties: {
            elementName: {
                type: 'string',
                description: 'The data-clickable-element attribute value to click'
            },
            sessionId: {
                type: 'string',
                description: 'Optional session ID to target specific client'
            }
        },
        required: ['elementName']
    }
};
export const fillInputTool = {
    name: 'fillInput',
    description: 'Fill an input element with data (supports text inputs, radio buttons, checkboxes, select dropdowns, textareas)',
    inputSchema: {
        type: 'object',
        properties: {
            inputName: {
                type: 'string',
                description: 'The data-input-element attribute value of the input to fill'
            },
            inputType: {
                type: 'string',
                description: 'The type of input (text, email, password, radio, checkbox, select, textarea, etc.)'
            },
            data: {
                type: ['string', 'boolean'],
                description: 'The data to fill into the input'
            },
            sessionId: {
                type: 'string',
                description: 'Optional session ID to target specific client'
            }
        },
        required: ['inputName', 'inputType', 'data']
    }
};
export const navigatePageTool = {
    name: 'navigatePage',
    description: 'Navigate to a specific page',
    inputSchema: {
        type: 'object',
        properties: {
            page: {
                type: 'string',
                description: 'The page path to navigate to'
            },
            sessionId: {
                type: 'string',
                description: 'Optional session ID to target specific client'
            }
        },
        required: ['page']
    }
};
//# sourceMappingURL=webTools.js.map