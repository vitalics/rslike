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

import { Result, Ok, Err } from '../src/result';
import { Option } from '../src/option';

test('isOk should returns true for Ok value', () => {
  const a = Ok(12);
  expect(a).toBeInstanceOf(Result);
  expect(a.isOk()).toBe(true);
});


test('isErr should returns true for Ok value', () => {
  const a = Err(12);
  expect(a).toBeInstanceOf(Result);
  expect(a.isErr()).toBe(true);
});

test('isOkAnd should not call predicate for Err result', () => {
  const e = Err(123);

  const fn = jest.fn();
  const res = e.isOkAnd(fn);

  expect(res).toBe(false);
  expect(fn).not.toHaveBeenCalled();
});
test('isOkAnd should throws if predicate is not a function', () => {
  const e = Ok(123);

  // @ts-expect-error
  expect(() => e.isOkAnd(123)).toThrow();
});

test('isOkAnd should call predicate for Ok result', () => {
  const e = Ok(4);

  const fn = jest.fn(() => true);
  const res = e.isOkAnd(fn);

  expect(res).toBe(true);
  expect(fn).toHaveBeenCalled();
});

test('isErrAnd should call predicate for Err result', () => {
  const e = Err(4);

  const fn = jest.fn(() => true);
  const res = e.isErrAnd(fn);

  expect(res).toBe(true);
  expect(fn).toHaveBeenCalled();
});

test('isErrAnd should not call predicate for Ok result', () => {
  const e = Ok(123);

  const fn = jest.fn(() => true);
  const res = e.isErrAnd(fn);

  expect(res).toBe(false);
  expect(fn).not.toHaveBeenCalled();
});

test('ok should returns Some of Ok', () => {
  const a = Ok(123);

  const res = a.ok();

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test('ok should returns None of Err', () => {
  const a = Err(123);

  const res = a.ok();

  expect(res).toBeInstanceOf(Option);
  expect(res.isNone()).toBe(true);
});


test('err should returns None of Ok', () => {
  const a = Ok(123);

  const res = a.err();

  expect(res).toBeInstanceOf(Option);
  expect(res.isNone()).toBe(true);
});

test('err should returns Ok of Err', () => {
  const a = Err(123);

  const res = a.err();

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test('map should transform Ok result', () => {
  const a = Ok(1);

  const fn = jest.fn((x: number) => String(x));
  const res = a.map(fn);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(true);
  expect(res.unwrap()).toBe('1');
  expect(fn).toBeCalledWith(1);
  expect(fn).toBeCalledTimes(1);
});


test('map function should not been called for Err result', () => {
  const a = Err(1);

  const fn = jest.fn(() => "qwe");
  const res = a.map(fn);

  expect(res).toBeInstanceOf(Result);
  expect(res.isErr()).toBe(true);
  expect(fn).not.toBeCalled();
});

test('mapOr should return alretnative result for Err result', () => {
  const a = Err(123);

  const fn = jest.fn(() => 3);
  const res = a.mapOr(42, fn);

  expect(fn).not.toBeCalled();
  expect(res).toBe(42);
});


test('mapOr should return result of mapping result', () => {
  const a = Ok(123);

  const fn = jest.fn(() => 3);
  const res = a.mapOr(42, fn);

  expect(fn).toBeCalled();
  expect(res).toBe(3);
});

test('mapOrElse should call okFn only for Ok value', () => {
  const a = Ok(123);

  const okFn = jest.fn(() => 1);
  const errFn = jest.fn(() => 2);

  const res = a.mapOrElse(errFn, okFn);

  expect(okFn).toBeCalled();
  expect(res).toBe(1);
  expect(errFn).not.toBeCalled();
});


test('mapOrElse should call errFn only for Err value', () => {
  const a = Err(123);

  const okFn = jest.fn(() => 1);
  const errFn = jest.fn(() => 2);

  const res = a.mapOrElse(errFn, okFn);

  expect(errFn).toBeCalled();
  expect(res).toBe(2);
  expect(okFn).not.toBeCalled();
});

test('mapErr should call callback for Err value', () => {
  const a = Err(123);

  const fn = jest.fn(() => 2);
  const res = a.mapErr(fn);

  expect(() => res.unwrap()).toThrow("2");
  expect(fn).toBeCalled();
  expect(res).toBeInstanceOf(Result);
});


test('mapErr should not call callback for Ok value', () => {
  const a = Ok(123);

  const fn = jest.fn(() => 2);
  const res = a.mapErr(fn);

  expect(res.unwrap()).toBe(123);
  expect(fn).not.toBeCalled();
  expect(res).toBeInstanceOf(Result);
});

test('expect should throw an error for Err result', () => {
  const a = Err(123);

  expect(() => a.expect("fail")).toThrow("fail");
});

test('expect should not throw an error for Ok result', () => {
  const a = Ok(123);

  expect(() => a.expect("fail")).not.toThrow("fail");
  expect(a.expect("Error")).toBe(123);
});

test('expectErr should return error for Err value', () => {
  const a = Err(123);

  const err = a.expectErr('some');

  expect(err).toBe(123);
})

test('expectErr should throw an error for Ok value', () => {
  const a = Ok(123);

  expect(() => a.expectErr('some')).toThrow("some");
});


test('unwrap should return value Ok result', () => {
  const a = Ok(123);

  expect(a.unwrap()).toBe(123);
});

test('unwrap should throw an error for Err result', () => {
  const a = Err(123);

  expect(() => a.unwrap()).toThrow("123");
});

test('unwrapOr should calls fallback value for Err', () => {
  const a = Err(123);

  const res = a.unwrapOr(2);

  expect(res).toBe(2);
});

test('unwrapOr should return Ok value for Ok', () => {
  const a = Ok(123);

  const res = a.unwrapOr(2);

  expect(res).toBe(123);
});

test('unwrapErr should returns error for Err result', () => {
  const a = Err(123);

  const res = a.unwrapErr();
  expect(res).toBe(123);
})

test('unwrapErr should throws result for Ok value', () => {
  const a = Ok(123);

  expect(() => a.unwrapErr()).toThrow('123');
});

test('unwrapOrElse should return value for Ok value', () => {
  const a = Ok(123);

  const fn = jest.fn();
  const res = a.unwrapOrElse(fn)

  expect(res).toBe(123);
  expect(fn).not.toHaveBeenCalled();
});

test('unwrapOrElse should call map function for Err value', () => {
  const a = Err(123);

  const fn = jest.fn(() => 2);
  const res = a.unwrapOrElse(fn)

  expect(res).toBe(2);
  expect(fn).toHaveBeenCalled();
});

test('and should return Ok for (Ok,Ok) pair', () => {
  const a = Ok(2);
  const y = Ok('test');

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(true);
  expect(res.unwrap()).toBe("test");
});

test('and should throw an error for non Result parameter', () => {
  const a = Ok(2);
  const y = "qwe"

  // @ts-expect-error
  expect(() => a.and(y)).toThrow();
});

test('and should return Err for (Ok,Err) pair', () => {
  const a = Ok(2);
  const y = Err('test');

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(false);
  expect(res.isErr()).toBe(true);
  expect(res.unwrapErr()).toBe("test");
});

test('and should return Err for (Err,Ok) pair', () => {
  const a = Err(2);
  const y = Ok<string, number>('test');

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(false);
  expect(res.isErr()).toBe(true);
  expect(res.unwrapErr()).toBe(2);
});

test('and should return Err for (Err,Err) pair', () => {
  const a = Err('another');
  const y = Err('test');

  const res = a.and(y);

  expect(res).toBeInstanceOf(Result);
  expect(res.isOk()).toBe(false);
  expect(res.isErr()).toBe(true);
  expect(res.unwrapErr()).toBe('another');
});


test('andThen should throw an error for non function argument', () => {
  const a = Ok('another');

  // @ts-expect-error
  expect(() => a.andThen(123)).toThrow();
});

test('andThen should call fn when status is Ok', () => {
  const a = Ok(2);


  const fn = jest.fn((x: number) => Ok(x * 2));
  const res = a.andThen(fn);

  expect(fn).toBeCalled();
  expect(res).toBeInstanceOf(Result);
  expect(res.unwrap()).toBe(4)
});


test('andThen should throw if function returns not Result instance', () => {
  const a = Ok(2);


  const fn = jest.fn((x: number) => x * 2);
  // @ts-expect-error
  expect(() => a.andThen(fn)).toThrow("Undefined behavior. Function result expected to be instance of Result.");

  expect(fn).toBeCalled();
});

test('andThen should return Err for Err result', () => {
  const a = Err(123);

  const fn = jest.fn();
  const res = a.andThen(fn);
  expect(fn).not.toHaveBeenCalled();
  expect(res).toBeInstanceOf(Result);
  expect(res.isErr()).toBeTruthy();
});

test('or should throw an error for non Result parameter', () => {
  const a = Ok(123);

  // @ts-expect-error
  expect(() => a.or(123)).toThrow();
});

test('or should returns Ok for (Ok, Err) Pair', () => {
  const a = Ok(2);
  const another = Err<number, string>("123");

  const res = a.or(another);

  expect(res.isOk()).toBeTruthy();
});


test('or should returns Ok for (Err, Ok) Pair', () => {
  const a = Err<number, string>("123");
  const another = Ok(2);

  const res = a.or(another);

  expect(res.isOk()).toBeTruthy();
});

test('or should returns Err for (Err, Err) Pair', () => {
  const a: Result<number, string> = Err("123");
  const another: Result<number, string> = Err("2");

  const res = a.or(another);

  expect(res.unwrapErr()).toBe("2");
});

test('or should returns 1 Ok for (Ok, Ok) Pair', () => {
  const a = Ok<number, string>(1);
  const another = Ok<number, string>(2);

  const res = a.or(another);

  expect(res.unwrap()).toBe(1);
});
