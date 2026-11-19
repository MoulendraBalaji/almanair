import { describe, expect, it } from 'vitest';
import { config } from '@/config';
import { moveAlternatives, type MoveAlternative } from '@/domain/move';
import { defaultProfile, type Profile } from '@/domain/profile';
import { costRank } from '@/domain/recommender/ranking';

/** A profile for which several sourced swaps genuinely lower emissions. */
const profile: Profile = {
  ...defaultProfile(),
  budgetTier: 'high',
  home: { ...defaultProfile().home, cookingFuel: 'biomass', tenure: 'own' },
  mobility: { modes: ['car'], schoolRunKm: 4, commuteKm: 12 },
  reading: { kind: 'category', category: 0, standardId: 'india-cpcb' },
};

const date = new Date('2026-01-15T08:00:00Z');

/** True when cheaper tiers never appear after dearer ones. */
const costOrdered = (items: readonly MoveAlternative[]): boolean =>
  items.slice(1).every((item, index) => {
    const previous = items[index];
    return previous ? costRank[previous.action.costTier] <= costRank[item.action.costTier] : true;
  });

/** True when a free option precedes a paid one. */
const hasFreeBeforePaid = (items: readonly MoveAlternative[]): boolean =>
  items.some((item, index) =>
    item.action.costTier === 'free' && items.slice(index + 1).some((later) => later.action.costTier !== 'free'));

describe('move alternatives', () => {
  it('keeps only emissions-lowering actions within the configured limit', () => {
    const alternatives = moveAlternatives({ profile, date, budget: 'high', freeFirst: false });
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.length).toBeLessThanOrEqual(config.ui.moveAlternatives);
    for (const alternative of alternatives) {
      expect(alternative.effect.receipt.emissionsDelta).toBeLessThan(0);
      expect(alternative.effect.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it('reorders the same ranked set by cost when free-first is chosen', () => {
    const ranked = moveAlternatives({ profile, date, budget: 'high', freeFirst: false });
    const freeFirst = moveAlternatives({ profile, date, budget: 'high', freeFirst: true });
    expect(costOrdered(freeFirst)).toBe(true);
    expect(hasFreeBeforePaid(freeFirst)).toBe(true);
    expect(new Set(ranked.map((item) => item.action.id))).toEqual(new Set(freeFirst.map((item) => item.action.id)));
  });

  it('never offers options above the selected budget tier', () => {
    const alternatives = moveAlternatives({ profile, date, budget: 'low', freeFirst: false });
    for (const alternative of alternatives) {
      expect(costRank[alternative.action.costTier]).toBeLessThanOrEqual(costRank.low);
    }
  });
});
