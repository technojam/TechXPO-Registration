import { NextResponse } from 'next/server';
import { getEventById, updateEvent, deleteEvent, Event } from '@/lib/db';
import { containerClient, generateSasUrl } from '@/lib/azure';
import { verifyBackendToken } from '@/lib/firebase-admin';
import { eventSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Check for admin token
  const decodedToken = await verifyBackendToken(request);

  if (!decodedToken) {
    // Public User: Strip sensitive data but include registration count
    const registrationCount = (event.registrations && Array.isArray(event.registrations)) 
      ? event.registrations.length 
      : 0;
    
    // Create a new object with all fields except registrations, then add registrationCount
    const responseObj: any = {};
    for (const [key, value] of Object.entries(event)) {
      if (key !== 'registrations') {
        responseObj[key] = value;
      }
    }
    responseObj.registrationCount = registrationCount;
    
    return NextResponse.json(responseObj);
  }

  // Admin User: Return full data with SAS tokens for secure images
  const registrationsWithSas = event.registrations.map(reg => ({
    ...reg,
    paymentProofUrl: reg.paymentProofUrl ? generateSasUrl(reg.paymentProofUrl) : '',
  }));

  return NextResponse.json({
    ...event,
    registrations: registrationsWithSas
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await verifyBackendToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const parseResult = eventSchema.partial().safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
  }
  const validData = parseResult.data;

  const existingEvent = await getEventById(id);

  if (!existingEvent) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const updatedEvent: Event = {
    ...existingEvent,
    ...validData,
    id: id, // Ensure ID doesn't change
    registrations: existingEvent.registrations, // Preserve registrations
  };

  const success = await updateEvent(updatedEvent);

  if (!success) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }

  return NextResponse.json(updatedEvent);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await verifyBackendToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  
  // Get event details first to find images
  const event = await getEventById(id);
  
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Helper function to delete file from Azure Blob Storage
  const deleteFile = async (url: string) => {
    try {
      // Extract blob name from URL
      // Azure URL format: https://<account>.blob.core.windows.net/<container>/<blobname>
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // The last part is the blob name
      const blobName = pathParts[pathParts.length - 1]; 
      
      if (blobName) {
        const blockBlobClient = containerClient.getBlockBlobClient(decodeURIComponent(blobName));
        await blockBlobClient.deleteIfExists();
      }
    } catch (error) {
      console.error(`Failed to delete file: ${url}`, error);
    }
  };

  // Delete associated images
  if (event.imageUrl) {
    await deleteFile(event.imageUrl);
  }
  if (event.paymentQrUrl) {
    await deleteFile(event.paymentQrUrl);
  }

  const success = await deleteEvent(id);

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Event deleted successfully' });
}
