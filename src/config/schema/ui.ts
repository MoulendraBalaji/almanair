import { z } from 'zod';
import { positive } from './common';

/** Interface lists, timings and result counts. */
export const uiSchema = z.object({
  persistenceDebounceMs: positive,
  receiptStaggerMs: positive,
  countUpMs: positive,
  hazeDriftSeconds: positive,
  knowledgeTopK: positive,
  defaultMinutesPerDay: positive,
  setupSteps: positive,
  topActions: positive,
  suggestedQuestions: positive,
  moveAlternatives: positive,
  defaultHouseholds: positive,
});
