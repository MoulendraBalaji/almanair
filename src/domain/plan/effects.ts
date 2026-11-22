/** Transparent, sourced estimates of what each recommended action changes. */
import { config } from '@/config';
import { ach, cubicMetres, type KgCo2e, type Micrograms } from '@/data/parse';
import { actionEffectById, factors } from '@/data';
import type { Action } from '@/data/catalogue-schema';
import type { Activity, DoseResult } from '@/domain/exposure/dose';
import type { HourlyPoint } from '@/domain/exposure/profile';
import { buildReceipt, type ImpactReceipt } from '@/domain/impact/receipt';
import type { Profile } from '@/domain/profile';
import { requiredCadr } from '@/domain/indoor/model';
import { doseContextFor, doseFor, outdoorMaskReductionFor } from './dose';
import { emissionsFor, type EmissionsOverrides } from './emissions';
import { factorPoint, factorRange, type FactorRange } from './factors';
import { indoorValues, type IndoorOverrides, type IndoorSnapshot } from './indoor';

/** Inputs shared by every action estimate. */
export interface EffectContext {
  profile: Profile;
  outdoorConcentration: Micrograms;
  outdoor: readonly HourlyPoint[];
  indoor: IndoorSnapshot;
  schedule: readonly Activity[];
  vehicleRatio: FactorRange;
  baselineDose: DoseResult;
  baselineEmissions: KgCo2e;
}

/** One ranked action with its explainable receipt. */
export interface ActionEffect {
  actionId: string;
  model: string;
  receipt: ImpactReceipt;
  confidence: 'high' | 'medium' | 'low';
  sourceIds: readonly string[];
  score: number;
}

const constantRange = (value: number): FactorRange => ({ low: value, central: value, high: value });

const indoorOverrideFor = (model: string, context: EffectContext): IndoorOverrides => {
  if (model === 'lower-air-exchange') {
    return { penetration: factorRange('particle-penetration'), airExchange: factorRange('air-exchange-rate') };
  }
  if (model === 'remove-source' || model === 'switch-electric') {
    return { sourceRate: constantRange(factorPoint('indoor-source-clean')) };
  }
  if (model === 'clean-room') {
    const target = requiredCadr(cubicMetres(context.indoor.room.volume), ach(factorPoint('target-clean-room-ach')));
    return { cadr: target };
  }
  if (model === 'higher-deposition') return { deposition: constantRange(factorRange('particle-deposition').high) };
  return {};
};

const emissionsOverrideFor = (model: string): EmissionsOverrides => {
  if (model === 'active-travel') return { mode: 'walk' };
  if (model === 'shared-ride') return { mode: 'bus' };
  if (model === 'switch-electric') return { fuel: 'electric' };
  return {};
};

const activeSchedule = (model: string, schedule: readonly Activity[]): readonly Activity[] =>
  model === 'active-travel' ? schedule.map((activity) => (activity === 'vehicle' ? 'exercise' : activity)) : schedule;

const confidenceFor = (ids: readonly string[]): ActionEffect['confidence'] => {
  const values = ids.map((id) => factors.find((factor) => factor.id === id)?.confidence ?? 'low');
  if (values.includes('low')) return 'low';
  if (values.includes('medium')) return 'medium';
  return 'high';
};

interface BenefitInputs {
  before: DoseResult;
  after: DoseResult;
  emissionsBefore: KgCo2e;
  emissionsAfter: KgCo2e;
}

const benefitScore = (input: BenefitInputs): number => {
  const exposureBenefit = Math.max(0, input.before.central - input.after.central) / Math.max(input.before.central, 1);
  const carbonBenefit = Math.max(0, input.emissionsBefore - input.emissionsAfter) / Math.max(input.emissionsBefore, 1);
  return exposureBenefit + carbonBenefit;
};

/** Computes one action's dose, emissions and Impact Receipt. */
export const effectFor = (action: Action, context: EffectContext): ActionEffect => {
  const rule = actionEffectById(action.id);
  const indoor = indoorValues(context.profile, context.outdoorConcentration, indoorOverrideFor(rule.model, context));
  const actionMaskReduction = rule.model === 'outdoor-mask' ? outdoorMaskReductionFor(context.profile) : undefined;
  const dose = doseFor(
    doseContextFor({
      profile: context.profile,
      outdoor: context.outdoor,
      indoor,
      schedule: activeSchedule(rule.model, context.schedule),
      ...(actionMaskReduction === undefined ? {} : { maskReduction: actionMaskReduction }),
    }),
  );
  const emissions = emissionsFor(context.profile, emissionsOverrideFor(rule.model)).after;
  const before = context.baselineDose;
  const percent = before.central === 0 ? 0 : ((dose.central - before.central) / before.central) * config.math.percent;
  const sourceIds = [...rule.sourceIds, ...action.sourceIds];
  const receipt = buildReceipt({
    action,
    before,
    after: dose,
    emissionsBefore: context.baselineEmissions,
    emissionsAfter: emissions,
    exposureLabelKey: 'receipt.exposure',
    emissionsLabelKey: 'receipt.emissions',
  });
  return {
    actionId: action.id,
    model: rule.model,
    receipt: { ...receipt, exposurePercent: percent },
    confidence: confidenceFor(rule.sourceIds),
    sourceIds,
    score: benefitScore({ before, after: dose, emissionsBefore: context.baselineEmissions, emissionsAfter: emissions }),
  };
};
