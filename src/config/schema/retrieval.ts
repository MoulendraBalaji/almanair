import { z } from 'zod';

/** BM25 tuning for the bundled knowledge index. */
export const retrievalSchema = z.object({ k1: z.number().positive(), b: z.number().min(0).max(1) });
