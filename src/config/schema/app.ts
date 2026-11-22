import { z } from 'zod';
import { budgetsSchema } from './budgets';
import { chatSchema } from './chat';
import { mathSchema } from './math';
import { rateLimitSchema } from './rate-limit';
import { retrievalSchema } from './retrieval';
import { scheduleSchema } from './schedule';
import { securitySchema } from './security';
import { storageSchema } from './storage';
import { uiSchema } from './ui';
import { ventilationSchema } from './ventilation';

/** Complete application configuration shape, composed from per-domain schemas. */
export const appConfigSchema = z.object({
  budgets: budgetsSchema,
  chat: chatSchema,
  rateLimit: rateLimitSchema,
  ui: uiSchema,
  ventilation: ventilationSchema,
  schedule: scheduleSchema,
  retrieval: retrievalSchema,
  security: securitySchema,
  storage: storageSchema,
  math: mathSchema,
});
