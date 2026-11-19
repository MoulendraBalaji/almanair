/** Pure AQI banding and concentration conversion; all breakpoints come from data. */
import { config } from '@/config';
import { micrograms, type Micrograms } from '@/data/parse';
import type { Band, Standard } from '@/data/schema';
import { err, ok, type Result } from '@/domain/result';

/** Six ordinal severities shared by every standard. */
export type Severity = 0 | 1 | 2 | 3 | 4 | 5;
/** Message key for a severity label. */
export type SeverityKey = `severity.${Severity}`;
/** A validated reading on a named scale. */
export interface Reading {
  index: number;
  concentration: Micrograms;
  severity: Severity;
  bandId: string;
}
/** Stable failure codes for invalid input. */
export type AqiErrorCode = 'negative-concentration' | 'empty-standard' | 'unknown-severity';

/** Converts a validated integer into the closed severity union without a cast. */
export const toSeverity = (value: number): Severity => {
  if (value <= 0) return 0;
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  return 5;
};

const severityKeys: Record<Severity, SeverityKey> = {
  0: 'severity.0',
  1: 'severity.1',
  2: 'severity.2',
  3: 'severity.3',
  4: 'severity.4',
  5: 'severity.5',
};

/** Returns the message key for a severity band. */
export const severityKey = (severity: Severity): SeverityKey => severityKeys[severity];

const lastBand = (standard: Standard): Result<Band, AqiErrorCode> => {
  const band = standard.bands.at(-1);
  return band ? ok(band) : err('empty-standard');
};

const bandForConcentration = (standard: Standard, value: number): Result<Band, AqiErrorCode> => {
  const found = standard.bands.find((band) => value <= band.concentrationHigh);
  return found ? ok(found) : lastBand(standard);
};

const bandForIndex = (standard: Standard, value: number): Result<Band, AqiErrorCode> => {
  const found = standard.bands.find((band) => value <= band.indexHigh);
  return found ? ok(found) : lastBand(standard);
};

/** Linear interpolation between two breakpoint pairs. */
export const interpolate = (options: {
  value: number;
  low: number;
  high: number;
  outputLow: number;
  outputHigh: number;
}): number => {
  const { value, low, high, outputLow, outputHigh } = options;
  if (high === low) return outputLow;
  const bounded = Math.max(low, Math.min(value, high));
  return outputLow + ((bounded - low) / (high - low)) * (outputHigh - outputLow);
};

/** Builds a reading from a PM2.5 concentration. */
export const fromConcentration = (standard: Standard, concentration: Micrograms): Result<Reading, AqiErrorCode> => {
  if (concentration < 0) return err('negative-concentration');
  const found = bandForConcentration(standard, concentration);
  if (!found.ok) return err(found.error);
  const band = found.value;
  const index = interpolate({
    value: concentration,
    low: band.concentrationLow,
    high: band.concentrationHigh,
    outputLow: band.indexLow,
    outputHigh: band.indexHigh,
  });
  return ok({ index, concentration, severity: toSeverity(band.severity), bandId: band.id });
};

/** Builds a reading from an index value, clamping above the highest breakpoint. */
export const fromIndex = (standard: Standard, index: number): Result<Reading, AqiErrorCode> => {
  if (index < 0) return err('negative-concentration');
  const found = bandForIndex(standard, index);
  if (!found.ok) return err(found.error);
  const band = found.value;
  const concentration = interpolate({
    value: index,
    low: band.indexLow,
    high: band.indexHigh,
    outputLow: band.concentrationLow,
    outputHigh: band.concentrationHigh,
  });
  return ok({ index, concentration: micrograms(concentration), severity: toSeverity(band.severity), bandId: band.id });
};

/** Builds a reading from a category by taking the middle of its index band. */
export const fromCategory = (standard: Standard, severity: Severity): Result<Reading, AqiErrorCode> => {
  const band = standard.bands.find((item) => item.severity === severity);
  if (!band) return err('unknown-severity');
  const index = band.indexLow + (band.indexHigh - band.indexLow) * config.math.midpoint;
  return fromIndex(standard, index);
};
