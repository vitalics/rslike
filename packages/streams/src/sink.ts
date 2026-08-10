import type { Result } from "@rslike/std";
import type { Stream } from "./stream.js";

export interface Sink<T, E = Error> {
  /** Whether the Sink is ready to accept a value (backpressure). */
  ready(): Promise<Result<void, E>>;

  /** Sends a single value. */
  send(item: T): Promise<Result<void, E>>;

  /** Drains all items from a Stream into this Sink. */
  sendAll(source: Stream<T, E>): Promise<Result<void, E>>;

  /** Flushes internal buffers. */
  flush(): Promise<Result<void, E>>;

  /** Closes the Sink. */
  close(): Promise<Result<void, E>>;
}
