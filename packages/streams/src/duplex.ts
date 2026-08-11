import type { AsyncRead } from "./async-read.js";
import type { AsyncWrite } from "./async-write.js";
import type { Sink } from "./sink.js";
import type { Stream } from "./stream.js";

export interface Duplex<I, O = I, E = Error> {
  readonly source: Stream<O, E>;
  readonly sink: Sink<I, E>;
}

/** For byte-oriented duplexes (TCP, stdin/stdout). */
export interface AsyncDuplex extends AsyncRead, AsyncWrite {}
