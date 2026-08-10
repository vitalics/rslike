import { test, expect } from "vitest";

import { Channel, fromArray, pipe } from "../src/index";

// ── pollNext contract ──────────────────────────────────────────────

test("fromArray.pollNext is always synchronously ready", () => {
  const s = fromArray([1, 2]);
  expect(s.pollNext!()!.unwrap().unwrap()).toBe(1);
  expect(s.pollNext!()!.unwrap().unwrap()).toBe(2);
  expect(s.pollNext!()!.unwrap().isNone()).toBe(true);
});

test("pollNext and next observe the same cursor", async () => {
  const s = fromArray([1, 2, 3]);
  expect(s.pollNext!()!.unwrap().unwrap()).toBe(1);
  expect((await s.next()).unwrap().unwrap()).toBe(2);
  expect(s.pollNext!()!.unwrap().unwrap()).toBe(3);
});

test("Channel.pollNext: buffered item is ready, empty open channel is pending", async () => {
  const ch = new Channel<number>();
  expect(ch.pollNext()).toBeUndefined();
  await ch.send(7);
  expect(ch.pollNext()!.unwrap().unwrap()).toBe(7);
  expect(ch.pollNext()).toBeUndefined();
});

test("Channel.pollNext: closed channel reports end-of-stream synchronously", async () => {
  const ch = new Channel<number>();
  await ch.close();
  expect(ch.pollNext()!.unwrap().isNone()).toBe(true);
});

// ── consumers use the fast path but semantics stay identical ──────

test("collect over fromArray", async () => {
  const r = await fromArray([1, 2, 3]).collect();
  expect(r.unwrap()).toEqual([1, 2, 3]);
});

test("fold/find/all over fromArray", async () => {
  expect((await fromArray([1, 2, 3]).fold(0, (a, v) => a + v)).unwrap()).toBe(6);
  expect(
    (await fromArray([1, 2, 3]).find((v) => v === 2)).unwrap().unwrap()
  ).toBe(2);
  expect((await fromArray([2, 4]).all((v) => v % 2 === 0)).unwrap()).toBe(true);
});

test("collect drains a channel that is fed and closed asynchronously", async () => {
  const ch = new Channel<number>();
  const collected = ch.collect();
  await ch.send(1);
  await ch.send(2);
  await ch.close();
  expect((await collected).unwrap()).toEqual([1, 2]);
});

test("pipe uses the fast path and delivers everything in order", async () => {
  const ch = new Channel<number>();
  const drained = ch.collect().then((r) => r.unwrap());
  const data = Array.from({ length: 100 }, (_, i) => i);
  const r = await pipe(fromArray(data), ch, { batchSize: 16 });
  expect(r.isOk()).toBe(true);
  expect(await drained).toEqual(data);
});

test("adapters on top of a poll-ready source still work", async () => {
  const r = await fromArray([1, 2, 3, 4])
    .map((v) => v * 2)
    .filter((v) => v % 4 === 0)
    .collect();
  expect(r.unwrap()).toEqual([4, 8]);
});

// ── pollNext propagation through adapters ──────────────────────────

test("pollNext propagates through an adapter chain", () => {
  const s = fromArray([1, 2, 3, 4, 5, 6])
    .map((v) => v * 2)
    .filter((v) => v % 4 === 0)
    .enumerate()
    .take(2);
  // whole chain answers synchronously — no awaits at all
  expect(s.pollNext!()!.unwrap().unwrap()).toEqual([0, 4]);
  expect(s.pollNext!()!.unwrap().unwrap()).toEqual([1, 8]);
  expect(s.pollNext!()!.unwrap().isNone()).toBe(true);
});

test("adapter poll goes pending on an open empty channel without losing state", async () => {
  const ch = new Channel<number>();
  const s = ch.map((v) => v + 1).filter((v) => v % 2 === 0);
  expect(s.pollNext!()).toBeUndefined();
  await ch.send(1); // → 2, passes filter
  expect(s.pollNext!()!.unwrap().unwrap()).toBe(2);
  expect(s.pollNext!()).toBeUndefined();
});

test("zip poll stashes the left value when the right side is pending", async () => {
  const right = new Channel<string>();
  const s = fromArray([1, 2]).zip(right);
  expect(s.pollNext!()).toBeUndefined(); // 1 pulled, stashed
  await right.send("a");
  expect(s.pollNext!()!.unwrap().unwrap()).toEqual([1, "a"]); // stash used
  await right.send("b");
  expect((await s.next()).unwrap().unwrap()).toEqual([2, "b"]);
});

test("buffer poll keeps a partial chunk across pending", async () => {
  const ch = new Channel<number>();
  const s = ch.buffer(3);
  await ch.send(1);
  await ch.send(2);
  expect(s.pollNext!()).toBeUndefined(); // 2 of 3 gathered, pending
  await ch.send(3);
  expect(s.pollNext!()!.unwrap().unwrap()).toEqual([1, 2, 3]);
});

test("throttle has no sync fast path", () => {
  const s = fromArray([1, 2]).throttle(10);
  expect(s.pollNext!()).toBeUndefined();
});
