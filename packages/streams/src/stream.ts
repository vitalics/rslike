import type { IterLike } from "@rslike/iter";
import type { Option, Result } from "@rslike/std";

export interface Stream<T, E = Error>
  extends IterLike<T, Promise<Result<Option<T>, E>>> {
  /**
   * Analog of `Stream::next()`.
   * Ok(Some(v)) — a value is available.
   * Ok(None()) — the stream has ended.
   * Err(e) — an error occurred.
   */
  next(): Promise<Result<Option<T>, E>>;

  /**
   * Optional synchronous fast path — analog of Rust's `Poll::Ready`.
   *
   * Returns the same value `next()` would resolve with, when it is
   * available synchronously (buffered item, in-memory source, ended
   * stream), or `undefined` when the caller must fall back to
   * `await next()` (`Poll::Pending`).
   *
   * Consumers use it as `stream.pollNext?.() ?? await stream.next()` —
   * skipping the per-item microtask tick that `await` costs even on an
   * already-resolved promise.
   */
  pollNext?(): Result<Option<T>, E> | undefined;

  // --- Lazy adapters (return new Stream types) ---
  map<U>(f: (item: T) => U): Stream<U, E>;
  filter(pred: (item: T) => boolean): Stream<T, E>;
  take(n: number): Stream<T, E>;
  skip(n: number): Stream<T, E>;
  stepBy(step: number): Stream<T, E>;
  chain(other: Stream<T, E>): Stream<T, E>;
  zip<U>(other: Stream<U, E>): Stream<[T, U], E>;
  enumerate(): Stream<[number, T], E>;
  inspect(f: (item: T) => void): Stream<T, E>;
  throttle(ms: number): Stream<T, E>;
  buffer(size: number): Stream<T[], E>;
  fuse(): Stream<T, E>;

  // --- Terminators ---
  forEach(f: (item: T) => void | Promise<void>): Promise<Result<void, E>>;
  fold<U>(init: U, f: (acc: U, item: T) => U): Promise<Result<U, E>>;
  collect(): Promise<Result<T[], E>>;
  find(pred: (item: T) => boolean): Promise<Result<Option<T>, E>>;
  any(pred: (item: T) => boolean): Promise<Result<boolean, E>>;
  all(pred: (item: T) => boolean): Promise<Result<boolean, E>>;
  count(): Promise<Result<number, E>>;

  // --- Interop ---
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

export interface TryStream<T, E = Error> extends Stream<Result<T, E>, E> {
  tryCollect(): Promise<Result<T[], E>>;
  tryForEach(f: (item: T) => void | Promise<void>): Promise<Result<void, E>>;
}
