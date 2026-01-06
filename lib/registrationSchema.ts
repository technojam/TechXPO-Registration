import { z } from 'zod';

export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  teamName: z.string().optional(),
  paymentProofUrl: z.string().optional(),
  answers: z.record(z.string()).optional(),
  members: z.array(z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid member email").optional(),
    answers: z.record(z.string()).optional(),
  })).optional(),
});
