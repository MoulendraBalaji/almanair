import { z } from 'zod';
import { positive } from './common';

/** Local profile storage key, size cap and schema version. */
export const storageSchema = z.object({ key: z.string().min(1), maxBytes: positive, version: positive });
