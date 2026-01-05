import { CosmosClient } from '@azure/cosmos';

const AZURE_COSMOS_CONNECTION_STRING = process.env.AZURE_COSMOS_CONNECTION_STRING;
const DATABASE_NAME = 'techxpo';
const CONTAINER_NAME = 'events';

if (!AZURE_COSMOS_CONNECTION_STRING) {
  throw new Error('AZURE_COSMOS_CONNECTION_STRING is not defined');
}

const client = new CosmosClient(AZURE_COSMOS_CONNECTION_STRING);
const database = client.database(DATABASE_NAME);
const container = database.container(CONTAINER_NAME);

// Helper to ensure database and container exist
// Note: In production, it's better to create these via Terraform/Portal/CLI
// rather than checking on every cold start.
let initPromise: Promise<void> | null = null;

export const initCosmos = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { database } = await client.databases.createIfNotExists({ id: DATABASE_NAME });
        await database.containers.createIfNotExists({ id: CONTAINER_NAME, partitionKey: '/id' });
      } catch (error) {
        console.warn('Error initializing Cosmos DB resources:', error);
        throw error;
      }
    })();
  }
  return initPromise;
};

export { container };
