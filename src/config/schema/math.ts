import { z } from 'zod';
import { positive } from './common';

/** Unit conversions, display precision and validation limits. */
export const mathSchema = z.object({
  midpoint: z.number().min(0).max(1),
  hoursPerDay: positive,
  minutesPerHour: positive,
  daysPerWeek: positive,
  gramsPerKg: positive,
  percent: positive,
  defaultRoomVolume: positive,
  decimals: z.number().int().nonnegative(),
  latitudeLimit: positive,
  longitudeLimit: positive,
  minUtcOffsetHours: z.number().min(-24).max(0),
  maxUtcOffsetHours: z.number().min(0).max(24),
});
