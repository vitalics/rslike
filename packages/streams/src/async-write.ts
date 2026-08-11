import type { Result } from "@rslike/std";

export interface AsyncWrite {
  /** Writes a chunk. Returns the number of bytes written. */
  write(buf: Uint8Array): Promise<Result<number, Error>>;

  /** Writes everything or returns Err. */
  writeAll(buf: Uint8Array): Promise<Result<void, Error>>;

  /** Writes a string as UTF-8. */
  writeStr(s: string): Promise<Result<void, Error>>;

  /** Flushes internal buffers. */
  flush(): Promise<Result<void, Error>>;

  /** Closes the stream. */
  close(): Promise<Result<void, Error>>;
}

/** BufWriter implements AsyncWrite, but buffers internally. */
export interface AsyncBufWrite extends AsyncWrite {}
