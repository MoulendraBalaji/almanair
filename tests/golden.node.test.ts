/** Locks deterministic domain output across a matrix of profiles and readings. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { config } from '@/config';
import { moveAlternatives } from '@/domain/move';
import { buildPlan } from '@/domain/plan';
import { buildActions, buildCore } from '@/domain/plan/build';
import { buildDigest } from '@/domain/plan/digest';
import { retrieve } from '@/domain/retrieval';
import { ventilationWindow } from '@/domain/ventilation/window';
import type { Profile } from '@/domain/profile';
import { goldenInstant, goldenProfiles, goldenReadings } from './golden/scenarios';

const goldenRecordSchema = z.object({
  profileId: z.string(),
  readingId: z.string(),
  plan: z.unknown(),
  digest: z.string(),
  recommendations: z.unknown(),
  moveAlternatives: z.unknown(),
  retrievalTopK: z.unknown(),
  ventilationWindow: z.unknown(),
});

const fixture = readFileSync(fileURLToPath(new URL('./golden/expected.json', import.meta.url)), 'utf8');
const parsed: unknown = JSON.parse(fixture);
const expected = z.array(goldenRecordSchema).parse(parsed);

/** Normalises domain output to the exact JSON shape stored in the fixture. */
const json = (value: unknown): unknown => {
  const parsedValue: unknown = JSON.parse(JSON.stringify(value));
  return parsedValue;
};

/** Builds every golden output for one profile and reading combination. */
const actualFor = (entry: (typeof goldenProfiles)[number], severity: (typeof goldenReadings)[number], profile: Profile) => {
  const plan = buildPlan(profile, goldenInstant);
  const core = buildCore(profile, goldenInstant);
  const digest = buildDigest({
    locale: profile.locale,
    reading: plan.reading,
    standardLabelKey: plan.standardLabelKey,
    location: plan.location,
    householdSize: profile.household.length,
    vulnerableCount: profile.household.filter((member) => member.flags.length > 0).length,
    homeType: profile.home.type,
    roomCount: profile.home.rooms.length,
    largestRoomVolume: plan.indoor.room.volume,
    hasPurifier: profile.home.hasPurifier,
    maskClass: profile.home.maskClass,
    usual: plan.usualSchedule,
    adjusted: plan.adjustedSchedule,
    exposureBefore: plan.baselineDose.central,
    exposureAfter: plan.adjustedDose.central,
    actions: plan.actions.map((item) => item.action),
  });
  return {
    profileId: entry.id,
    readingId: severity.id,
    plan: json(plan),
    digest,
    recommendations: json(buildActions(core)),
    moveAlternatives: json(moveAlternatives({
      profile,
      date: goldenInstant,
      budget: profile.budgetTier,
      freeFirst: false,
    })),
    retrievalTopK: json(retrieve(entry.retrievalQuery, config.ui.knowledgeTopK)),
    ventilationWindow: json(ventilationWindow(plan.outdoor, plan.indoor.central, plan.solar)),
  };
};

describe('domain behaviour golden master', () => {
  it('contains one fixture for every profile and reading combination', () => {
    expect(expected).toHaveLength(goldenProfiles.length * goldenReadings.length);
  });

  for (const entry of goldenProfiles) {
    for (const reading of goldenReadings) {
      it(`matches the committed fixture for ${entry.id} at ${reading.id}`, () => {
        const profile: Profile = {
          ...entry.profile,
          reading: {
            kind: 'category',
            category: reading.severity,
            standardId: entry.profile.preferences.standardId,
          },
        };
        const record = expected.find((item) => item.profileId === entry.id && item.readingId === reading.id);
        expect(record).toBeDefined();
        expect(actualFor(entry, reading, profile)).toEqual(record);
      });
    }
  }
});
