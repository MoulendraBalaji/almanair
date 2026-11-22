import { z } from 'zod';
import { positive } from './common';

/** Bounded prompt, response and timeout limits for the optional chat route. */
export const chatSchema = z.object({
  timeoutMs: positive,
  maxBodyBytes: positive,
  maxOutputTokens: positive,
  maxQuestionChars: positive,
  maxDigestChars: positive,
  temperature: z.number().min(0).max(1),
});
