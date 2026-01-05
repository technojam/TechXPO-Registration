import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'uploads';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined in environment variables');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

// Ensure container exists
const initContainer = async () => {
  try {
    await containerClient.createIfNotExists({
      access: 'blob' // Public read access for blobs
    });
  } catch (error) {
    console.error('Error creating Azure container:', error);
  }
};

// Initialize once
initContainer();

export { containerClient };

export const deleteFileFromUrl = async (fileUrl: string) => {
  try {
    if (!fileUrl) return;
    
    // Extract blob name from URL
    // Format: https://<account>.blob.core.windows.net/<container>/<blobName>
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    // pathParts[0] is empty, pathParts[1] is container, pathParts[2...] is blobName
    const blobName = pathParts.slice(2).join('/');
    
    if (blobName) {
      await containerClient.deleteBlob(blobName);
    }
  } catch (error) {
    console.error(`Error deleting file ${fileUrl}:`, error);
    // Continue even if delete fails (maybe file already gone)
  }
};

