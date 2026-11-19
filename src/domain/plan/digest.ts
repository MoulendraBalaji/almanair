/** Compact, source-free text summary used by the optional chat service. */
import { config } from '@/config';
import type { Reading } from '@/domain/aqi';
import { severityKey } from '@/domain/aqi';
import { translate, translateKey, type Locale } from '@/data/messages';
import type { Activity } from '@/domain/exposure/dose';
import type { Action } from '@/data/catalogue-schema';
import type { PlanLocation } from './location';

/** Structured inputs used to compose the Plan Digest. */
export interface DigestInput {
  locale: Locale;
  reading: Reading;
  standardLabelKey: string;
  location: PlanLocation;
  householdSize: number;
  vulnerableCount: number;
  homeType: string;
  roomCount: number;
  largestRoomVolume: number;
  hasPurifier: boolean;
  maskClass: string;
  usual: readonly Activity[];
  adjusted: readonly Activity[];
  exposureBefore: number;
  exposureAfter: number;
  actions: readonly Action[];
}

const activityList = (locale: Locale, activities: readonly Activity[]): string =>
  activities.map((activity) => translateKey(locale, `activity.${activity}`)).join(', ');

/** Builds a deterministic digest; no names, coordinates or stored answers are included. */
export const buildDigest = (input: DigestInput): string => {
  const { locale } = input;
  const label = translate(locale, severityKey(input.reading.severity));
  const value = input.reading.index.toFixed(config.math.decimals);
  const volume = input.largestRoomVolume.toFixed(config.math.decimals);
  const actionTitles = input.actions.map((action) => translateKey(locale, action.titleKey)).join(', ');
  const lines = [
    translate(locale, 'digest.reading', {
      severity: label,
      value,
      standard: translateKey(locale, input.standardLabelKey),
    }),
    translate(locale, 'digest.household', { members: input.householdSize, vulnerable: input.vulnerableCount }),
    translate(locale, 'digest.home', {
      type: translateKey(locale, `options.${input.homeType}`),
      rooms: input.roomCount,
      volume,
      purifier: translate(locale, input.hasPurifier ? 'app.yes' : 'app.no'),
      mask: translateKey(locale, `options.${input.maskClass}`),
    }),
    translate(locale, 'digest.schedule', {
      usual: activityList(locale, input.usual),
      adjusted: activityList(locale, input.adjusted),
    }),
    translate(locale, 'digest.exposure', {
      before: Math.round(input.exposureBefore),
      after: Math.round(input.exposureAfter),
    }),
    translate(locale, 'digest.actions', { actions: actionTitles }),
    translate(locale, 'digest.location', { region: translateKey(locale, input.location.nameKey) }),
  ];
  return lines.join(translate(locale, 'digest.separator'));
};
