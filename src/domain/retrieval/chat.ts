/** Shared, validated contract for the only network request in the app. */
import { config } from '@/config';
import { z } from 'zod';
import { localeSchema } from '@/domain/profile';

/** The minimum payload needed for a grounded answer. */
export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(config.chat.maxQuestionChars),
  digest: z.string().trim().min(1).max(config.chat.maxDigestChars),
  locale: localeSchema,
  sourceIds: z.array(z.string().min(1)),
});

/** Validated request accepted by `POST /api/chat`. */
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** The only remote response shape the client accepts. */
export const chatResponseSchema = z.object({
  answer: z.string().trim().min(1),
  sourceIds: z.array(z.string().min(1)),
  mode: z.literal('remote'),
});

/** Validated remote answer with citation ids. */
export type ChatResponse = z.infer<typeof chatResponseSchema>;

/** Machine-readable failures that all trigger the local fallback. */
export type ChatErrorCode = 'offline' | 'rate-limited' | 'invalid' | 'unavailable';

/** Result of one optional chat attempt. */
export type ChatOutcome = { ok: true; response: ChatResponse } | { ok: false; error: ChatErrorCode };
