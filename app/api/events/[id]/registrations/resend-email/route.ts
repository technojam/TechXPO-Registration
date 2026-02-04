import { NextResponse } from 'next/server';
import { getEventById, updateEvent } from '@/lib/db';
import { verifyBackendToken } from '@/lib/firebase-admin';
import { sendConfirmationEmail } from '@/lib/email';
import { waitUntil } from '@vercel/functions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await verifyBackendToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { registrationId } = await request.json();

  if (!registrationId) {
    return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
  }

  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const registration = event.registrations.find(r => r.id === registrationId);
  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  // Trigger email send
  try {
      // Use waitUntil to prevent timeouts when the email service is throttled.
      // The admin will see "Email queued" immediately.
      waitUntil(
          sendConfirmationEmail(event, registration).catch(err => 
              console.error("Manual email resend failed async:", err)
          )
      );
      
      return NextResponse.json({ success: true, message: 'Email queued for sending' });
  } catch (error) {
      console.error("Manual email resend failed:", error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
