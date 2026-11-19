/** Structured, explainable Impact Receipts with no health-outcome claims. */
import { config } from '@/config';
import type { Action } from '@/data/catalogue-schema';
import { factorById } from '@/data';
import { kgCo2e, micrograms, type KgCo2e, type Micrograms } from '@/data/parse';
import type { DoseResult } from '@/domain/exposure/dose';

/** One labelled line of a receipt. */
export interface ReceiptLine {
  labelKey: string;
  value: number;
  unitKey: string;
}

/** The complete structured result shown by the receipt component. */
export interface ImpactReceipt {
  actionId: string;
  titleKey: string;
  costTier: Action['costTier'];
  effort: Action['effort'];
  exposureBefore: Micrograms;
  exposureAfter: Micrograms;
  exposureDelta: Micrograms;
  exposurePercent: number;
  exposureLow: Micrograms;
  exposureHigh: Micrograms;
  emissionsBefore: KgCo2e;
  emissionsAfter: KgCo2e;
  emissionsDelta: KgCo2e;
  confidence: 'high' | 'medium' | 'low';
  sources: readonly string[];
  formulaKey: string;
  lines: readonly ReceiptLine[];
}

/** Inputs to build one receipt. */
export interface ReceiptTerms {
  action: Action;
  before: DoseResult;
  after: DoseResult;
  emissionsBefore: KgCo2e;
  emissionsAfter: KgCo2e;
  exposureLabelKey: string;
  emissionsLabelKey: string;
}

const weakest = (references: readonly string[]): ImpactReceipt['confidence'] => {
  if (references.length === 0) return 'low';
  const values = references.map((id) => factorById(id).confidence);
  if (values.includes('low')) return 'low';
  if (values.includes('medium')) return 'medium';
  return 'high';
};

/** Builds a receipt from two comparable scenarios. */
export const buildReceipt = (terms: ReceiptTerms): ImpactReceipt => {
  const delta = terms.after.central - terms.before.central;
  const percent = terms.before.central === 0 ? 0 : (delta / terms.before.central) * config.math.percent;
  const emissionsDelta = kgCo2e(terms.emissionsAfter - terms.emissionsBefore);
  return {
    actionId: terms.action.id,
    titleKey: terms.action.titleKey,
    costTier: terms.action.costTier,
    effort: terms.action.effort,
    exposureBefore: terms.before.central,
    exposureAfter: terms.after.central,
    exposureDelta: micrograms(delta),
    exposurePercent: percent,
    exposureLow: terms.after.low,
    exposureHigh: terms.after.high,
    emissionsBefore: terms.emissionsBefore,
    emissionsAfter: terms.emissionsAfter,
    emissionsDelta,
    confidence: weakest(terms.action.effectRefs),
    sources: terms.action.sourceIds,
    formulaKey: 'receipt.formulaDose',
    lines: [
      { labelKey: terms.exposureLabelKey, value: Math.round(delta), unitKey: 'units.microgramsPerDay' },
      { labelKey: terms.emissionsLabelKey, value: Number(emissionsDelta.toFixed(config.math.decimals)), unitKey: 'units.kgPerWeek' },
    ],
  };
};

/** A whole-day plan comparison. */
export interface PlanComparison {
  before: DoseResult;
  after: DoseResult;
  emissionsBefore: KgCo2e;
  emissionsAfter: KgCo2e;
}

/** Receipt used for a whole-day plan rather than one action. */
export const planReceipt = (comparison: PlanComparison): Omit<ImpactReceipt, 'actionId' | 'titleKey' | 'costTier' | 'effort' | 'formulaKey' | 'sources' | 'lines' | 'confidence'> => ({
  exposureBefore: comparison.before.central,
  exposureAfter: comparison.after.central,
  exposureDelta: micrograms(comparison.after.central - comparison.before.central),
  exposurePercent:
    comparison.before.central === 0
      ? 0
      : ((comparison.after.central - comparison.before.central) / comparison.before.central) * config.math.percent,
  exposureLow: comparison.after.low,
  exposureHigh: comparison.after.high,
  emissionsBefore: comparison.emissionsBefore,
  emissionsAfter: comparison.emissionsAfter,
  emissionsDelta: kgCo2e(comparison.emissionsAfter - comparison.emissionsBefore),
});
