import { NextRequest, NextResponse } from 'next/server';
import { statements } from '@/lib/database';
import bcrypt from 'bcryptjs';

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

    // Check if user already exists
    const existingUser = statements.getUserByEmail.get(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = statements.createUser.run(
      email,
      name,
      hashedPassword,
      'user'
    );

    return NextResponse.json(
      {
        id: result.lastInsertRowid,
        message: 'User created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
