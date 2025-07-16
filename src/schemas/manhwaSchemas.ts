import { z } from "zod";

// Search validation with API limits in mind
export const searchManhwaSchema = z.object({
  query: z.string()
    .min(1, "Search query required")
    .max(200, "Query too long")
    .trim(),
  
  filters: z.object({
    // Genre slugs from our database, not Mangadex UUIDs
    genres: z.array(z.string().max(50)).max(10).optional(),
    
    // Match Mangadex status values (lowercase)
    status: z.array(
      z.enum(['ongoing', 'completed', 'hiatus', 'cancelled'])
    ).optional(),
    
    yearRange: z.object({
      start: z.number().int().min(1900).max(new Date().getFullYear()),
      end: z.number().int().min(1900).max(new Date().getFullYear())
    }).refine(data => data.start <= data.end, {
      message: "Start year must be before end year"
    }).optional()
  }).optional(),
  
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20) // API max is 100
  }),
  
  includeExternal: z.boolean().default(false)
});

// Create schema matching our data model
export const createManhwaSchema = z.object({
  title: z.object({
    primary: z.string().min(1).max(500),
    alternatives: z.array(z.object({
      language: z.string().length(2), // ISO 639-1
      title: z.string().min(1).max(500)
    })).max(20).optional(),
    romanized: z.string().max(500).optional()
  }),
  synopsis: z.string().min(10, "Synopsis too short").max(5000),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED']),
  publisher: z.string().max(255).optional(),
  totalChapters: z.number().int().min(0).optional(),
  genres: z.array(z.string().max(50)).max(20).optional()
});

// Bulk operations with safety limits
export const bulkGetManhwaSchema = z.object({
  ids: z.array(z.union([
    z.string().regex(/^\d+$/, "Invalid ID format"),
    z.number().int().positive()
  ])).min(1).max(100, "Too many IDs requested")
});

// Import from Mangadex schema
export const importManhwaSchema = z.object({
  mangadexId: z.string().uuid("Invalid Mangadex ID format")
});

// Update schema (partial)
export const updateManhwaSchema = createManhwaSchema.partial();

// Type exports for use in controllers/services
export type SearchManhwaInput = z.infer<typeof searchManhwaSchema>;
export type CreateManhwaInput = z.infer<typeof createManhwaSchema>;
export type BulkGetManhwaInput = z.infer<typeof bulkGetManhwaSchema>;
export type ImportManhwaInput = z.infer<typeof importManhwaSchema>;
export type UpdateManhwaInput = z.infer<typeof updateManhwaSchema>;