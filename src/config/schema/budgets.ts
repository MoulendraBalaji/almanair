import { z } from 'zod';
import { positive } from './common';

/** Performance and presentation budgets. */
export const budgetsSchema = z.object({
  firstLoadJsGzipKb: positive,
  fullDayPlanMs: positive,
  planDigestTokens: positive,
  chartPoints: positive,
});
