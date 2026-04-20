import express from 'express';
import { ZodError } from 'zod';
import { matchIdParamSchema } from '../validation/matches.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const commentaryRouter = express.Router({ mergeParams: true });

const MAX_LIMIT = 100;

// POST / (mounted at /matches/:id/commentary)
commentaryRouter.post('/', async (req, res) => {
  try {
    // Validate params and body
    const params = matchIdParamSchema.parse(req.params);
    const payload = createCommentarySchema.parse(req.body);

    // Prepare payload for insertion. Ensure tags are stored as text (JSON string)
    const insertPayload = {
      matchId: params.id,
      minute: payload.minute,
      sequence: payload.sequence,
      period: payload.period,
      eventType: payload.eventType,
      actor: payload.actor,
      team: payload.team,
      message: payload.message,
      metadata: payload.metadata,
      tags: Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : payload.tags,
    };

    // Insert into DB. Drizzle uses the schema's camelCase keys.
    const [created] = await db.insert(commentary).values(insertPayload).returning();

    // Trigger Broadcast to WebSocket clients subscribed to this match's commentary
    if(res.app.locals.broadcastCommentary){
      res.app.locals.broadcastCommentary(created.matchId, created)
    }

    return res.status(201).json(created);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ errors: err.errors });
    }
    console.error('Failed to create commentary', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / (mounted at /matches/:id/commentary)
commentaryRouter.get('/', async (req, res) => {
  // Validate params and query
  const paramsParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: 'Invalid params', details: paramsParsed.error.issues });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: queryParsed.error.issues });
  }

  const limit = Math.min(queryParsed.data.limit ?? 100, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramsParsed.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Failed to fetch commentary', err);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

