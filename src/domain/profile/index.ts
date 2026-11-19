/** Versioned, validated profile with a deterministic migration and defaults. */
import { config } from '@/config';
import { z } from 'zod';
import { err, ok, type Result } from '@/domain/result';

/** Vulnerability flags are counts, never names or diagnoses. */
export const flagSchema = z.enum(['child', 'older', 'pregnancy', 'respiratory', 'cardiac', 'outdoorWorker']);
/** Standard shape across both locale catalogues. */
export const localeSchema = z.enum(['en', 'es']);
/** Severity codes accepted as a category reading. */
export const severitySchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

/** One household member. */
export const memberSchema = z.object({
  id: z.string(),
  ageBand: z.enum(['child', 'adult', 'older']),
  flags: z.array(flagSchema),
});

/** A room with a volume supplied by the user. */
export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  volume: z.number().positive(),
});

/** The home model inputs collected during setup. */
export const homeSchema = z.object({
  type: z.enum(['flat', 'house', 'shared']),
  rooms: z.array(roomSchema).min(1),
  windowHabit: z.enum(['often', 'sometimes', 'rarely']),
  cookingFuel: z.enum(['biomass', 'kerosene', 'lpg', 'gas', 'electric']),
  heatingFuel: z.enum(['biomass', 'kerosene', 'lpg', 'gas', 'electric']),
  hasPurifier: z.boolean(),
  purifierCadr: z.number().nonnegative(),
  hasMask: z.boolean(),
  maskClass: z.enum(['cloth', 'n95', 'none']),
  tenure: z.enum(['rent', 'own']),
});

/** Daily movement summary. */
export const mobilitySchema = z.object({
  modes: z.array(z.enum(['walk', 'bicycle', 'bus', 'car'])),
  schoolRunKm: z.number().nonnegative(),
  commuteKm: z.number().nonnegative(),
});

/** Budget, time and display preferences. */
export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  textSize: z.enum(['normal', 'large']),
  contrast: z.boolean(),
  reducedMotion: z.boolean(),
  chatConsent: z.boolean(),
  units: z.enum(['metric', 'imperial']),
  standardId: z.string(),
  diurnalProfileId: z.string(),
});

/** Optional user-supplied region; coordinates are never stored in a readable profile by default. */
export const customRegionSchema = z.object({
  latitude: z.number().min(-config.math.latitudeLimit).max(config.math.latitudeLimit),
  longitude: z.number().min(-config.math.longitudeLimit).max(config.math.longitudeLimit),
  utcOffsetHours: z.number().min(config.math.minUtcOffsetHours).max(config.math.maxUtcOffsetHours),
  timezone: z.string().min(1),
  standardId: z.string().min(1),
});

/** Validated user-entered air reading. */
export const readingSchema = z.object({
  kind: z.enum(['aqi', 'pm25', 'category']),
  value: z.number().nonnegative().optional(),
  category: severitySchema.optional(),
  standardId: z.string(),
  recordedAt: z.string().optional(),
});

/** The complete versioned profile. */
export const profileSchema = z
  .object({
    version: z.literal(config.storage.version),
    locale: localeSchema,
    step: z.number().int().nonnegative(),
    regionId: z.string(),
    household: z.array(memberSchema).min(1),
    home: homeSchema,
    mobility: mobilitySchema,
    budgetTier: z.enum(['free', 'low', 'medium', 'high']),
    minutesPerDay: z.number().nonnegative(),
    preferences: preferencesSchema,
    reading: readingSchema.optional(),
    customRegion: customRegionSchema.optional(),
  })
  .strict();

/** Profile shape derived from the schema. */
export type Profile = z.infer<typeof profileSchema>;
/** One validated household member. */
export type Member = z.infer<typeof memberSchema>;
/** One validated room. */
export type Room = z.infer<typeof roomSchema>;

/** A fresh profile with safe, generous defaults. */
export const defaultProfile = (): Profile => ({
  version: config.storage.version,
  locale: 'en',
  step: 0,
  regionId: 'delhi',
  household: [{ id: 'adult-1', ageBand: 'adult', flags: [] }],
  home: {
    type: 'flat',
    rooms: [{ id: 'room-1', name: '', volume: config.math.defaultRoomVolume }],
    windowHabit: 'sometimes',
    cookingFuel: 'lpg',
    heatingFuel: 'electric',
    hasPurifier: false,
    purifierCadr: 0,
    hasMask: false,
    maskClass: 'none',
    tenure: 'rent',
  },
  mobility: { modes: ['walk'], schoolRunKm: 0, commuteKm: 0 },
  budgetTier: 'free',
  minutesPerDay: config.ui.defaultMinutesPerDay,
  preferences: {
    theme: 'system',
    textSize: 'normal',
    contrast: false,
    reducedMotion: false,
    chatConsent: false,
    units: 'metric',
    standardId: 'india-cpcb',
    diurnalProfileId: 'morning',
  },
});

/** Parses a stored profile, with a version-1 migration fallback. */
export const parseProfile = (raw: unknown): Result<Profile, 'invalid-profile'> => {
  const current = profileSchema.safeParse(raw);
  if (current.success) return ok(current.data);
  if (typeof raw === 'object' && raw !== null && 'version' in raw && raw.version === 1) {
    return ok(defaultProfile());
  }
  return err('invalid-profile');
};
