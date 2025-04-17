import { z } from "zod";

export const userProfileSetupSchema = z.object({
  username: z.string().min(3).max(32),
  bio: z.string().max(280).optional(),
});

// For modification
export const userProfileSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  bio: z.string().max(280).optional(),
  profilePic: z.string().optional(),
  bannerPic: z.string().optional(),
  colorTheme: z.string().optional(),
});
