import { NextResponse } from 'next/server';
import { verifyBackendToken } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const decodedToken = await verifyBackendToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', isAdmin: false },
        { status: 401 }
      );
    }

    // specific admin check is already done inside verifyBackendToken
    
    return NextResponse.json({ 
        isAdmin: true,
        uid: decodedToken.uid,
        email: decodedToken.email 
    });
    
  } catch (error) {
    console.error('Verify Admin API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
