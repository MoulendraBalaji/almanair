import { z } from 'zod';

/** Positive integer shared by limits, budgets and timeouts. */
export const positive = z.number().int().positive();
