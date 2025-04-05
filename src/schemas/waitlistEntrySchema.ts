import { z } from "zod";

export const waitlistEntrySchema = z.object({
  firstName: z
    .string()
    .min(1, "Name is mandatory")
    .max(50, "First name cannot exceed 50 characters"),
  secondName: z
    .string()
    .max(50, "Second name cannot exceed 50 characters")
    .optional(),
  email: z.string().email("Email must be valid"),
  message: z
    .string()
    .max(255, "Message cannot exceed 255 characters")
    .optional(),
});

export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;
