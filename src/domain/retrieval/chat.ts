/** Shared, validated contract for the only network request in the app. */
import { config } from '@/config';
import { z } from 'zod';
import { localeSchema } from '@/domain/profile';
import { retrieve } from '@/domain/retrieval';

/** The minimum payload needed for a grounded answer. */
export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(config.chat.maxQuestionChars),
  digest: z.string().trim().min(1).max(config.chat.maxDigestChars),
  locale: localeSchema,
  sourceIds: z.array(z.string().min(1)),
});

/** Validated request accepted by `POST /api/chat`. */
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Provenance of a validated answer; `mode` stays `"remote"` for compatibility. */
const answerSourceSchema = z.enum(['model', 'local']);

/** Fields shared by model answers and local fallback answers. */
const answerFields = {
  answer: z.string().trim().min(1),
  sourceIds: z.array(z.string().min(1)),
  mode: z.literal('remote'),
};

/** The only response shape the client accepts: every answer declares its source. */
export const chatResponseSchema = z.object({
  ...answerFields,
  source: answerSourceSchema,
});

/** Provider payloads may omit `source`; the server always stamps it as `model`. */
export const providerResponseSchema = z.object({
  ...answerFields,
  source: answerSourceSchema.optional(),
});

/** Validated answer with citation ids and explicit provenance. */
export type ChatResponse = z.infer<typeof chatResponseSchema>;

/** Machine-readable failures that all trigger the local fallback. */
export type ChatErrorCode = 'offline' | 'rate-limited' | 'invalid' | 'unavailable';

/** Result of one optional chat attempt. */
export type ChatOutcome = { ok: true; response: ChatResponse } | { ok: false; error: ChatErrorCode };

/** Builds a schema-valid local BM25 answer using only requested, known citation ids. */
export const localChatAnswer = (request: ChatRequest): ChatResponse => {
  const cards = retrieve(request.question, config.ui.knowledgeTopK);
  const allowed = new Set(request.sourceIds);
  const sourceIds = [...new Set(cards.flatMap((card) => card.sources).filter((id) => allowed.has(id)))];
  const grounded = cards.map((card) => card.text).join(' ').slice(0, config.chat.maxDigestChars);
  const answer = grounded.length > 0 ? grounded : request.question;
  return chatResponseSchema.parse({ answer, sourceIds, mode: 'remote', source: 'local' });
};
