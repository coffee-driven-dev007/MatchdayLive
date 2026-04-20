import { z } from 'zod';

// Query schema for listing commentary: optional limit coerced to a positive integer (max 100)
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Schema for creating commentary entries
export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().min(0).optional(),
  sequence: z.coerce.number().int().min(0).optional(),
  period: z.string().optional(),
  eventType: z.string().optional(),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
});
