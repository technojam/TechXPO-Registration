import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Server-side)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);

    // SECURITY: Enforce Admin Email Whitelist
    // Even if a user manages to "Simulate Login" or create a dummy account via public API,
    // they cannot perform any actions unless their email is in this server-side list.
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (!decodedToken.email || !adminEmails.includes(decodedToken.email)) {
      console.warn(`Unauthorized Access Attempt: ${decodedToken.email} is not an admin.`);
      return null;
    }

    return decodedToken;
    
  } catch (error) {
    console.error('Auth Verification Failed:', error);
    return null;
  }
}
