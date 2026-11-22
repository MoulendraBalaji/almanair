import { z } from 'zod';

/** Every scientific number carries a human-verifiable provenance record. */
export const sourceSchema = z.object({
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  year: z.number().int().positive(),
});

/** A named number with either a point value or a documented envelope. */
export const factorSchema = z
  .object({
    id: z.string().min(1),
    value: z.number().optional(),
    low: z.number().optional(),
    central: z.number().optional(),
    high: z.number().optional(),
    unit: z.string().min(1),
    source: sourceSchema,
    confidence: z.enum(['high', 'medium', 'low']),
    notes: z.string(),
  })
  .refine((entry) => entry.value !== undefined || (entry.low !== undefined && entry.central !== undefined && entry.high !== undefined), {
    message: 'A factor needs either value or low/central/high',
  });

/** One breakpoint row of an AQI standard. */
export const bandSchema = z.object({
  id: z.string().min(1),
  severity: z.number().int().min(0).max(5),
  indexLow: z.number(),
  indexHigh: z.number(),
  concentrationLow: z.number(),
  concentrationHigh: z.number(),
  /** Marks a breakpoint that is retained for model closure but not published by the standard. */
  assumption: z.string().optional(),
  source: sourceSchema,
});

/** Concentration-to-index scale for one pollutant and jurisdiction. */
export const standardSchema = z.object({
  id: z.string().min(1),
  labelKey: z.string().min(1),
  pollutant: z.literal('pm25'),
  unit: z.string().min(1),
  source: sourceSchema,
  bands: z.array(bandSchema).min(1),
});

/** A selectable place; coordinates are used only to find the nearest region. */
export const regionSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  utcOffsetHours: z.number().min(-12).max(14),
  standardId: z.string().min(1),
  source: sourceSchema,
});

/** A 24-hour diurnal shape; values average one by construction. */
export const diurnalProfileSchema = z.object({
  id: z.string().min(1),
  labelKey: z.string().min(1),
  shape: z.array(z.number().nonnegative()).length(24),
  source: sourceSchema,
});

/** Qualitative official guidance keyed by message id. */
export const guidanceSchema = z.object({
  id: z.string().min(1),
  severity: z.number().int().min(0).max(5),
  generalKey: z.string().min(1),
  vulnerableKey: z.string().min(1),
  source: sourceSchema,
});

/** Known-good solar positions used as regression vectors. */
export const solarVectorSchema = z.object({
  id: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  date: z.string(),
  timezoneOffsetHours: z.number(),
  expectedSolarNoonMinutes: z.number(),
  source: sourceSchema,
});

/** Source types are shared by every dataset. */
export type Source = z.infer<typeof sourceSchema>;
/** Validated scientific factor. */
export type Factor = z.infer<typeof factorSchema>;
/** Validated AQI standard. */
export type Standard = z.infer<typeof standardSchema>;
/** Validated region. */
export type Region = z.infer<typeof regionSchema>;
/** Validated AQI breakpoint row. */
export type Band = z.infer<typeof bandSchema>;
/** Validated diurnal profile. */
export type DiurnalProfile = z.infer<typeof diurnalProfileSchema>;
/** Validated guidance entry. */
export type GuidanceEntry = z.infer<typeof guidanceSchema>;
/** Validated solar regression vector. */
export type SolarVector = z.infer<typeof solarVectorSchema>;
