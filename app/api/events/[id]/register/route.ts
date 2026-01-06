import { NextResponse } from 'next/server';
import { addRegistration, Registration, getEventById } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { registrationSchema } from '@/lib/registrationSchema';

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

  return NextResponse.json(newRegistration, { status: 201 });
}
