import { None, Ok, type Option, type Result } from "@rslike/std";

/**
 * Shared immutable singletons for the two hottest protocol values.
 *
 * `Result`/`Option` are write-once (state is assigned in the constructor and
 * never mutated), so a single frozen instance can be returned from every
 * `send()`/`ready()`/`flush()` and every end-of-stream `next()` instead of
 * allocating a fresh wrapper per call.
 */
const OK_VOID: Result<void, never> = Object.freeze(Ok(undefined)) as never;
const OK_NONE: Result<Option<never>, never> = Object.freeze(
  Ok(None()),
) as never;

/** `Ok(undefined)` — successful void operation. */
export function okVoid<E>(): Result<void, E> {
  return OK_VOID as never;
}

/** `Ok(None())` — end of stream. */
export function okNone<T, E>(): Result<Option<T>, E> {
  return OK_NONE as never;
}
