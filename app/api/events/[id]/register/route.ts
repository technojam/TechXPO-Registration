import { NextResponse } from 'next/server';
import { addRegistration, Registration, getEventById } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { registrationSchema } from '@/lib/registrationSchema';
import { sendConfirmationEmail } from '@/lib/email';
import { waitUntil } from '@vercel/functions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Validate Input
  const parseResult = registrationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
  }

  const { name, email, teamName, paymentProofUrl, answers, members } = parseResult.data;

  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Check if registration is paused
  if (event.isPaused) {
    return NextResponse.json({ error: 'Registration is currently paused' }, { status: 400 });
  }

  // Check registration deadline
  if (event.registrationDeadline) {
    const deadline = new Date(event.registrationDeadline);
    const now = new Date();
    if (now > deadline) {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 400 });
    }
  }

  // Check max registrations
  if (event.maxRegistrations && event.registrations.length >= event.maxRegistrations) {
    return NextResponse.json({ error: 'Event is full' }, { status: 400 });
  }

  const newRegistration: Registration = {
    id: uuidv4(),
    name,
    email,
    teamName,
    paymentProofUrl,
    answers,
    members,
  };

  const result = await addRegistration(id, newRegistration);

  if (!result.success) {
    if (result.error === 'Event is full') {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 });
    }
    if (result.error === 'Event not found') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error || 'Registration failed' }, { status: 500 });
  }

  // Send Confirmation Email asynchronously using Vercel's waitUntil to prevent timeout blocking
  // This ensures the response is sent immediately while the email sends in the background
  // Check if email sending is enabled for this event
  if (event.sendConfirmationEmail !== false) { // Default to true if undefined
     const azureEmailUrl = process.env.AZURE_EMAIL_FUNCTION_URL;
     const azureFunctionKey = process.env.AZURE_EMAIL_FUNCTION_KEY;

     if (azureEmailUrl) {
        // Use Azure Function to offload execution
        waitUntil(
           fetch(azureEmailUrl, {
              method: 'POST',
              headers: {
                 'Content-Type': 'application/json',
                 ...(azureFunctionKey ? { 'x-functions-key': azureFunctionKey } : {})
              },
              body: JSON.stringify({
                 event: {
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    location: event.location,
                    mapUrl: event.mapUrl,
                    imageUrl: event.imageUrl,
                    customQuestions: event.customQuestions
                 },
                 registration: newRegistration
              })
           }).catch(err => console.error("Failed to trigger Azure Email Function:", err))
        );
     } else {
        console.warn("AZURE_EMAIL_FUNCTION_URL is not set. Email will NOT be sent.");
     }
  }

  return NextResponse.json(newRegistration, { status: 201 });
}
