import { NextResponse } from 'next/server';
import { deleteRegistration } from '@/lib/db';
import { verifyBackendToken } from '@/lib/firebase-admin';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; regId: string }> }
) {
  // Verify Admin
  const decodedToken = await verifyBackendToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, regId } = await params;
    const success = await deleteRegistration(id, regId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete registration or not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
