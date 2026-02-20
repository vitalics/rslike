/**
MIT License

Copyright (c) 2023 Vitali Haradkou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { test, expect, vi } from "vitest";

import { dbg, DEFAULT_PREFIX, isProxy } from "../src/debug";
/* eslint-disable @typescript-eslint/ban-ts-comment */

test("dbg should work for number", async () => {
  const a = 123;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 123`);
  expect(res.name).toBe("a");
  expect(res.type).toBe("number");
  expect(res.value).toBe(123);
  expect(res.delimiter).toBe(": ");
  expect(res.prefix).toBe(DEFAULT_PREFIX);
  expect(res.isProxy).toBe(false);
});

test("dbg should work for unsafe number", async () => {
  const a = Number.MAX_SAFE_INTEGER + 1;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 9007199254740992 (unsafe)`);
  expect(res.name).toBe("a");
  expect(res.type).toBe("number");
  expect(res.value).toBe(Number.MAX_SAFE_INTEGER + 1);
});

test("dbg should work for Infinity number", async () => {
  const a = Infinity;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: Infinity`);

  expect(res.name).toBe("a");
  expect(res.type).toBe("number");
  expect(res.value).toBe(Infinity);
});

test("dbg should work for -Infinity number", async () => {
  const a = -Infinity;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: -Infinity`);

  expect(res.name).toBe("a");
  expect(res.type).toBe("number");
  expect(res.value).toBe(-Infinity);
});

test("dbg should work for NaN number", async () => {
  const a = NaN;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: NaN`);

  expect(res.name).toBe("a");
  expect(res.type).toBe("number");
  expect(res.value).toBe(NaN);
});

test("dbg should work for BigInt", async () => {
  const a = 123n;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 123n`);

  expect(res.name).toBe("a");
  expect(res.type).toBe("bigint");
  expect(res.value).toBe(123n);
});

test("dbg should work for Objects", async () => {
  const a = { 123: 123, nested: { some: "thing" }, array: [1, 2, 3] };
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(
    `${DEFAULT_PREFIX}a: {"123":123,"nested":{"some":"thing"},"array":[1,2,3]}`
  );
  expect(res.type).toBe("object");
  expect(res.value).toBe(a);
});

test("dbg should returns Symbol as string", () => {
  const a = Symbol("some");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: Symbol(some)`);

  expect(res.name).toBe("a");
  expect(res.type).toBe("symbol");
  expect(res.value).toBe(a);
});

test("dbg should supports custom delimiter", () => {
  const a = 123;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a, { delimiter: ":= " });

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a:= 123`);

  expect(res.name).toBe("a");
  expect(res.type).toBe("number");
  expect(res.message).toBe(`${DEFAULT_PREFIX}a:= 123`);
  expect(res.delimiter).toBe(":= ");
});

test("dbg should support custom prefix", () => {
  const a = 123;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const prefix = "DEBUG:||";
  const res = dbg(() => a, { prefix });

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${prefix}a: 123`);

  expect(res.prefix).toBe(prefix);
});

test('dbg should not prints in console.log when set {"skipConsoleLog": true}', () => {
  const a = 123;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  dbg(() => a, { outputFunction: console.warn });

  expect(log).toBeCalledTimes(0);
  expect(warn).toBeCalledTimes(1);
});

test("dbg should supports Functions", () => {
  const a = function abc() {
    return 123;
  };
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(
    `${DEFAULT_PREFIX}a: function abc() {
    return 123;
  }`
  );
  expect(res.type).toBe("function");
  expect(res.value).toBe(a);
});

test("dbg should supports arrow Functions", () => {
  const a = () => 123;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: () => 123`);
  expect(res.type).toBe("function");
  expect(res.value).toBe(a);
});

test("dbg should supports undefined", () => {
  const a = undefined;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: undefined`);
  expect(res.type).toBe("undefined");
  expect(res.value).toBe(undefined);
});

test("dbg should supports null", () => {
  const a = null;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: null`);
  // typeof null === "object" in JavaScript — the "null" entry in the type union is unreachable
  expect(res.type).toBe("object");
  expect(res.value).toBe(null);
});

test("dbg should throws when given argument is not a function", () => {
  const a = 123;

  // @ts-expect-error
  expect(() => dbg(a)).toThrow(Error);
});

test("dbg should prints for build-in object", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  dbg(Math.max);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(
    `${DEFAULT_PREFIX}function max() { [native code] }: -Infinity`
  );
});

// ── New coverage ────────────────────────────────────────────────────

test("dbg should work for string", () => {
  const a = "hello";
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  // JSON.stringify wraps strings in quotes
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: "hello"`);
  expect(res.name).toBe("a");
  expect(res.type).toBe("string");
  expect(res.value).toBe("hello");
});

test("dbg should work for boolean true", () => {
  const a = true;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: true`);
  expect(res.name).toBe("a");
  expect(res.type).toBe("boolean");
  expect(res.value).toBe(true);
});

test("dbg should work for boolean false", () => {
  const a = false;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: false`);
  expect(res.name).toBe("a");
  expect(res.type).toBe("boolean");
  expect(res.value).toBe(false);
});

test("dbg should lose the sign of -0 (JSON.stringify behavior)", () => {
  const a = -0;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a);

  // Number.isSafeInteger(-0) === true, so no special branch runs.
  // JSON.stringify(-0) === "0" — the negative sign is silently dropped.
  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 0`);
  expect(res.value).toBe(-0);
  expect(res.type).toBe("number");
});

test("dbg with empty options object behaves identically to no options", () => {
  const a = 123;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => a, {});

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 123`);
  expect(res.delimiter).toBe(": ");
  expect(res.prefix).toBe(DEFAULT_PREFIX);
});

test("dbg outputFunction is called with exactly the message string", () => {
  const a = 123;
  const fn = vi.fn();
  dbg(() => a, { outputFunction: fn });

  expect(fn).toBeCalledTimes(1);
  expect(fn).toBeCalledWith(`${DEFAULT_PREFIX}a: 123`);
  // called with exactly one argument
  expect(fn.mock.calls[0]).toHaveLength(1);
});

test("dbg name reflects property access expression", () => {
  const obj = { x: 42 };
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => obj.x);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}obj.x: 42`);
  expect(res.name).toBe("obj.x");
  expect(res.value).toBe(42);
  expect(res.type).toBe("number");
});

// ── Proxy support ───────────────────────────────────────────────────

test("isProxy returns false for plain objects", () => {
  expect(isProxy({ x: 1 })).toBe(false);
  expect(isProxy([])).toBe(false);
  expect(isProxy(null)).toBe(false);
  expect(isProxy(42)).toBe(false);
  expect(isProxy("str")).toBe(false);
});

test("isProxy returns true for new Proxy()", () => {
  const p = new Proxy({ x: 1 }, {});
  expect(isProxy(p)).toBe(true);
});

test("isProxy returns true for Proxy.revocable()", () => {
  const { proxy } = Proxy.revocable({ x: 1 }, {});
  expect(isProxy(proxy)).toBe(true);
});

test("isProxy returns true for function proxy", () => {
  const p = new Proxy(function foo() {}, {});
  expect(isProxy(p)).toBe(true);
});

test("dbg detects Proxy and marks name with (Proxy)", () => {
  const p = new Proxy({ a: 1, b: 2 }, {});
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = dbg(() => p);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}p (Proxy): {"a":1,"b":2}`);
  expect(res.name).toBe("p");
  expect(res.isProxy).toBe(true);
  expect(res.type).toBe("object");
  expect(res.value).toBe(p);
});

test("dbg prints proxy target data transparently via JSON.stringify", () => {
  const target = { nested: { x: [1, 2, 3] } };
  const p = new Proxy(target, {});
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  dbg(() => p);

  expect(log).toBeCalledWith(
    `${DEFAULT_PREFIX}p (Proxy): {"nested":{"x":[1,2,3]}}`
  );
});

test("dbg proxy with custom handler shows handler-remapped values", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const p = new Proxy(
    { value: 42 },
    { get: (t, k, r) => (k === "value" ? 99 : Reflect.get(t, k, r)) }
  );
  const res = dbg(() => p);

  // JSON.stringify sees through the handler, value is remapped to 99
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}p (Proxy): {"value":99}`);
  expect(res.isProxy).toBe(true);
});

test("Proxy is transparent — behaves exactly like its target", () => {
  const target = { x: 1, y: 2 };
  const p = new Proxy(target, {});

  expect(p.x).toBe(1);
  expect(p.y).toBe(2);
  expect(Object.keys(p)).toEqual(Object.keys(target));
});
