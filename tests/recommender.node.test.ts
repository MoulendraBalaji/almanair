import { describe, expect, it } from 'vitest';
import { actions } from '@/data';
import { applicableActions, matchesPredicate, testFact, type Facts } from '@/domain/recommender/predicate';
import { actionScore, rankActions } from '@/domain/recommender/ranking';

const facts: Facts = {
  'home.windowHabit': 'sometimes',
  'home.cookingFuel': 'lpg',
  'home.hasPurifier': false,
  'reading.severity': 2,
  'profile.budgetTier': 'free',
  'mobility.modes': 'car',
  'mobility.schoolRunKm': 2,
  'home.tenure': 'rent',
};

const byId = (id: string) => {
  const found = actions.find((action) => action.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
};

describe('action predicates', () => {
  it('evaluates in, equals, gte and lte leaf tests', () => {
    expect(testFact({ fact: 'a', in: ['x', 'y'] }, { a: 'y' })).toBe(true);
    expect(testFact({ fact: 'a', equals: 'y' }, { a: 'y' })).toBe(true);
    expect(testFact({ fact: 'a', equals: 'z' }, { a: 'y' })).toBe(false);
    expect(testFact({ fact: 'a', gte: 3 }, { a: 3 })).toBe(true);
    expect(testFact({ fact: 'a', lte: 3 }, { a: 4 })).toBe(false);
    expect(testFact({ fact: 'a', gte: 1 }, { a: '1' })).toBe(false);
    expect(testFact({ fact: 'missing', equals: 'x' }, {})).toBe(false);
  });

  it('combines all, any and none clauses', () => {
    expect(matchesPredicate({}, facts)).toBe(true);
    expect(matchesPredicate({ all: [{ fact: 'a', equals: 'x' }] }, { a: 'x' })).toBe(true);
    expect(matchesPredicate({ all: [{ fact: 'a', equals: 'x' }] }, { a: 'y' })).toBe(false);
    expect(matchesPredicate({ any: [{ fact: 'a', equals: 'x' }] }, { a: 'x' })).toBe(true);
    expect(matchesPredicate({ any: [{ fact: 'a', equals: 'x' }] }, {})).toBe(false);
    expect(matchesPredicate({ none: [{ fact: 'a', equals: 'x' }] }, { a: 'x' })).toBe(false);
    expect(matchesPredicate({ none: [{ fact: 'a', equals: 'x' }] }, { a: 'y' })).toBe(true);
  });

  it('filters by predicate, tenure and time of day', () => {
    const visible = applicableActions(actions, facts, 'midday').map((action) => action.id);
    expect(visible).toEqual(['shortWindows', 'cookHood', 'walkShort', 'sealGaps', 'pledge', 'wasteSeparate']);
    expect(applicableActions(actions, facts, 'evening')).toHaveLength(5);
  });
});

describe('action ranking', () => {
  it('prefers higher benefit per effort with a stable id tie-break', () => {
    expect(actionScore(byId('pledge'), () => 1)).toBeLessThan(actionScore(byId('wasteSeparate'), () => 1));
    expect(actionScore(byId('noIndoorBurn'), () => 1)).toBeLessThan(actionScore(byId('pledge'), () => 1));
  });

  it('applies the budget, diversifies categories and is deterministic', () => {
    const options = {
      actions,
      facts,
      timeOfDay: 'midday' as const,
      budgetTier: 'free' as const,
      score: () => 1,
      limit: 3,
    };
    const first = rankActions(options);
    expect(first.map((action) => action.id)).toEqual(['wasteSeparate', 'shortWindows', 'walkShort']);
    expect(rankActions(options)).toEqual(first);
    expect(new Set(first.map((action) => action.category)).size).toBe(first.length);
  });
});
