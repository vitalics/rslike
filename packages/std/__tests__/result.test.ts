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

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { setTimeout } from "node:timers/promises";
import { inspect } from "node:util";

import { test, expect, vi } from "vitest";

import { Result, Ok, Err } from "../src/result";
import { Option, Some, None } from "../src/option";
import { UndefinedBehaviorError } from "../src/utils";

test("isOk should returns true for Ok value", () => {
  const a = Ok(12);
  expect(a).toBeInstanceOf(Result);
  expect(a.isOk()).toBe(true);
});

test("isErr should returns true for Ok value", () => {
  const a = Err(12);
  expect(a).toBeInstanceOf(Result);
  expect(a.isErr()).toBe(true);
});

test("isOkAnd should not call predicate for Err result", () => {
  const e = Err(123);

  const fn = vi.fn();
  const res = e.isOkAnd(fn);

  expect(res).toBe(false);
  expect(fn).not.toHaveBeenCalled();
});
test("isOkAnd should throws if predicate is not a function", () => {
  const e = Ok(123);

  // @ts-expect-error
  expect(() => e.isOkAnd(123)).toThrow();
});

test("isOkAnd should call predicate for Ok result", () => {
  const e = Ok(4);

  const fn = vi.fn(() => true);
  const res = e.isOkAnd(fn);

  expect(res).toBe(true);
  expect(fn).toHaveBeenCalled();
});

test("isErrAnd should call predicate for Err result", () => {
  const e = Err(4);

  const fn = vi.fn(() => true);
  const res = e.isErrAnd(fn);

  expect(res).toBe(true);
  expect(fn).toHaveBeenCalled();
});

test("isErrAnd should not call predicate for Ok result", () => {
  const e = Ok(123);

  const fn = vi.fn(() => true);
  const res = e.isErrAnd(fn);

  expect(res).toBe(false);
  expect(fn).not.toHaveBeenCalled();
});

test("ok should returns Some of Ok", () => {
  const a = Ok(123);

  const res = a.ok();

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test("ok should returns None of Err", () => {
  const a = Err(123);

  const res = a.ok();

  expect(res).toBeInstanceOf(Option);
  expect(res.isNone()).toBe(true);
});

test("err should returns None of Ok", () => {
  const a = Ok(123);

  const res = a.err();

  expect(res).toBeInstanceOf(Option);
  expect(res.isNone()).toBe(true);
});

test("err should returns Ok of Err", () => {
  const a = Err(123);

  const res = a.err();

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test("map should transform Ok result", () => {
  const a = Ok(1);

  const fn = vi.fn((x: number) => String(x));
  const res = a.map(fn);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(true);
  expect(res.unwrap()).toBe("1");
  expect(fn).toBeCalledWith(1);
  expect(fn).toBeCalledTimes(1);
});

test("map function should not been called for Err result", () => {
  const a = Err(1);

  const fn = vi.fn(() => "qwe");
  const res = a.map(fn);

  expect(res).toBeInstanceOf(Result);
  expect(res.isErr()).toBe(true);
  expect(fn).not.toBeCalled();
});

test("mapOr should return alternative result for Err result", () => {
  const a = Err(123);

  const fn = vi.fn(() => 3);
  const res = a.mapOr(42, fn);

  expect(fn).not.toBeCalled();
  expect(res).toBe(42);
});

test("mapOr should return result of mapping result", () => {
  const a = Ok(123);

  const fn = vi.fn(() => 3);
  const res = a.mapOr(42, fn);

  expect(fn).toBeCalled();
  expect(res).toBe(3);
});

test("mapOrElse should call okFn only for Ok value", () => {
  const a = Ok(123);

  const okFn = vi.fn(() => 1);
  const errFn = vi.fn(() => 2);

  const res = a.mapOrElse(errFn, okFn);

  expect(okFn).toBeCalled();
  expect(res).toBe(1);
  expect(errFn).not.toBeCalled();
});

test("mapOrElse should call errFn only for Err value", () => {
  const a = Err(123);

  const okFn = vi.fn(() => 1);
  const errFn = vi.fn(() => 2);

  const res = a.mapOrElse(errFn, okFn);

  expect(errFn).toBeCalled();
  expect(res).toBe(2);
  expect(okFn).not.toBeCalled();
});

test("mapErr should call callback for Err value", () => {
  const a = Err(123);

  const fn = vi.fn(() => 2);
  const res = a.mapErr(fn);

  expect(() => res.unwrap()).toThrow();
  expect(fn).toBeCalled();
  expect(res).toBeInstanceOf(Result);
});

test("mapErr should not call callback for Ok value", () => {
  const a = Ok(123);

  const fn = vi.fn(() => 2);
  const res = a.mapErr(fn);

  expect(res.unwrap()).toBe(123);
  expect(fn).not.toBeCalled();
  expect(res).toBeInstanceOf(Result);
});

test("expect should throw an error for Err result", () => {
  const a = Err(123);

  expect(() => a.expect("fail")).toThrow("fail");
});

test("expect should not throw an error for Ok result", () => {
  const a = Ok(123);

  expect(() => a.expect("fail")).not.toThrow("fail");
  expect(a.expect("Error")).toBe(123);
});

test("expectErr should return error for Err value", () => {
  const a = Err(123);

  const err = a.expectErr("some");

  expect(err).toBe(123);
});

test("expectErr should throw an error for Ok value", () => {
  const a = Ok(123);

  expect(() => a.expectErr("some")).toThrow("some");
});

test("unwrap should return value Ok result", () => {
  const a = Ok(123);

  expect(a.unwrap()).toBe(123);
});

test("unwrap should throw an error for Err result", () => {
  const a = Err(123);

  expect(() => a.unwrap()).toThrow();
});

test("unwrapOr should calls fallback value for Err", () => {
  const a = Err(123);

  const res = a.unwrapOr(2);

  expect(res).toBe(2);
});

test("unwrapOr should return Ok value for Ok", () => {
  const a = Ok(123);

  const res = a.unwrapOr(2);

  expect(res).toBe(123);
});

test("unwrapErr should returns error for Err result", () => {
  const a = Err(123);

  const res = a.unwrapErr();
  expect(res).toBe(123);
});

test("unwrapErr should throws result for Ok value", () => {
  const a = Ok(123);

  expect(() => a.unwrapErr()).toThrow();
});

test("unwrapOrElse should return value for Ok value", () => {
  const a = Ok(123);

  const fn = vi.fn();
  const res = a.unwrapOrElse(fn);

  expect(res).toBe(123);
  expect(fn).not.toHaveBeenCalled();
});

test("unwrapOrElse should call map function for Err value", () => {
  const a = Err(123);

  const fn = vi.fn(() => 2);
  const res = a.unwrapOrElse(fn);

  expect(res).toBe(2);
  expect(fn).toHaveBeenCalled();
});

test("and should return Ok for (Ok,Ok) pair", () => {
  const a = Ok(2);
  const y = Ok("test");

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(true);
  expect(res.unwrap()).toBe("test");
});

test("and should throw an error for non Result parameter", () => {
  const a = Ok(2);
  const y = "qwe";

  // @ts-expect-error
  expect(() => a.and(y)).toThrow();
});

test("and should return Err for (Ok,Err) pair", () => {
  const a = Ok(2);
  const y = Err("test");

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(false);
  expect(res.isErr()).toBe(true);
  expect(res.unwrapErr()).toBe("test");
});

test("and should return Err for (Err,Ok) pair", () => {
  const a = Err(2);
  const y = Ok<string, number>("test");

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(false);
  expect(res.isErr()).toBe(true);
  expect(res.unwrapErr()).toBe(2);
});

test("and should return Err for (Err,Err) pair", () => {
  const a = Err("another");
  const y = Err("test");

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(false);
  expect(res.isErr()).toBe(true);
  expect(res.unwrapErr()).toBe("another");
});

test("andThen should throw an error for non function argument", () => {
  const a = Ok("another");

  // @ts-expect-error
  expect(() => a.andThen(123)).toThrow();
});

test("andThen should call fn when status is Ok", () => {
  const a = Ok(2);

  const fn = vi.fn((x: number) => Ok(x * 2));
  const res = a.andThen(fn);

  expect(fn).toBeCalled();
  expect(res).toBeInstanceOf(Result);
  expect(res.unwrap()).toBe(4);
});

test("andThen should throw if function returns not Result instance", () => {
  const a = Ok(2);

  const fn = vi.fn((x: number) => x * 2);
  // @ts-expect-error
  expect(() => a.andThen(fn)).toThrow(UndefinedBehaviorError);

  expect(fn).toBeCalled();
});

test("andThen should return Err for Err result", () => {
  const a = Err(123);

  const fn = vi.fn();
  const res = a.andThen(fn);
  expect(fn).not.toHaveBeenCalled();
  expect(res).toBeInstanceOf(Result);
  expect(res.isErr()).toBeTruthy();
});

test("or should throw an error for non Result parameter", () => {
  const a = Ok(123);

  // @ts-expect-error
  expect(() => a.or(123)).toThrow();
});

test("or should returns Ok for (Ok, Err) Pair", () => {
  const a = Ok(2);
  const another = Err("123");

  const res = a.or(another);

  expect(res.isOk()).toBeTruthy();
});

test("or should returns Ok for (Err, Ok) Pair", () => {
  const a = Err<number, string>("123");
  const another = Ok(2);

  const res = a.or(another);

  expect(res.isOk()).toBeTruthy();
});

test("or should returns Err for (Err, Err) Pair", () => {
  const a = Err("123");
  const another = Err("2");

  const res = a.or(another);

  expect(res.unwrapErr()).toBe("2");
});

test("or should returns 1 Ok for (Ok, Ok) Pair", () => {
  const a = Ok(1);
  const another = Ok(2);

  const res = a.or(another);

  expect(res.unwrap()).toBe(1);
});

test("orElse should not throws undefined behavior when status is Ok", () => {
  const a = Ok(4);

  // @ts-expect-error
  const res = a.orElse(2);
  expect(res.isOk()).toBe(true);
  expect(res.unwrap()).toBe(4);
});

test('orElse should throw an "UndefinedBehavior" error when status is Err and argument is not a function', () => {
  const e = Err(4);

  // @ts-expect-error
  expect(() => e.orElse(2)).toThrow(UndefinedBehaviorError);
});

test('orElse should throw an "UndefinedBehavior" error when status is Err and function returns non Result instance', () => {
  const e = Err(4);

  // @ts-expect-error
  expect(() => e.orElse(() => 3)).toThrow(UndefinedBehaviorError);
});

test("orElse should returns function result for Err status", () => {
  const a = Err(34);

  const res = a.orElse(() => Ok(2));
  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBeTruthy();
});

test("orElse should returns self Ok status", () => {
  const a = Ok(34);

  const res = a.orElse(() => Ok(2));
  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBeTruthy();
  expect(res.unwrap()).toBe(34);
});

test("flatten should returns self contained value for non Result instance under provided value", () => {
  const a = Ok(4);

  const another = a.flatten();

  expect(another.unwrap()).toBe(a.unwrap());
});

test("flatten should unwraps contained value", () => {
  const a = Ok(Ok(4));

  const another = a.flatten();

  expect(another.unwrap()).toBe(a.unwrap().unwrap());
});

test("equals should returns true for (Ok, Ok) pair with same values", () => {
  const a = Ok(5);
  const b = Ok(5);

  const equals = a.equal(b);
  expect(equals).toBeTruthy();
});

test("equals should returns false for (Ok, Ok) pair with varios values", () => {
  const a = Ok(5);
  const b = Ok(4);

  const equals = a.equal(b);
  expect(equals).toBe(false);
});

test("equals should returns false for (Ok, non Result) pair with same values", () => {
  const a = Ok(5);

  const equals = a.equal(5);
  expect(equals).toBeFalsy();
});

test("equals should returns true for (Err, Err) pair with same values", () => {
  const a = Err(5);
  const b = Err(5);

  const equals = a.equal(b);
  expect(equals).toBeTruthy();
});

test("equals should returns false for (Ok, Err) pair with same values", () => {
  const a = Ok(5);
  const b = Err(5);

  const equals = a.equal(b);
  expect(equals).toBeFalsy();
});

test("[Symbol.toStringTag] should returns [object Result]", () => {
  const a = Ok(5);

  expect(Object.prototype.toString.call(a)).toBe("[object Result]");
});

test("valueOf should returns value of Ok", () => {
  const a = Ok(3);
  expect(a.valueOf()).toBe(3);
});
test("valueOf should returns undefined for Err", () => {
  const a = Err("qwe");
  expect(a.valueOf()).toBeUndefined();
});

test("toString should returns Ok(3)", () => {
  const a = Ok(3);
  expect(a.toString()).toBe("Ok(3)");
});

test("toString should returns Err(3)", () => {
  const a = Err(3);
  expect(a.toString()).toBe("Err(3)");
});

test("toJSON should be serializable for JSON.stringify", () => {
  const a = Ok(3);
  const stringifyed = JSON.stringify(a);
  expect(stringifyed).toBe('{"status":"Ok","value":3}');
});

test("equal should returns true for custom comparator value", () => {
  const a = Ok(5);

  const equals = a.equal(5, (first, second) => {
    return first.unwrap() === second;
  });

  expect(equals).toBeTruthy();
});

test("is should returns true for instanceof Result", () => {
  const a = Ok(3);
  expect(Result.is(a)).toBe(true);
});

test("is should returns false for not instanceof Result", () => {
  expect(Result.is(3)).toBe(false);
});

test("[Symbol.iterator] should works", () => {
  const a = Ok([1, 2, 3]);
  let el = 1;
  for (const v of a) {
    expect(v).toBe(el);
    el++;
  }
});

test("[Symbol.iterator] should throw for Err", () => {
  const e = Err([1, 2, 3]);
  try {
    // @ts-expect-error more stricter validation
    for (const v of e) {
    }
  } catch (e) {
    expect(e).toBeInstanceOf(Array);
  }
});

test("[Symbol.iterator] should throw for non Iterable object", () => {
  const a = Ok(1);
  try {
    // @ts-expect-error more stricter validation
    for (const v of a) {
    }
  } catch (e) {
    expect(e).toBeInstanceOf(UndefinedBehaviorError);
  }
});

test("[Symbol.split] should works for Ok(string) value", () => {
  const str = "foobar";
  const bar = Ok("bar");
  const foo = str.split(bar);
  expect(foo).toStrictEqual(["foo", ""]);
});

test("[Symbol.split] should throw for Ok(RegExp) value", () => {
  const a = Ok(new RegExp("-"));
  // @ts-expect-error since RegExp is not a string
  expect(() => "2016-01-02".split(a)).toThrow(UndefinedBehaviorError);
});

test("[Symbol.split] should throws for non string values", () => {
  const a = Ok(5);
  // @ts-expect-error since number is not a string or RegExp
  expect(() => "2016-01-02".split(a)).toThrow(UndefinedBehaviorError);
});

test("[Symbol.split] should throws for Err", () => {
  const a = Err("qwe");
  expect(() => "2016-01-02".split(a)).toThrow("qwe");
});

test("[Symbol.search] should works for Ok(string) value", () => {
  const str = "foobar";
  const bar = Ok("bar");
  const foo = str.search(bar);
  expect(foo).toBe(3);
});

test("[Symbol.search] should throws error for Err", () => {
  const str = "foobar4";
  const v = Err("4");
  expect(() => str.search(v)).toThrow("4");
});

test("[Symbol.search] should throws error for not a string", () => {
  const str = "foobar4";
  const v = Ok(5);
  // @ts-expect-error only string value are allowed
  expect(() => str.search(v)).toThrow(UndefinedBehaviorError);
});

test("[Symbol.asyncIterator] should throw error for object without [Symbol.asyncIterator] implementation", async () => {
  vi.useFakeTimers();
  const timer = vi.fn(setTimeout);
  timer.mockImplementation((_, value) => value);

  const delays = Ok([timer(500, 1), timer(1300, 2)]);
  let el = 1;
  try {
    // @ts-expect-error only async iterator available here
    for await (const delay of delays) {
      expect(delay).toBe(el);
      el++;
    }
  } catch (e) {
    expect(e).toBeInstanceOf(UndefinedBehaviorError);
  }
  expect(timer).toHaveBeenCalledTimes(2);
  vi.clearAllTimers();
});

test("[Symbol.asyncIterator] should throw for Err", async () => {
  const a = Err(Promise.resolve(3));
  try {
    // @ts-expect-error not implements async iterator
    for await (const b of a) {
    }
  } catch (e) {
    expect(e).toBeInstanceOf(Promise);
  }
});

test("[Symbol.asyncIterator] should not throw for object with asyncIterator", async () => {
  const a = Ok({
    *[Symbol.asyncIterator]() {
      yield 1;
      yield 2;
      yield 3;
      return Promise.resolve(4);
    },
  });
  let item = 1;
  for await (const b of a) {
    expect(item).toBe(b);
    item++;
  }
});

test("instanceof should be equal to Result and Ok", () => {
  const s = Ok(4);
  const isInstanceOfSome = s instanceof Ok;
  const isInstanceOfNumber = (5 as any) instanceof Ok;
  const isInstanceOfOption = s instanceof Result;
  const isInstanceOfObject = {} instanceof Ok;
  expect(isInstanceOfSome).toBeTruthy();
  expect(isInstanceOfOption).toBeTruthy();
  expect(isInstanceOfNumber).toBeFalsy();
  expect(isInstanceOfObject).toBeFalsy();
});

test("instanceof should be equal to Option and None", () => {
  const s = Err("qwe");
  const isInstanceOfNone = s instanceof Err;
  const isInstanceOfNumber = (5 as any) instanceof Err;
  const isInstanceOfObject = {} instanceof Err;
  const isInstanceOfOption = s instanceof Result;
  expect(isInstanceOfNone).toBeTruthy();
  expect(isInstanceOfOption).toBeTruthy();
  expect(isInstanceOfNumber).toBeFalsy();
  expect(isInstanceOfObject).toBeFalsy();
});

test("inspect.util should works", () => {
  const a = Ok(4);
  const ai = inspect(a);
  expect(ai).toBe("Ok(4)");

  const b = Err("qwe");
  const bi = inspect(b);
  expect(bi).toBe("Err('qwe')");

  const c = Ok(null);
  const ci = inspect(c);
  expect(ci).toBe("Ok(null)");

  const d = Ok(4);
  const di = inspect(d, { depth: -3 });
  expect(di).toBe("Ok");

  const e = Ok({});
  const ei = inspect(e, { depth: null });
  expect(ei).toBe("Ok({})");

  const err = Err(new Error("qwe"));
  const erri = inspect(err);
  expect(erri.startsWith("Err(Error: qwe)")).toBeTruthy();
});

test("fromPromise should work for non promise value", async () => {
  const a = await Result.fromPromise(2);
  expect(a.isOk()).toBeTruthy();
  expect(a.unwrap()).toBe(2);
});

test("fromPromise should work for promise value", async () => {
  const a = await Result.fromPromise(Promise.resolve(2));
  expect(a.isOk()).toBeTruthy();
  expect(a.unwrap()).toBe(2);
});

test("fromPromise should work for promise reject value", async () => {
  const a = await Result.fromPromise(Promise.reject(2));
  expect(a.isErr()).toBeTruthy();
  expect(a.unwrapErr()).toBe(2);
});

test("constructor should returns wrapped error", () => {
  const r = new Result(() => {
    throw new Error("qwe");
  });
  expect(r.isErr()).toBe(true);
  expect(r.unwrapErr()).toBeInstanceOf(Error);
});

test("constructor should returns OK value for normal execution", () => {
  const r = new Result(() => {
    return "ok status";
  });
  expect(r.isOk()).toBe(true);
  expect(r.unwrap()).toBe("ok status");
});

test("constructor should returns Err for error handler usage", () => {
  const r = new Result((ok, err) => {
    err(new Error("qwe"));
  });
  expect(r.isErr()).toBe(true);
  expect(r.unwrapErr()).toBeInstanceOf(Error);
  expect((r.unwrapErr() as Error).message).toBe("qwe");
});

test("constructor should return Result value from Some", () => {
  const opt = Some("some value");
  const r = new Result(() => {
    return opt;
  });
  expect(r.unwrap()).toBe(opt.unwrap());
});

test("constructor should return Result value from None", () => {
  const opt = None();
  const r = new Result(() => {
    return opt;
  });
  expect(r.unwrapErr()).toBe(opt.valueOf());
});
test("constructor should return Result value from Ok", () => {
  const opt = Ok("some value");
  const r = new Result(() => {
    return opt;
  });
  expect(r.unwrap()).toBe(opt.unwrap());
});
test("constructor should return Result value from Err", () => {
  const opt = Err("some value");
  const r = new Result(() => {
    return opt;
  });
  expect(r.unwrapErr()).toBe(opt.unwrapErr());
});

// test("constructor should fail UndefinedBehaviorError for async function", () => {
//   const asyncFn = vi.fn(() => Promise.resolve());
//   expect(() => new Result(asyncFn)).rejects.toThrowError(UndefinedBehaviorError);
// });

// test("constructor should fail UndefinedBehaviorError for returning promise", () => {
//   expect(
//     () =>
//       new Result(() => {
//         return Promise.reject(new Error("qwe"));
//       })
//   ).toThrowError(UndefinedBehaviorError);
// });

test("withResolvers should work", () => {
  const { ok, result, err } = Result.withResolvers();
  ok(3);
  expect(result.isOk()).toBe(true);

  err("some");
  // should not change after getting result
  expect(result.isErr()).toBe(false);
});

test("withResolvers should allow to pass empty Ok value", () => {
  const { ok, result } = Result.withResolvers();
  ok();
  expect(result.isOk()).toBe(true);
});
