/** Injected time source: engines never read the system clock directly. */
export interface Clock {
  /** Current instant. */
  now(): Date;
}

/** Clock used by tests and deterministic plan snapshots. */
export const fixedClock = (instant: Date): Clock => ({ now: () => instant });
