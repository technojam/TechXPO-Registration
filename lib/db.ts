import { container, initCosmos } from './cosmos';
import { deleteFileFromUrl } from './azure';
import { PatchOperation } from '@azure/cosmos';

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location: string;
  mapUrl?: string;
  imageUrl?: string;
  paymentQrUrl?: string;
  paymentInstructions?: string;
  maxRegistrations?: number;
  registrationDeadline?: string;
  isPaused?: boolean;
  category?: 'Hackathon' | 'Event' | 'Workshop' | 'CTF' | 'Quiz' | 'Hardware' | 'Design' | 'Gaming' | 'Entrepreneurship' | 'Tech Olympiad' | 'Lectures' | 'Drone Arena' | 'Aerofield';
  isTeamEvent?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  isFree?: boolean;
  customQuestions?: CustomQuestion[];
  registrations: Registration[];
}

export interface CustomQuestion {
  id: string;
  text: string;
  type: 'text' | 'select';
  options?: string[];
  required: boolean;
  scope?: 'team' | 'member';
}

export interface Registration {
  id: string;
  name?: string;
  email?: string;
  teamName?: string;
  paymentProofUrl?: string;
  answers?: Record<string, string>;
  members?: {
    name?: string;
    email?: string;
    answers?: Record<string, string>;
  }[];
}

export async function getEvents(): Promise<Event[]> {
  try {
    await initCosmos();
    const { resources } = await container.items
      .query("SELECT * from c")
      .fetchAll();
    return resources as Event[];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function getPublicEvents(): Promise<Omit<Event, 'registrations'>[]> {
  try {
    await initCosmos();
    // Use a query that excludes the registrations field to reduce payload and increase security
    const { resources } = await container.items
      .query("SELECT c.id, c.title, c.description, c.startDate, c.endDate, c.startTime, c.endTime, c.location, c.mapUrl, c.imageUrl, c.category, c.isPaused, c.registrationDeadline, c.isFree from c")
      .fetchAll();
    return resources as Omit<Event, 'registrations'>[];
  } catch (error) {
    console.error("Error fetching public events:", error);
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | undefined> {
  try {
    await initCosmos();
    const { resource } = await container.item(id, id).read();
    return resource as Event;
  } catch (error) {
    console.error(`Error fetching event ${id}:`, error);
    return undefined;
  }
}

export async function addEvent(event: Event): Promise<void> {
  try {
    await initCosmos();
    const { id, ...rest } = event;
    // Ensure ID is set for partition key
    await container.items.create({
       id: id,
       ...rest,
       registrations: []
    });
  } catch (error) {
    console.error("Error adding event:", error);
    throw error;
  }
}

export async function updateEvent(updatedEvent: Event): Promise<boolean> {
  try {
    await initCosmos();
    // Cosmos DB requires the partition key (id) for updates
    await container.item(updatedEvent.id, updatedEvent.id).replace(updatedEvent);
    return true;
  } catch (error) {
    console.error("Error updating event:", error);
    return false;
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    await initCosmos();

    // 1. Fetch event to get file URLs
    const event = await getEventById(id);
    if (event) {
      const filesToDelete: string[] = [];
      
      if (event.imageUrl) filesToDelete.push(event.imageUrl);
      if (event.paymentQrUrl) filesToDelete.push(event.paymentQrUrl);
      
      if (event.registrations && event.registrations.length > 0) {
        event.registrations.forEach(reg => {
          if (reg.paymentProofUrl) filesToDelete.push(reg.paymentProofUrl);
        });
      }

      // 2. Delete all associated files from Azure Storage
      await Promise.all(filesToDelete.map(url => deleteFileFromUrl(url)));
    }

    // 3. Delete the event document
    await container.item(id, id).delete();
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    return false;
  }
}

export async function addRegistration(eventId: string, registration: Registration): Promise<{ success: boolean; error?: string }> {
  try {
    await initCosmos();
    // Reading the item first to check constraints
    const { resource: event } = await container.item(eventId, eventId).read<Event>();
    
    if (!event) {
       return { success: false, error: 'Event not found' };
    }

    const currentRegistrations = event.registrations || [];
    if (event.maxRegistrations && currentRegistrations.length >= event.maxRegistrations) {
      return { success: false, error: 'Event is full' };
    }

    // Since Cosmos DB items are documents, we can just push to the array and replace,
    // or use Patch API for better atomicity.
    
    // Using Patch API to append to the registrations array
    // Note: Cosmos DB Patch operations
    const operations: PatchOperation[] = [
      { op: 'add', path: '/registrations/-', value: registration }
    ];

    // If registratons array doesn't exist, we might need to initialize it first or use a conditional patch.
    // However, our data model ensures it exists on creation.
    
    await container.item(eventId, eventId).patch(operations);

    return { success: true };
  } catch (error: any) {
    console.error("Error adding registration:", error);
    return { success: false, error: 'System busy or error occurred' };
  }
}

export async function deleteRegistration(eventId: string, registrationId: string): Promise<boolean> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await initCosmos();
      const itemResponse = await container.item(eventId, eventId).read<Event>();
      const event = itemResponse.resource;
      const etag = itemResponse.etag;
      
      if (!event || !event.registrations) return false;

      const registrationIndex = event.registrations.findIndex(r => r.id === registrationId);
      if (registrationIndex === -1) return false; // Already deleted?

      const registration = event.registrations[registrationIndex];

      // 1. Delete payment proof if exists (only on first attempt to avoid re-deletion errors if we retry db update)
      if (retryCount === 0 && registration.paymentProofUrl) {
        // We do this async and don't block? Or block?
        // If we fail updating DB, we shouldn't have deleted the file?
        // Ideally we delete file AFTER DB confirmation.
      }

      // 2. Remove registration from array
      const updatedRegistrations = event.registrations.filter(r => r.id !== registrationId);
      event.registrations = updatedRegistrations;

      // 3. Update with ETag check
      await container.item(eventId, eventId).replace(event, {
        accessCondition: { type: 'IfMatch', condition: etag! }
      });

      // 4. Now delete the file safely
      if (registration.paymentProofUrl) {
         await deleteFileFromUrl(registration.paymentProofUrl).catch(e => console.error("Failed to delete file after DB update", e));
      }

      return true;
    } catch (error: any) {
      if (error.code === 412) { // Precondition Failed
        console.warn(`Concurrency conflict deleting registration ${registrationId}, retrying... (${retryCount + 1})`);
        retryCount++;
        continue;
      }
      console.error("Error deleting registration:", error);
      return false;
    }
  }
  return false;
}
