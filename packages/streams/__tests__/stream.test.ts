import { test, expect, vi } from "vitest";
import { Err, None, Ok, Some, type Option, type Result } from "@rslike/std";
import {
  Channel,
  StreamBase,
  fromArray,
  fromIterable,
  pipe,
} from "../src/index";

function lazySource<T>(items: T[]) {
  let i = 0;
  let pulls = 0;
  const stream = StreamBase.fromNext<T, Error>(async () => {
    if (i >= items.length) return Ok(None());
    pulls++;
    return Ok(Some(items[i++]));
  });
  return { stream, pulls: () => pulls };
}

class FailingStream<T, E> extends StreamBase<T, E> {
  constructor(private items: T[], private error: E, private failAt: number) {
    super();
  }
  private i = 0;
  async next(): Promise<Result<Option<T>, E>> {
    if (this.i === this.failAt) return Err(this.error) as never;
    if (this.i >= this.items.length) return Ok(None());
    return Ok(Some(this.items[this.i++]));
  }
}

// ── fromArray / fromIterable / next ────────────────────────────────

test("fromArray stream yields all items then None", async () => {
  const s = fromArray([1, 2, 3]);
  expect((await s.next()).unwrap().unwrap()).toBe(1);
  expect((await s.next()).unwrap().unwrap()).toBe(2);
  expect((await s.next()).unwrap().unwrap()).toBe(3);
  expect((await s.next()).unwrap().isNone()).toBe(true);
});

test("fromIterable accepts sync and async iterables", async () => {
  async function* agen() {
    yield 1;
    yield 2;
  }
  expect((await fromIterable([1, 2]).collect()).unwrap()).toEqual([1, 2]);
  expect((await fromIterable(agen()).collect()).unwrap()).toEqual([1, 2]);
});

// ── Adapters ───────────────────────────────────────────────────────

test("map transforms items lazily", async () => {
  expect(
    (
      await fromArray([1, 2, 3])
        .map((v) => v * 2)
        .collect()
    ).unwrap()
  ).toEqual([2, 4, 6]);
});

test("filter keeps matching items", async () => {
  expect(
    (
      await fromArray([1, 2, 3, 4])
        .filter((v) => v % 2 === 0)
        .collect()
    ).unwrap()
  ).toEqual([2, 4]);
});

test("take yields at most n items", async () => {
  expect((await fromArray([1, 2, 3, 4]).take(2).collect()).unwrap()).toEqual([
    1, 2,
  ]);
});

test("skip skips first n items", async () => {
  expect((await fromArray([1, 2, 3, 4]).skip(2).collect()).unwrap()).toEqual([
    3, 4,
  ]);
});

test("skip more than length yields nothing", async () => {
  expect((await fromArray([1]).skip(5).collect()).unwrap()).toEqual([]);
});

test("stepBy yields every n-th item", async () => {
  expect(
    (await fromArray([0, 1, 2, 3, 4, 5]).stepBy(2).collect()).unwrap()
  ).toEqual([0, 2, 4]);
});

test("stepBy throws on step < 1", () => {
  expect(() => fromArray([1, 2]).stepBy(0)).toThrow(RangeError);
});

test("chain appends second stream", async () => {
  const s = fromArray([1, 2]).chain(fromArray([3, 4]));
  expect((await s.collect()).unwrap()).toEqual([1, 2, 3, 4]);
});

test("zip pairs items, stops at shorter", async () => {
  const s = fromArray([1, 2, 3]).zip(fromArray(["a", "b"]));
  expect((await s.collect()).unwrap()).toEqual([
    [1, "a"],
    [2, "b"],
  ]);
});

test("enumerate yields [index, item]", async () => {
  expect((await fromArray(["a", "b"]).enumerate().collect()).unwrap()).toEqual([
    [0, "a"],
    [1, "b"],
  ]);
});

test("inspect calls fn without changing items", async () => {
  const seen: number[] = [];
  const result = await fromArray([1, 2])
    .inspect((v) => {
      seen.push(v);
    })
    .collect();
  expect(result.unwrap()).toEqual([1, 2]);
  expect(seen).toEqual([1, 2]);
});

test("buffer accumulates into chunks", async () => {
  expect(
    (await fromArray([1, 2, 3, 4, 5]).buffer(2).collect()).unwrap()
  ).toEqual([[1, 2], [3, 4], [5]]);
});

test("buffer throws on size < 1", () => {
  expect(() => fromArray([1]).buffer(0)).toThrow(RangeError);
});

test("fuse stays exhausted after end", async () => {
  const s = fromArray([1, 2]).fuse();
  expect((await s.next()).unwrap().isSome()).toBe(true);
  expect((await s.next()).unwrap().isSome()).toBe(true);
  expect((await s.next()).unwrap().isNone()).toBe(true);
  expect((await s.next()).unwrap().isNone()).toBe(true);
});

test("throttle spaces out emissions", async () => {
  const start = Date.now();
  const s = fromArray([1, 2]).throttle(40);
  await s.next();
  await s.next();
  expect(Date.now() - start).toBeGreaterThanOrEqual(35);
});

// ── Terminators ────────────────────────────────────────────────────

test("forEach calls fn for each item", async () => {
  const seen: number[] = [];
  const r = await fromArray([1, 2, 3]).forEach((v) => {
    seen.push(v);
  });
  expect(r.isOk()).toBe(true);
  expect(seen).toEqual([1, 2, 3]);
});

test("fold accumulates", async () => {
  expect((await fromArray([1, 2, 3]).fold(0, (a, v) => a + v)).unwrap()).toBe(
    6
  );
});

test("find returns Some(first match) / None", async () => {
  expect(
    (await fromArray([1, 2, 3]).find((v) => v > 1)).unwrap().unwrap()
  ).toBe(2);
  expect(
    (await fromArray([1, 2, 3]).find((v) => v > 5)).unwrap().isNone()
  ).toBe(true);
});

test("any / all", async () => {
  expect((await fromArray([1, 2, 3]).any((v) => v > 2)).unwrap()).toBe(true);
  expect((await fromArray([1, 2, 3]).any((v) => v > 5)).unwrap()).toBe(false);
  expect((await fromArray([2, 4]).all((v) => v % 2 === 0)).unwrap()).toBe(true);
  expect((await fromArray([2, 3]).all((v) => v % 2 === 0)).unwrap()).toBe(
    false
  );
});

test("count counts items", async () => {
  expect((await fromArray([1, 2, 3]).count()).unwrap()).toBe(3);
});

// ── Error propagation ──────────────────────────────────────────────

test("error propagates through map and collect", async () => {
  const s = new FailingStream([1, 2, 3], new Error("boom"), 1).map(
    (v) => v * 2
  );
  const r = await s.collect();
  expect(r.isErr()).toBe(true);
  expect(r.unwrapErr().message).toBe("boom");
});

test("error propagates through filter", async () => {
  const s = new FailingStream([1, 2, 3], new Error("boom"), 2).filter(
    () => true
  );
  const r = await s.collect();
  expect(r.isErr()).toBe(true);
});

test("buffer yields partial chunk then surfaces error", async () => {
  const s = new FailingStream([1, 2, 3], new Error("boom"), 2).buffer(3);
  const first = await s.next();
  expect(first.unwrap().unwrap()).toEqual([1, 2]);
  const second = await s.next();
  expect(second.isErr()).toBe(true);
});

test("fuse terminates after error", async () => {
  const s = new FailingStream([1], new Error("boom"), 1).fuse();
  await s.next();
  expect((await s.next()).isErr()).toBe(true);
  expect((await s.next()).unwrap().isNone()).toBe(true);
});

// ── Channel ────────────────────────────────────────────────────────

test("channel send/next delivers in order", async () => {
  const ch = new Channel<number>();
  await ch.send(1);
  await ch.send(2);
  expect((await ch.next()).unwrap().unwrap()).toBe(1);
  expect((await ch.next()).unwrap().unwrap()).toBe(2);
});

test("channel next() waits for send", async () => {
  const ch = new Channel<number>();
  const pending = ch.next();
  await ch.send(42);
  expect((await pending).unwrap().unwrap()).toBe(42);
});

test("channel close wakes pending readers with None", async () => {
  const ch = new Channel<number>();
  const pending = ch.next();
  await ch.close();
  expect((await pending).unwrap().isNone()).toBe(true);
});

test("send on closed channel returns Err", async () => {
  const ch = new Channel<number>();
  await ch.close();
  expect((await ch.send(1)).isErr()).toBe(true);
});

test("channel sendAll drains a stream", async () => {
  const ch = new Channel<number>();
  const r = await ch.sendAll(fromArray([1, 2, 3]));
  expect(r.isOk()).toBe(true);
  await ch.close();
  expect((await ch.collect()).unwrap()).toEqual([1, 2, 3]);
});

// ── pipe ───────────────────────────────────────────────────────────

test("pipe moves items from stream to sink and closes it", async () => {
  const ch = new Channel<number>();
  const r = await pipe(fromArray([1, 2, 3]), ch);
  expect(r.isOk()).toBe(true);
  expect((await ch.collect()).unwrap()).toEqual([1, 2, 3]);
});

// ── Interop ────────────────────────────────────────────────────────

test("for await...of iterates items and throws on error", async () => {
  const out: number[] = [];
  for await (const v of fromArray([1, 2, 3])) {
    out.push(v);
  }
  expect(out).toEqual([1, 2, 3]);

  const failing = new FailingStream([1], new Error("boom"), 1);
  await expect(async () => {
    for await (const _ of failing) {
      /* noop */
    }
  }).rejects.toThrow("boom");
});

test("asyncIter() converts stream to AsyncIter", async () => {
  const { AsyncIter } = await import("@rslike/iter");
  const ai = fromArray([1, 2, 3]).asyncIter();
  expect(ai).toBeInstanceOf(AsyncIter);
  expect(await ai.map((v) => v * 2).collect()).toEqual([2, 4, 6]);
});

// ══════════════════════════════════════════════════════════════════
// Extended coverage
// ══════════════════════════════════════════════════════════════════

// ── Laziness ───────────────────────────────────────────────────────

test("map does not pull from source until consumed", async () => {
  const { stream, pulls } = lazySource([1, 2, 3]);
  const s = stream.map((v) => v * 2);
  expect(pulls()).toBe(0);
  await s.next();
  expect(pulls()).toBe(1);
});

test("filter does not call predicate until consumed", async () => {
  const pred = vi.fn(() => true);
  fromArray([1, 2, 3]).filter(pred);
  expect(pred).not.toHaveBeenCalled();
});

test("take(2) does not pull the 3rd item", async () => {
  const { stream, pulls } = lazySource([1, 2, 3]);
  await stream.take(2).collect();
  expect(pulls()).toBe(2);
});

// ── Adapter edge cases ─────────────────────────────────────────────

test("map on empty stream", async () => {
  expect(
    (
      await fromArray<number>([])
        .map((v) => v * 2)
        .collect()
    ).unwrap()
  ).toEqual([]);
});

test("filter removing everything", async () => {
  expect(
    (
      await fromArray([1, 3, 5])
        .filter((v) => v % 2 === 0)
        .collect()
    ).unwrap()
  ).toEqual([]);
});

test("take(0) yields nothing", async () => {
  expect((await fromArray([1, 2, 3]).take(0).collect()).unwrap()).toEqual([]);
});

test("take more than length yields everything", async () => {
  expect((await fromArray([1, 2]).take(10).collect()).unwrap()).toEqual([1, 2]);
});

test("skip(0) yields everything", async () => {
  expect((await fromArray([1, 2, 3]).skip(0).collect()).unwrap()).toEqual([
    1, 2, 3,
  ]);
});

test("stepBy(1) yields everything", async () => {
  expect((await fromArray([1, 2, 3]).stepBy(1).collect()).unwrap()).toEqual([
    1, 2, 3,
  ]);
});

test("stepBy larger than length yields only first", async () => {
  expect((await fromArray([1, 2, 3]).stepBy(10).collect()).unwrap()).toEqual([
    1,
  ]);
});

test("chain with empty first stream", async () => {
  expect(
    (
      await fromArray<number>([])
        .chain(fromArray([1, 2]))
        .collect()
    ).unwrap()
  ).toEqual([1, 2]);
});

test("chain with empty second stream", async () => {
  expect(
    (await fromArray([1, 2]).chain(fromArray<number>([])).collect()).unwrap()
  ).toEqual([1, 2]);
});

test("zip with empty stream yields nothing", async () => {
  expect(
    (await fromArray([1, 2]).zip(fromArray<string>([])).collect()).unwrap()
  ).toEqual([]);
});

test("enumerate on empty stream", async () => {
  expect((await fromArray<number>([]).enumerate().collect()).unwrap()).toEqual(
    []
  );
});

test("buffer(1) yields singleton chunks", async () => {
  expect((await fromArray([1, 2, 3]).buffer(1).collect()).unwrap()).toEqual([
    [1],
    [2],
    [3],
  ]);
});

test("buffer larger than source yields single partial chunk", async () => {
  expect((await fromArray([1, 2]).buffer(10).collect()).unwrap()).toEqual([
    [1, 2],
  ]);
});

test("buffer on empty stream yields nothing", async () => {
  expect((await fromArray<number>([]).buffer(3).collect()).unwrap()).toEqual(
    []
  );
});

test("inspect on empty stream does not call fn", async () => {
  const fn = vi.fn();
  await fromArray<number>([]).inspect(fn).collect();
  expect(fn).not.toHaveBeenCalled();
});

// ── Error propagation through all adapters ─────────────────────────

test("error propagates through skip", async () => {
  const r = await new FailingStream([1, 2, 3], new Error("boom"), 2)
    .skip(1)
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through stepBy", async () => {
  const r = await new FailingStream([1, 2, 3, 4], new Error("boom"), 2)
    .stepBy(2)
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through chain", async () => {
  const r = await new FailingStream([1], new Error("boom"), 1)
    .chain(fromArray([2]))
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through zip from first side", async () => {
  const r = await new FailingStream([1, 2], new Error("boom"), 1)
    .zip(fromArray(["a", "b"]))
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through zip from second side", async () => {
  const r = await fromArray([1, 2])
    .zip(new FailingStream(["a", "b"], new Error("boom"), 1))
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through enumerate", async () => {
  const r = await new FailingStream([1, 2], new Error("boom"), 1)
    .enumerate()
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through inspect", async () => {
  const r = await new FailingStream([1, 2], new Error("boom"), 1)
    .inspect(() => {})
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through throttle", async () => {
  const r = await new FailingStream([1, 2], new Error("boom"), 1)
    .throttle(1)
    .collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through take", async () => {
  const r = await new FailingStream([1, 2, 3], new Error("boom"), 1)
    .take(2)
    .collect();
  expect(r.isErr()).toBe(true);
});

test("immediate error at position 0", async () => {
  const r = await new FailingStream([1, 2], new Error("boom"), 0).collect();
  expect(r.isErr()).toBe(true);
});

test("error propagates through forEach/fold/find/any/all/count", async () => {
  const err = new Error("boom");
  expect((await new FailingStream([1], err, 0).forEach(() => {})).isErr()).toBe(
    true
  );
  expect(
    (
      await new FailingStream([1], err, 0).fold(
        0,
        (a: number, v: number) => a + v
      )
    ).isErr()
  ).toBe(true);
  expect((await new FailingStream([1], err, 0).find(() => true)).isErr()).toBe(
    true
  );
  expect((await new FailingStream([1], err, 0).any(() => true)).isErr()).toBe(
    true
  );
  expect((await new FailingStream([1], err, 0).all(() => true)).isErr()).toBe(
    true
  );
  expect((await new FailingStream([1], err, 0).count()).isErr()).toBe(true);
});

// ── Throttle ───────────────────────────────────────────────────────

test("throttle emits first item immediately", async () => {
  const start = Date.now();
  await fromArray([1, 2]).throttle(50).next();
  expect(Date.now() - start).toBeLessThan(40);
});

// ── Terminator edge cases ──────────────────────────────────────────

test("collect on empty stream returns Ok([])", async () => {
  expect((await fromArray<number>([]).collect()).unwrap()).toEqual([]);
});

test("fold on empty stream returns Ok(init)", async () => {
  expect((await fromArray<number>([]).fold(42, (a, v) => a + v)).unwrap()).toBe(
    42
  );
});

test("forEach on empty stream does nothing", async () => {
  const fn = vi.fn();
  expect((await fromArray<number>([]).forEach(fn)).isOk()).toBe(true);
  expect(fn).not.toHaveBeenCalled();
});

test("find on empty stream returns Ok(None)", async () => {
  expect((await fromArray<number>([]).find(() => true)).unwrap().isNone()).toBe(
    true
  );
});

test("any on empty stream returns Ok(false)", async () => {
  expect((await fromArray<number>([]).any(() => true)).unwrap()).toBe(false);
});

test("all on empty stream returns Ok(true)", async () => {
  expect((await fromArray<number>([]).all(() => false)).unwrap()).toBe(true);
});

test("count on empty stream returns Ok(0)", async () => {
  expect((await fromArray<number>([]).count()).unwrap()).toBe(0);
});

// ── Channel extended ───────────────────────────────────────────────

test("channel: multiple pending readers receive items in send order", async () => {
  const ch = new Channel<number>();
  const p1 = ch.next();
  const p2 = ch.next();
  await ch.send(1);
  await ch.send(2);
  expect((await p1).unwrap().unwrap()).toBe(1);
  expect((await p2).unwrap().unwrap()).toBe(2);
});

test("channel: queued items are delivered before new sends resolve waiters", async () => {
  const ch = new Channel<number>();
  await ch.send(1);
  await ch.send(2);
  expect((await ch.next()).unwrap().unwrap()).toBe(1);
  // queue still has 2 — this next() resolves from the queue, not from a later send
  const pending = ch.next();
  await ch.send(3);
  expect((await pending).unwrap().unwrap()).toBe(2);
  expect((await ch.next()).unwrap().unwrap()).toBe(3);
});

test("channel flush() and ready() return Ok", async () => {
  const ch = new Channel<number>();
  expect((await ch.ready()).isOk()).toBe(true);
  expect((await ch.flush()).isOk()).toBe(true);
});

test("channel close is idempotent", async () => {
  const ch = new Channel<number>();
  await ch.close();
  expect((await ch.close()).isOk()).toBe(true);
  expect((await ch.next()).unwrap().isNone()).toBe(true);
});

test("channel sendAll with failing source returns Err", async () => {
  const ch = new Channel<number>();
  const r = await ch.sendAll(new FailingStream([1, 2], new Error("boom"), 1));
  expect(r.isErr()).toBe(true);
  expect((await ch.next()).unwrap().unwrap()).toBe(1);
});

// ── pipe extended ──────────────────────────────────────────────────

test("pipe with failing source returns Err and closes sink", async () => {
  const ch = new Channel<number>();
  const r = await pipe(new FailingStream([1, 2, 3], new Error("boom"), 2), ch);
  expect(r.isErr()).toBe(true);
  // sink closed — subsequent send fails
  expect((await ch.send(99)).isErr()).toBe(true);
});

test("pipe with failing sink returns Err", async () => {
  const ch = new Channel<number>();
  await ch.close(); // send will fail
  const r = await pipe(fromArray([1, 2]), ch);
  expect(r.isErr()).toBe(true);
});

// ── Interop extended ───────────────────────────────────────────────

test("asyncIter() throws stream errors", async () => {
  const ai = new FailingStream([1], new Error("boom"), 1).asyncIter();
  await expect(ai.collect()).rejects.toThrow("boom");
});

test("asyncIter() on empty stream", async () => {
  expect(await fromArray<number>([]).asyncIter().collect()).toEqual([]);
});

test("fromIterable with throwing generator closes the channel", async () => {
  async function* throwing() {
    yield 1;
    throw new Error("generator failed");
  }
  const s = fromIterable(throwing());
  const r = await s.collect();
  // background pump caught the error and closed the channel with delivered items
  expect(r.isOk()).toBe(true);
  expect(r.unwrap()).toEqual([1]);
});

test("StreamBase.fromNext wraps a raw next function", async () => {
  let i = 0;
  const s = StreamBase.fromNext<number, Error>(async () => {
    if (i >= 2) return Ok(None());
    return Ok(Some(i++));
  });
  expect((await s.collect()).unwrap()).toEqual([0, 1]);
});

// ── IterLike conformance ───────────────────────────────────────────

test("Stream satisfies IterLike<T, Promise<Result<Option<T>, E>>>", async () => {
  const { Ok, Some, None, Result, Option } = await import("@rslike/std");
  type RI<T, E> = Result<Option<T>, E>;
  async function drain(
    it: import("@rslike/iter").IterLike<number, Promise<RI<number, Error>>>
  ): Promise<number> {
    let sum = 0;
    for (;;) {
      const r = await it.next();
      if (r.isErr()) throw r.unwrapErr();
      const opt = r.unwrap();
      if (opt.isNone()) return sum;
      sum += opt.unwrap();
    }
  }
  expect(await drain(fromArray([1, 2, 3]))).toBe(6);
  expect(await drain(fromArray([1, 2, 3]).map((v) => v * 2))).toBe(12);

  const ch = new Channel<number>();
  await ch.send(4);
  await ch.close();
  expect(await drain(ch)).toBe(4);
});
