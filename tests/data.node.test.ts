import { describe, expect, it } from 'vitest';
import { actions, diurnalProfiles, factors, guidance, localTiers, playbooks, regions, solarConstants, solarVectors, standards } from '@/data';
import generated from '@/data/generated/messages.json';
import type { LocalTier, Playbook } from '@/data/catalogue-schema';
import { sourceSchema, type Factor, type GuidanceEntry, type Region, type SolarVector, type Source } from '@/data/schema';
import { locales, type MessageKey } from '@/content/messages';

interface Sourced {
  id: string;
  source: unknown;
}

const expectSourced = (entries: readonly Sourced[]): void => {
  for (const entry of entries) {
    expect(() => sourceSchema.parse(entry.source), `${entry.id} needs a valid source`).not.toThrow();
  }
};

describe('data integrity', () => {
  it('sources every scientific factor and reference entry', () => {
    expectSourced(factors);
    expectSourced(regions);
    expectSourced(diurnalProfiles);
    expectSourced(guidance);
    expectSourced(solarVectors);
    expectSourced(solarConstants);
    expectSourced(localTiers);
    expectSourced(playbooks);
    expectSourced(standards);
    expectSourced(standards.flatMap((standard) => standard.bands));
  });

  it('keeps every factor numeric value named, bounded and confidence-labelled', () => {
    for (const factor of factors) {
      expect(['high', 'medium', 'low']).toContain(factor.confidence);
      expect(factor.unit.length).toBeGreaterThan(0);
      expect(factor.notes.length).toBeGreaterThan(0);
      if (factor.low !== undefined && factor.high !== undefined) expect(factor.high).toBeGreaterThan(factor.low);
    }
  });

  it('keeps locale catalogues key-identical', () => {
    const english = Object.keys(generated.en).sort();
    for (const locale of locales) expect(Object.keys(generated[locale]).sort()).toEqual(english);
  });

  it('references only existing factors, sources and message keys from actions', () => {
    const factorIds = new Set(factors.map((factor) => factor.id));
    const english = generated.en as Record<string, string>;
    for (const action of actions) {
      expect(action.sourceIds.length).toBeGreaterThan(0);
      for (const reference of action.effectRefs) expect(factorIds.has(reference), `${action.id} -> ${reference}`).toBe(true);
      for (const key of [action.titleKey, action.detailKey, action.whyKey]) {
        expect(key in english, `${action.id} -> ${key}`).toBe(true);
      }
    }
  });

  it('uses unique action ids and complete severity guidance', () => {
    expect(new Set(actions.map((action) => action.id)).size).toBe(actions.length);
    expect(guidance.map((item) => item.severity).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('types message keys through the generated catalogue', () => {
    const key: MessageKey = 'app.name';
    expect(generated.en[key]).toBe('Almanair');
  });

  it('exports consumer-facing aliases for validated records', () => {
    const factor: Factor | undefined = factors[0];
    const region: Region | undefined = regions[0];
    const entry: GuidanceEntry | undefined = guidance[0];
    const vector: SolarVector | undefined = solarVectors[0];
    const tier: LocalTier | undefined = localTiers[0];
    const book: Playbook | undefined = playbooks[0];
    const source: Source | undefined = standards[0]?.source;
    expect(factor?.unit.length).toBeGreaterThan(0);
    expect(region?.timezone.length).toBeGreaterThan(0);
    expect(entry?.generalKey.length).toBeGreaterThan(0);
    expect(vector?.date.length).toBeGreaterThan(0);
    expect(tier?.kind.length).toBeGreaterThan(0);
    expect(book?.steps.length).toBeGreaterThan(0);
    expect(source?.publisher.length).toBeGreaterThan(0);
  });
});
