import { NextResponse } from 'next/server';
import { getEvents, addEvent, Event } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { verifyBackendToken } from '@/lib/firebase-admin';
import { eventSchema } from '@/lib/schemas';

export async function GET(request: Request) {
  // Protect this route as it returns sensitive registration data
  const decodedToken = await verifyBackendToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await getEvents();
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const decodedToken = await verifyBackendToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const parseResult = eventSchema.safeParse(body);
  
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
  }

  const data = parseResult.data;

  const newEvent: Event = {
    id: uuidv4(),
    title: data.title,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    location: data.location,
    mapUrl: data.mapUrl || undefined,
    imageUrl: data.imageUrl || undefined,
    paymentQrUrl: data.paymentQrUrl || undefined,
    paymentInstructions: data.paymentInstructions || undefined,
    maxRegistrations: data.maxRegistrations,
    registrationDeadline: data.registrationDeadline || undefined,
    isTeamEvent: data.isTeamEvent,
    minTeamSize: data.minTeamSize,
    maxTeamSize: data.maxTeamSize,
    category: data.category || 'Event',
    customQuestions: data.customQuestions || [],
    registrations: [],
  };

  await addEvent(newEvent);
  return NextResponse.json(newEvent, { status: 201 });
}
