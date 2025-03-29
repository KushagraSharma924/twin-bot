import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Get the current cookie store
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    // If there's a token, make a request to the backend to invalidate it
    if (token) {
      try {
        // Call backend logout endpoint to invalidate the token
        await fetch(`${process.env.BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Log but continue - we'll still delete the cookies
        console.error('Error calling backend logout endpoint:', error);
      }
    }

    // Create a response
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // Delete the auth cookies by setting to expired
    response.cookies.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/',
    });

    response.cookies.set({
      name: 'refresh_token',
      value: '',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in logout API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 