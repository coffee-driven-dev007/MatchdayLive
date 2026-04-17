import { z } from 'zod';

// Key-value constant for match statuses (values are lowercase)
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Query schema for listing matches: optional limit coerced to a positive integer (max 100)
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Params schema for match id: required id coerced to a positive integer
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Helper to validate ISO date string (uses Date.parse to verify parsable ISO string)
const isValidIsoDateString = (value) => {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return !Number.isNaN(time);
};

// Schema for creating a match
export const createMatchSchema = z
  .object({
    sport: z.string().min(1).transform((s) => s.trim()),
    homeTeam: z.string().min(1).transform((s) => s.trim()),
    awayTeam: z.string().min(1).transform((s) => s.trim()),
    startTime: z.string().refine(isValidIsoDateString, {
      message: 'startTime must be a valid ISO date string',
    }),
    endTime: z.string().refine(isValidIsoDateString, {
      message: 'endTime must be a valid ISO date string',
    }),
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    // Only run chronological check if both times parse correctly
    const start = Date.parse(data.startTime);
    const end = Date.parse(data.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime must be after startTime',
        path: ['endTime'],
      });
    }
  });

// Schema for updating scores: requires homeScore and awayScore as coerced non-negative integers
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});
