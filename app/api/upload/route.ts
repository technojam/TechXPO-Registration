import { NextResponse } from 'next/server';
import { containerClient } from '@/lib/azure';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Security Validation
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only image files (JPEG, PNG, WEBP, GIF) are allowed' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const filename = `${uuidv4()}-${file.name.replace(/\s/g, '-')}`;
  
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: file.type }
    });
    
    // Return the URL
    // Ensure the container has public access enabled in Azure Portal
    return NextResponse.json({ url: blockBlobClient.url });
  } catch (error) {
    console.error('Error uploading file to Azure:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
