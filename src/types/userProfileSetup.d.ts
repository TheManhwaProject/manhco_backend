import { z } from "zod";

export const userProfileSetupSchema = z.object({
  username: z.string().min(3).max(32),
  bio: z.string().max(280).optional(),
});
