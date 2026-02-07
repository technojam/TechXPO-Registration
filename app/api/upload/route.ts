import { NextResponse } from 'next/server';
import { containerClient } from '@/lib/azure';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(request: Request) {
  // Public Endpoint: Required for public users to upload payment proofs during registration
  // Security relies on: 
  // 1. Strict file type validation (images only)
  // 2. Size limits (5MB)
  // 3. Image conversion (strips executable code)
  // 4. Origin Check (Prevent hotlinking/abuse)

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host'); // e.g., localhost:3000

  // Allow requests only if they match the host (basic CSRF-like protection)
  // We skip this check in non-production generally, but here we can be loose
  if (process.env.NODE_ENV === 'production') {
      const allowed = origin?.includes(host!) || referer?.includes(host!);
      if (!allowed) {
          return NextResponse.json({ error: 'Forbidden Origin' }, { status: 403 });
      }
  }

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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Convert to WebP
  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer)
      .webp({ quality: 80 }) // Compress with decent quality
      .toBuffer();
  } catch (error) {
    console.error('Error converting image to WebP:', error);
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
  }

  // Generate new filename with .webp extension
  const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const filename = `${uuidv4()}-${originalNameWithoutExt.replace(/\s/g, '-')}.webp`;
  
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(webpBuffer, {
      blobHTTPHeaders: { blobContentType: 'image/webp' }
    });
    
    // Return the URL
    // Ensure the container has public access enabled in Azure Portal
    return NextResponse.json({ url: blockBlobClient.url });
  } catch (error) {
    console.error('Error uploading file to Azure:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
