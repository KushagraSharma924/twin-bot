import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Make a request to your actual backend service
    const response = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Forward the error status from the backend
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: response.status }
      );
    }

    // Get the user data from the backend response
    const userData = await response.json();

    // Return the user data
    return NextResponse.json({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      // Add any additional user properties you need
    });
  } catch (error) {
    console.error('Error in user profile API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 