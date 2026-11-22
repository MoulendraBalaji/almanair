/** Named daily schedules; all hour boundaries come from configuration. */
import { config } from '@/config';
import type { Activity } from '@/domain/exposure/dose';
import type { Severity } from '@/domain/aqi';
import { hoursPerDay } from '@/domain/units/time';

/** Builds the ordinary day from the household's travel and outdoor habits. */
export const baseSchedule = (hasTrip: boolean): readonly Activity[] =>
  Array.from({ length: hoursPerDay }, (_, hour): Activity => {
    if (hour < config.schedule.sleepEndHour || hour >= config.schedule.sleepStartHour) return 'sleep';
    if (hasTrip && config.schedule.tripHours.includes(hour)) return 'vehicle';
    if (config.schedule.outdoorHours.includes(hour)) return 'outdoor';
    return 'indoor';
  });

/** Replaces outdoor and transit hours with indoor hours on poor-air days. */
export const quietSchedule = (base: readonly Activity[], severity: Severity): readonly Activity[] =>
  severity < config.schedule.quietSeverity
    ? base
    : base.map((activity) => (activity === 'outdoor' || activity === 'vehicle' ? 'indoor' : activity));

/** Maps an hour to the time-of-day label used by action rules. */
export const timeOfDayFor = (hour: number): 'morning' | 'midday' | 'evening' => {
  if (hour < config.schedule.morningEndHour) return 'morning';
  if (hour < config.schedule.eveningStartHour) return 'midday';
  return 'evening';
};
