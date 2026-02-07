import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Server-side)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle private keys with escaped newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin Initialized');
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

export const adminAuth = admin.auth();

export async function verifyBackendToken(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    let decodedToken;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      decodedToken = await adminAuth.verifyIdToken(token);
    } else {
      // Fallback: Check for session cookie
      const cookieHeader = request.headers.get('Cookie') || '';
      const sessionCookie = cookieHeader
        .split(';')
        .find(c => c.trim().startsWith('__session='));
      
      if (sessionCookie) {
        const token = sessionCookie.split('=')[1];
        decodedToken = await adminAuth.verifySessionCookie(token, true /** checkRevoked */);
      } else {
        return null;
      }
    }

    // SECURITY: Enforce Admin Email Whitelist
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (!decodedToken.email || !adminEmails.includes(decodedToken.email)) {
      console.warn(`Unauthorized Access Attempt: ${decodedToken.email} is not an admin.`);
      return null;
    }

    return decodedToken;
    
  } catch (error) {
    // console.error('Auth Verification Failed:', error); // Silent fail for cleaner logs
    return null;
  }
}
