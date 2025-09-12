// API route for testing MCP server connectivity and emitting events
// This endpoint allows testing the MCP integration from the frontend

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if MCP server is accessible
    const mcpUrl = process.env.NEXT_PUBLIC_MCP_SOCKET_URL || 'http://localhost:3001';
    
    return NextResponse.json({
      success: true,
      message: 'MCP API endpoint is accessible',
      data: {
        mcpUrl,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('❌ MCP API Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'MCP API endpoint error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payload } = body;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event name is required'
        },
        { status: 400 }
      );
    }

    // Here you would typically emit to the actual MCP server
    // For testing purposes, we'll simulate the response
    console.log('🚀 MCP Emit Test:', { event, payload });

    // Simulate a successful emission
    const response = {
      success: true,
      message: `Successfully emitted event: ${event}`,
      data: {
        event,
        payload,
        timestamp: new Date().toISOString(),
        status: 'emitted'
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ MCP Emit Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to emit MCP event',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
