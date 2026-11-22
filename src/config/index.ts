import type { z } from 'zod';
import raw from './app.json';
import { appConfigSchema } from './schema/app';

/** Parsed application configuration; invalid values fail fast with a zod error. */
export const config = appConfigSchema.parse(raw);

/** Configuration shape, derived from the schema. */
export type AppConfig = z.infer<typeof appConfigSchema>;
