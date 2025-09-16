import { NextRequest, NextResponse } from 'next/server';

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Implement user registration without database
    // For now, return success without storing data
    return NextResponse.json(
      {
        id: Date.now(), // Temporary ID
        message: 'User registration placeholder - database removed'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
