import { expect } from 'vitest';
import type { Result } from '@/domain/result';

/** Unwraps a successful domain result or fails the test with its error code. */
export const unwrap = <Value, Error>(result: Result<Value, Error>): Value => {
  if (!result.ok) throw new Error(String(result.error));
  return result.value;
};

/** Asserts numeric closeness with an explicit tolerance. */
export const expectNear = (actual: number, expected: number, tolerance: number): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};
