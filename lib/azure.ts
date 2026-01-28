import { 
  BlobServiceClient, 
  StorageSharedKeyCredential, 
  generateBlobSASQueryParameters, 
  BlobSASPermissions 
} from '@azure/storage-blob';

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
    // SECURITY: We do NOT set access level to 'blob' (public) automatically.
    // It should be private (default) to protect sensitive uploads.
    // Use SAS tokens to access files securely.
    await containerClient.createIfNotExists(); 
  } catch (error) {
    console.error('Error creating Azure container:', error);
  }
};

// Initialize once
initContainer();

export { containerClient };

export const generateSasUrl = (fileUrl: string, expiresInMinutes: number = 60) => {
    try {
        if (!fileUrl) return '';

        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/');
        // pathParts[0] is empty, pathParts[1] is container
        const blobName = pathParts.slice(2).join('/');
        
        // Extract account name and key from connection string
        // This is a bit hacky but works for standard connection strings. 
        // Better to use a stored StorageSharedKeyCredential if available, 
        // but Connection String abstraction hides it.
        // HOWEVER, BlobServiceClient.fromConnectionString creates a pipeline.
        // To generate SAS, we need the credential explicitly or use delegated SAS if we had AD.
        // Parsing connection string manually:
        const parts = AZURE_STORAGE_CONNECTION_STRING!.split(';').reduce((acc, part) => {
            const [key, value] = part.split('=', 2);
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        const sharedKeyCredential = new StorageSharedKeyCredential(
            parts.AccountName,
            parts.AccountKey
        );

        const sasOptions = {
            containerName: AZURE_CONTAINER_NAME,
            blobName: blobName,
            permissions: BlobSASPermissions.parse("r"), // Read only
            startsOn: new Date(new Date().valueOf() - 5 * 60 * 1000), // Start 5 minutes in the past to prevent clock skew errors
            expiresOn: new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000),
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        
        return `${fileUrl}?${sasToken}`;
    } catch (error) {
        console.error("Error generating SAS URL:", error);
        return fileUrl; // Fallback to raw URL if generation fails (might be public container)
    }
};

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

