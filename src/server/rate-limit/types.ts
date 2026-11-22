/** Shared rate-limit contracts. */

/** Result of one admission check. */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** An atomic shared daily counter; remote implementations may fail open. */
export interface GlobalLimitStore {
  /** Increments the counter and reports whether this request is admitted. */
  tryAcquire(key: string, now: number): Promise<boolean>;
}
