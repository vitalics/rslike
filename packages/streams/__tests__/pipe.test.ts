import { test, expect } from "vitest";
import { Ok, Err, type Result } from "@rslike/std";

import { Channel, fromArray, pipe } from "../src/index";
import type { Sink } from "../src/sink";
import type { Stream } from "../src/stream";

function drainingChannel<T>(): { ch: Channel<T>; drained: Promise<T[]> } {
  const ch = new Channel<T>();
  const drained = ch.collect().then((r) => r.unwrap());
  return { ch, drained };
}

// ── default (sequential) ───────────────────────────────────────────

test("pipe default: delivers all items in order and closes the sink", async () => {
  const { ch, drained } = drainingChannel<number>();
  const r = await pipe(fromArray([1, 2, 3]), ch);
  expect(r.isOk()).toBe(true);
  expect(await drained).toEqual([1, 2, 3]);
});

// ── batched ────────────────────────────────────────────────────────

test.each([2, 3, 32])(
  "pipe batchSize=%i: same items, same order",
  async (batchSize) => {
    const data = Array.from({ length: 10 }, (_, i) => i);
    const { ch, drained } = drainingChannel<number>();
    const r = await pipe(fromArray(data), ch, { batchSize });
    expect(r.isOk()).toBe(true);
    expect(await drained).toEqual(data);
  }
);

test("pipe batchSize larger than the source", async () => {
  const { ch, drained } = drainingChannel<number>();
  const r = await pipe(fromArray([1, 2]), ch, { batchSize: 100 });
  expect(r.isOk()).toBe(true);
  expect(await drained).toEqual([1, 2]);
});

test("pipe batchSize=1 matches the default protocol", async () => {
  const { ch, drained } = drainingChannel<number>();
  const r = await pipe(fromArray([5]), ch, { batchSize: 1 });
  expect(r.isOk()).toBe(true);
  expect(await drained).toEqual([5]);
});

// ── errors ─────────────────────────────────────────────────────────

class FailingSink<T> implements Sink<T, Error> {
  sent: T[] = [];
  closed = false;
  constructor(private failAt: number) {}

  async ready(): Promise<Result<void, Error>> {
    return Ok(undefined);
  }
  async send(item: T): Promise<Result<void, Error>> {
    if (this.sent.length >= this.failAt) return Err(new Error("sink full"));
    this.sent.push(item);
    return Ok(undefined);
  }
  async sendAll(): Promise<Result<void, Error>> {
    return Ok(undefined);
  }
  async flush(): Promise<Result<void, Error>> {
    return Ok(undefined);
  }
  async close(): Promise<Result<void, Error>> {
    this.closed = true;
    return Ok(undefined);
  }
}

test("pipe batched: send error surfaces and the sink is closed", async () => {
  const sink = new FailingSink<number>(3);
  const r = await pipe(fromArray([1, 2, 3, 4, 5, 6, 7, 8]), sink, {
    batchSize: 4,
  });
  expect(r.isErr()).toBe(true);
  expect((r.unwrapErr() as Error).message).toBe("sink full");
  expect(sink.sent).toEqual([1, 2, 3]);
  expect(sink.closed).toBe(true);
});

test("pipe batched: source error surfaces after in-flight sends", async () => {
  let i = 0;
  const source = {
    async next(): Promise<Result<import("@rslike/std").Option<number>, Error>> {
      i++;
      if (i <= 2) return fromArray([i]).next();
      return Err(new Error("source boom"));
    },
  } as unknown as Stream<number, Error>;
  const sink = new FailingSink<number>(Infinity);
  const r = await pipe(source as never, sink, { batchSize: 4 });
  expect(r.isErr()).toBe(true);
  expect((r.unwrapErr() as Error).message).toBe("source boom");
  expect(sink.sent).toEqual([1, 2]);
  expect(sink.closed).toBe(true);
});

// ── validation ─────────────────────────────────────────────────────

test.each([0, -1, 1.5, NaN, Infinity])(
  "pipe rejects invalid batchSize %s",
  async (batchSize) => {
    await expect(
      pipe(fromArray([1]), new Channel<number>(), { batchSize })
    ).rejects.toThrow(TypeError);
  }
);
