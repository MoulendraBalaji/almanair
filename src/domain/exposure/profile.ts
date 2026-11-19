/** Scales a daily mean by a sourced diurnal shape into 24 hourly values. */
import { config } from '@/config';
import { micrograms, type Micrograms } from '@/data/parse';
import type { DiurnalProfile } from '@/data/schema';

/** One hour of modelled outdoor concentration. */
export interface HourlyPoint {
  hour: number;
  concentration: Micrograms;
}

/** Builds a normalized hourly profile; the shape's mean is preserved. */
export const outdoorProfile = (dailyMean: Micrograms, shape: DiurnalProfile): readonly HourlyPoint[] => {
  const total = shape.shape.reduce((sum, value) => sum + value, 0);
  const meanMultiplier = total / config.math.hoursPerDay;
  if (meanMultiplier === 0) return [];
  return shape.shape.map((value, hour) => ({ hour, concentration: micrograms((dailyMean * value) / meanMultiplier) }));
};

/** Finds the highest and lowest hours for accessible text summaries. */
export const profileExtremes = (points: readonly HourlyPoint[]): { peak: HourlyPoint | undefined; low: HourlyPoint | undefined } => ({
  peak: points.reduce<HourlyPoint | undefined>((best, point) => (!best || point.concentration > best.concentration ? point : best), undefined),
  low: points.reduce<HourlyPoint | undefined>((best, point) => (!best || point.concentration < best.concentration ? point : best), undefined),
});
