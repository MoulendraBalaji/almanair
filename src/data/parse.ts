/**
 * The ONLY module permitted to use TypeScript assertions.
 * Branded units make µg, kg and hours impossible to confuse at compile time;
 * assertions are contained here so the rest of the codebase stays cast-free.
 */
declare const brand: unique symbol;

/** Attaches a phantom brand to a primitive without changing its runtime shape. */
export type Branded<Value, Name extends string> = Value & { readonly [brand]: Name };

/** Micrograms of pollutant mass. */
export type Micrograms = Branded<number, 'Micrograms'>;
/** Cubic metres of air. */
export type CubicMetres = Branded<number, 'CubicMetres'>;
/** Hours of elapsed time. */
export type Hours = Branded<number, 'Hours'>;
/** Kilograms of CO2 equivalent. */
export type KgCo2e = Branded<number, 'KgCo2e'>;
/** Dimensionless ratio (0..1 for fractions). */
export type Ratio = Branded<number, 'Ratio'>;
/** Integer count of people, rooms or actions. */
export type Count = Branded<number, 'Count'>;
/** Air changes per hour. */
export type ACH = Branded<number, 'ACH'>;

/** Wraps a validated number as micrograms. */
export const micrograms = (value: number): Micrograms => value as Micrograms;
/** Wraps a validated number as cubic metres. */
export const cubicMetres = (value: number): CubicMetres => value as CubicMetres;
/** Wraps a validated number as hours. */
export const hours = (value: number): Hours => value as Hours;
/** Wraps a validated number as kilograms CO2e. */
export const kgCo2e = (value: number): KgCo2e => value as KgCo2e;
/** Wraps a validated number as a ratio. */
export const ratio = (value: number): Ratio => value as Ratio;
/** Wraps a validated integer as a count. */
export const count = (value: number): Count => value as Count;
/** Wraps a validated number as air changes per hour. */
export const ach = (value: number): ACH => value as ACH;
