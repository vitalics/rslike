export type { Stream, TryStream } from "./stream.js";
export { StreamBase } from "./stream-base.js";
export type { Sink } from "./sink.js";
export type { Duplex, AsyncDuplex } from "./duplex.js";
export type { AsyncRead, AsyncBufRead } from "./async-read.js";
export type { AsyncWrite, AsyncBufWrite } from "./async-write.js";
export { Channel, PureDuplex, duplexPair, transform } from "./runtime/pure.js";
// Platform-specific adapters are NOT re-exported from the root entry.
// Import them from the matching runtime subpath instead:
//   @rslike/streams/runtime/node — Node.js streams (Readable/Writable/Duplex)
//   @rslike/streams/runtime/web  — WHATWG Web Streams
//   @rslike/streams/runtime/pure — runtime-agnostic Channel/PureDuplex
export { fromIterable, fromArray } from "./utils/from.js";
export { pipe, type PipeOptions } from "./utils/pipe.js";
export { BufReader } from "./buf/reader.js";
export { BufWriter } from "./buf/writer.js";
