import { z } from 'zod';

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  mapUrl: z.string().optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  paymentQrUrl: z.string().optional().or(z.literal('')),
  paymentInstructions: z.string().optional().or(z.literal('')),
  customQuestions: z.array(z.any()).optional(),
  maxRegistrations: z.coerce.number().optional(),
  registrationDeadline: z.string().optional().or(z.literal('')),
  isTeamEvent: z.boolean().optional(),
  minTeamSize: z.coerce.number().optional(),
  maxTeamSize: z.coerce.number().optional(),
  category: z.enum(['Hackathon', 'Event', 'Workshop', 'CTF', 'Quiz', 'Hardware', 'Design', 'Gaming', 'Entrepreneurship', 'Tech Olympiad', 'Lectures', 'Drone Arena', 'Aerofiled']).optional(),
  isPaused: z.boolean().optional(), // Added for PUT requests (togglePause)
});
