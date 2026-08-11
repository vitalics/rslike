import type { Result } from "@rslike/std";

export interface AsyncRead {
  /** Analog of `Read::read`. Returns the number of bytes read. */
  read(buf: Uint8Array): Promise<Result<number, Error>>;

  /** Reads everything to the end. */
  readToEnd(): Promise<Result<Uint8Array, Error>>;

  /** Reads exactly `buf.length` bytes. */
  readExact(buf: Uint8Array): Promise<Result<void, Error>>;

  /** Reads everything and decodes it into a string. */
  readToString(): Promise<Result<string, Error>>;
}

export interface AsyncBufRead extends AsyncRead {
  /** Returns a view into the internal buffer. Does not copy. */
  fillBuf(): Promise<Result<Uint8Array, Error>>;

  /** Consumes `amt` bytes from the internal buffer. */
  consume(amt: number): Result<void, Error>;

  /** Reads up to the delimiter (inclusive). */
  readUntil(sep: number): Promise<Result<Uint8Array, Error>>;

  /** Reads a line up to `\n` (or `\r\n`). */
  readLine(): Promise<Result<string, Error>>;
}
