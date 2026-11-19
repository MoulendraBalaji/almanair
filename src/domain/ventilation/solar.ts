/**
 * NOAA solar position algorithm, implemented locally and injected with a Clock.
 * Every coefficient is a named value in data/solar-constants.json with a source.
 */
import { config } from '@/config';
import { solarConstant } from '@/data';

/** Local clock times in minutes from midnight. */
export interface SolarPosition {
  solarNoonMinutes: number;
  sunriseMinutes: number;
  sunsetMinutes: number;
}

/** Options for a local solar position calculation. */
export interface SolarOptions {
  latitude: number;
  longitude: number;
  date: Date;
  timezoneOffsetHours: number;
}

const constant = solarConstant;
const circle = constant('solar-degrees-per-circle');
const second = constant('solar-harmonic-second');
const third = constant('solar-harmonic-third');

const radians = (degrees: number): number => (degrees * Math.PI) / (circle / second);
const degrees = (value: number): number => (value * (circle / second)) / Math.PI;
const wrap = (value: number): number => ((value % circle) + circle) % circle;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

/** Julian centuries since J2000 for an instant. */
export const julianCentury = (date: Date): number =>
  (date.getTime() / constant('solar-ms-per-day') + constant('solar-unix-julian-offset') - constant('solar-julian-epoch')) /
  constant('solar-days-per-century');

/** Earth's orbital shape at a given century. */
export const orbitalTerms = (century: number) => ({
  meanLongitude: wrap(
    constant('solar-mean-long-base') + century * (constant('solar-mean-long-rate') + century * constant('solar-mean-long-quadratic')),
  ),
  anomaly: constant('solar-anomaly-base') + century * (constant('solar-anomaly-rate') - century * constant('solar-anomaly-quadratic')),
  eccentricity:
    constant('solar-eccentricity-base') - century * (constant('solar-eccentricity-rate') + century * constant('solar-eccentricity-quadratic')),
});

/** The sun's apparent longitude after nutation correction. */
export const apparentLongitude = (century: number, meanLongitude: number, anomaly: number): number => {
  const center =
    Math.sin(radians(anomaly)) *
      (constant('solar-eq-center-sin1-base') - century * (constant('solar-eq-center-sin1-rate') + century * constant('solar-eq-center-sin1-quadratic'))) +
    Math.sin(radians(second * anomaly)) * (constant('solar-eq-center-sin2-base') - constant('solar-eq-center-sin2-rate') * century) +
    Math.sin(radians(third * anomaly)) * constant('solar-eq-center-sin3');
  const node = constant('solar-nutation-base') - century * constant('solar-nutation-rate');
  return meanLongitude + center - constant('solar-apparent-offset') - constant('solar-apparent-nutation') * Math.sin(radians(node));
};

/** Obliquity of the ecliptic in degrees after nutation correction. */
export const obliquityCorrection = (century: number): number => {
  const seconds =
    constant('solar-obliquity-seconds') -
    century * (constant('solar-obliquity-rate') + century * (constant('solar-obliquity-quadratic') - century * constant('solar-obliquity-cubic')));
  const mean = constant('solar-obliquity-degrees') +
    (constant('solar-obliquity-minutes') + seconds / constant('solar-seconds-per-minute')) / constant('solar-minutes-per-hour');
  const node = constant('solar-nutation-base') - century * constant('solar-nutation-rate');
  return mean + constant('solar-obliquity-nutation') * Math.cos(radians(node));
};

/** Solar declination in degrees. */
export const solarDeclination = (apparent: number, obliquity: number): number =>
  degrees(Math.asin(Math.sin(radians(obliquity)) * Math.sin(radians(apparent))));

/** Inputs to the equation of time. */
export interface EquationTerms {
  meanLongitude: number;
  anomaly: number;
  eccentricity: number;
  obliquity: number;
}

/** Equation of time in minutes. */
export const equationOfTime = (terms: EquationTerms): number => {
  const { meanLongitude, anomaly, eccentricity, obliquity } = terms;
  const y = Math.tan(radians(obliquity / second)) ** second;
  const term =
    y * Math.sin(second * radians(meanLongitude)) -
    second * eccentricity * Math.sin(radians(anomaly)) +
    constant('solar-eq-time-factor') * eccentricity * y * Math.sin(radians(anomaly)) * Math.cos(second * radians(meanLongitude)) -
    config.math.midpoint * y ** second * Math.sin(constant('solar-eq-time-factor') * radians(meanLongitude)) -
    constant('solar-eq-time-ecc-factor') * eccentricity ** second * Math.sin(second * radians(anomaly));
  return constant('solar-eq-time-factor') * degrees(term);
};

/** Computes sunrise, solar noon and sunset in local minutes from midnight. */
export const solarPosition = (options: SolarOptions): SolarPosition => {
  const century = julianCentury(options.date);
  const orbit = orbitalTerms(century);
  const apparent = apparentLongitude(century, orbit.meanLongitude, orbit.anomaly);
  const obliquity = obliquityCorrection(century);
  const decl = solarDeclination(apparent, obliquity);
  const eqTime = equationOfTime({ ...orbit, obliquity });
  const noon =
    constant('solar-half-day-minutes') -
    constant('solar-eq-time-factor') * options.longitude -
    eqTime +
    options.timezoneOffsetHours * constant('solar-minutes-per-hour');
  const latitude = radians(options.latitude);
  const hourAngleArgument =
    Math.cos(radians(constant('solar-hour-angle-reference'))) / (Math.cos(latitude) * Math.cos(radians(decl))) -
    Math.tan(latitude) * Math.tan(radians(decl));
  const hourAngle = degrees(Math.acos(clamp(hourAngleArgument, -1, 1)));
  const offset = constant('solar-eq-time-factor') * hourAngle;
  return { solarNoonMinutes: noon, sunriseMinutes: noon - offset, sunsetMinutes: noon + offset };
};
