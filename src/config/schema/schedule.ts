import { z } from 'zod';

/** Hour boundaries shared by the routine and reading engines. */
export const scheduleSchema = z.object({
  sleepStartHour: z.number().int().min(0).max(23),
  sleepEndHour: z.number().int().min(0).max(23),
  outdoorHours: z.array(z.number().int().min(0).max(23)),
  tripHours: z.array(z.number().int().min(0).max(23)),
  quietSeverity: z.number().int().min(0).max(5),
  morningEndHour: z.number().int().min(0).max(23),
  eveningStartHour: z.number().int().min(0).max(23),
});
