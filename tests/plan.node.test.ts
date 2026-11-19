import { describe, expect, it } from 'vitest';
import { config } from '@/config';
import { actions, diurnalProfiles, factorById, standardById } from '@/data';
import { ach, cubicMetres, kgCo2e, micrograms, ratio } from '@/data/parse';
import { fromCategory } from '@/domain/aqi';
import type { Activity, DoseTerms } from '@/domain/exposure/dose';
import { doseScenario } from '@/domain/exposure/dose';
import { outdoorProfile } from '@/domain/exposure/profile';
import { buildReceipt } from '@/domain/impact/receipt';
import { steadyState } from '@/domain/indoor/model';
import { rankActions } from '@/domain/recommender/ranking';
import { retrieve } from '@/domain/retrieval';
import { unwrap } from './helpers';

const morning = diurnalProfiles.find((profile) => profile.id === 'morning');
if (!morning) throw new Error('Missing morning profile');

const schedule: readonly Activity[] = Array.from({ length: 24 }, (_, hour) => {
  if (hour < 6 || hour >= 22) return 'sleep';
  if (hour === 8 || hour === 18) return 'outdoor';
  return 'indoor';
});

const runPlan = (): { actionId: string; cards: number; exposureDelta: number } => {
  const reading = unwrap(fromCategory(standardById('india-cpcb'), 3));
  const outdoor = outdoorProfile(reading.concentration, morning);
  const penetration = ratio(factorById('particle-penetration').central ?? 0);
  const exchange = ach(factorById('air-exchange-rate').central ?? 0);
  const deposition = ach(factorById('particle-deposition').central ?? 0);
  const indoor = unwrap(
    steadyState({
      outdoor: reading.concentration,
      volume: cubicMetres(config.math.defaultRoomVolume),
      penetration,
      airExchange: exchange,
      deposition,
      sourceRate: micrograms(factorById('indoor-source-clean').value ?? 0),
      cadr: cubicMetres(0),
    }),
  );
  const breathing = factorById('breathing-adult');
  const baseDose = (central: number): DoseTerms => ({
    outdoor,
    indoor: { low: micrograms(central * 0.8), central: micrograms(central), high: micrograms(central * 1.2) },
    breathing: { low: breathing.low ?? 16, central: breathing.central ?? 16, high: breathing.high ?? 21.4 },
    activeBreathing: { low: 1.56, central: 1.56, high: 2.28 },
    vehicleRatio: { low: 0.5, central: 0.8, high: 1.2 },
    maskReduction: ratio(0),
    schedule,
  });
  const before = doseScenario(baseDose(indoor));
  const after = doseScenario(baseDose(indoor * 0.7));
  const ranked = rankActions({
    actions,
    facts: {
      'home.windowHabit': 'sometimes',
      'home.cookingFuel': 'lpg',
      'reading.severity': 3,
      'profile.budgetTier': 'free',
      'mobility.modes': 'walk',
      'home.tenure': 'rent',
    },
    timeOfDay: 'midday',
    budgetTier: 'free',
    score: () => 1,
    limit: config.ui.knowledgeTopK,
  });
  const action = ranked[0] ?? actions[0];
  if (!action) throw new Error('No actions available');
  const receipt = buildReceipt({
    action,
    before,
    after,
    emissionsBefore: kgCo2e(10),
    emissionsAfter: kgCo2e(8),
    exposureLabelKey: 'receipt.exposure',
    emissionsLabelKey: 'receipt.emissions',
  });
  const cards = retrieve('winter smog ventilation', config.ui.knowledgeTopK);
  return { actionId: action.id, cards: cards.length, exposureDelta: receipt.exposureDelta };
};

describe('full-day planning budget', () => {
  it('completes a representative daily plan within the configured budget', () => {
    const warmup = runPlan();
    expect(warmup.actionId.length).toBeGreaterThan(0);
    const samples: number[] = [];
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const start = performance.now();
      runPlan();
      samples.push(performance.now() - start);
    }
    samples.sort((left, right) => left - right);
    const median = samples[Math.floor(samples.length / 2)] ?? Number.POSITIVE_INFINITY;
    expect(median).toBeLessThan(config.budgets.fullDayPlanMs);
  });
});
