/** Community playbooks, local pledge scaling and clean-air-room planning. */
import { config } from '@/config';
import { factorById, playbooks } from '@/data';
import { ach, cubicMetres, type ACH, type CubicMetres, type KgCo2e } from '@/data/parse';
import { purifierCount } from '@/domain/indoor/model';

/** Supported community types. */
export type CommunityType = 'neighbourhood' | 'school' | 'workplace' | 'worship' | 'market';

/** A generated checklist step. */
export interface PlaybookStep {
  ownerKey: string;
  taskKey: string;
  effort: 'low' | 'medium' | 'high';
}

/** Builds a sourced checklist for a community type. */
export const playbookFor = (type: CommunityType): readonly PlaybookStep[] =>
  playbooks.find((book) => book.communityType === type)?.steps ?? [];

/** Scales a per-household estimate; the result is labelled as an estimate by the UI. */
export const scaledWeeklyImpact = (perHousehold: KgCo2e, households: number): number =>
  Number((perHousehold * households).toFixed(config.math.decimals));

/** Required CADR and purifier count for a clean-air room. */
export interface CleanAirRoom {
  requiredCadr: CubicMetres;
  purifiers: number;
  targetAch: ACH;
}

/** Plans a clean-air room from volume, target ACH and one unit's CADR. */
export const cleanAirRoom = (volume: CubicMetres, unitCadr: CubicMetres): CleanAirRoom => {
  const target = ach(factorById('target-clean-room-ach').value ?? 0);
  return {
    requiredCadr: cubicMetres(target * volume),
    purifiers: purifierCount(volume, target, unitCadr),
    targetAch: target,
  };
};
