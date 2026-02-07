import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Use server-side private key (or fallback for migration)
    const apiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Authenticate with Google Identity Platform (REST API)
    // This allows us to sign in with email/password from the server
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const signInData = await signInRes.json();

    if (!signInRes.ok) {
        return NextResponse.json(
            { error: 'Invalid email or password' }, // Don't leak specific error details to client
            { status: 401 }
        );
    }

    const idToken = signInData.idToken;

    // 2. Create Session Cookie (expires in 1 hour)
    const expiresIn = 60 * 60 * 1000;
    
    // Verify user is allowed before creating session
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (!adminEmails.includes(email)) {
         return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 3. Set Cookie via Next.js
    (await cookies()).set('__session', sessionCookie, {
        maxAge: expiresIn / 1000, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
