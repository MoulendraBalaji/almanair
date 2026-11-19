/** A consistent, explicit result type for every fallible domain operation. */
export interface Ok<Value> {
  readonly ok: true;
  readonly value: Value;
}
/** Failure payload with a stable machine-readable code. */
export interface Err<Error> {
  readonly ok: false;
  readonly error: Error;
}
/** Either a success value or a typed error. */
export type Result<Value, Error> = Ok<Value> | Err<Error>;

/** Wraps a successful value. */
export const ok = <Value>(value: Value): Ok<Value> => ({ ok: true, value });
/** Wraps a typed failure. */
export const err = <Error>(error: Error): Err<Error> => ({ ok: false, error });
/** Narrows a result to success. */
export const isOk = <Value, Error>(result: Result<Value, Error>): result is Ok<Value> => result.ok;
