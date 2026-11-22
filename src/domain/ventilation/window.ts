/** Chooses the cleanest sun-centred hours for opening windows. */
import { config } from '@/config';
import type { Micrograms } from '@/data/parse';
import type { HourlyPoint } from '@/domain/exposure/profile';
import { minutesPerHour } from '@/domain/units/time';
import type { SolarPosition } from './solar';

/** A recommended opening period, or an explicit instruction to keep shut. */
export interface VentilationWindow {
  open: boolean;
  startHour: number | null;
  endHour: number | null;
}

/** True when a modelled hour sits inside the allowed half-width around noon. */
export const nearSolarNoon = (hour: number, position: SolarPosition): boolean => {
  const noonHour = position.solarNoonMinutes / minutesPerHour;
  return Math.abs(hour - noonHour) <= config.ventilation.halfWidthHours;
};

/** Longest run of consecutive hours satisfying a predicate. */
export const longestRun = (values: readonly boolean[]): { start: number; end: number } | null => {
  let best: { start: number; end: number } | null = null;
  let currentStart: number | null = null;
  values.forEach((value, index) => {
    if (value && currentStart === null) currentStart = index;
    if ((!value || index === values.length - 1) && currentStart !== null) {
      const end = value ? index : index - 1;
      if (!best || end - currentStart > best.end - best.start) best = { start: currentStart, end };
      currentStart = null;
    }
  });
  return best;
};

/** Finds a contiguous ventilation window from outdoor and indoor estimates. */
export const ventilationWindow = (
  outdoor: readonly HourlyPoint[],
  indoor: Micrograms,
  position: SolarPosition,
): VentilationWindow => {
  const candidates = outdoor.map((point) => point.concentration < indoor && nearSolarNoon(point.hour, position));
  const run = longestRun(candidates);
  if (!run) return { open: false, startHour: null, endHour: null };
  return { open: true, startHour: run.start, endHour: run.end };
};
