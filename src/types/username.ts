import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3)
  .max(16)
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores allowed");
