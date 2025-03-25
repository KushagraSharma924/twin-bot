const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    name: string | null;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    name: string | null;
  };
  message: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to login');
  }

  return response.json();
}

export async function signup(email: string, password: string, name: string): Promise<SignupResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign up');
  }

  return response.json();
}

export async function checkVerificationStatus(email: string): Promise<{ verified: boolean; message: string, user?: { id: string, email: string, name: string | null } }> {
  const response = await fetch(`${API_URL}/api/auth/verification-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check verification status');
  }

  return response.json();
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resend verification email');
  }

  return response.json();
}

export function logout(): void {
  localStorage.removeItem('session');
  localStorage.removeItem('user');
}

export function getUser(): { id: string; email: string; name?: string } | null {
  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  return userJson ? JSON.parse(userJson) : null;
}

export function getSession(): { access_token: string; refresh_token: string } | null {
  const sessionJson = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
  return sessionJson ? JSON.parse(sessionJson) : null;
} 