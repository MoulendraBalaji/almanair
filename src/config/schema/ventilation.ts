import { z } from 'zod';
import { positive } from './common';

/** Solar-noon window used by the ventilation suggestion. */
export const ventilationSchema = z.object({ halfWidthHours: positive });
