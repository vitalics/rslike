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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Err, None, Ok, Some } from '@rslike/std';

import { dbg, DEFAULT_PREFIX } from '../src/debug'

/* eslint-disable @typescript-eslint/ban-ts-comment */

test('dbg should work for number', async () => {
  const a = 123;
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 123`);
  expect(res.name).toBe('a');
  expect(res.type).toBe('number');
  expect(res.value).toBe(123);
});

test('dbg should work for unsafe number', async () => {
  const a = Number.MAX_SAFE_INTEGER + 1;
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 9007199254740992 (unsafe)`);
  expect(res.name).toBe('a');
  expect(res.type).toBe('number');
  expect(res.value).toBe(Number.MAX_SAFE_INTEGER + 1);
});

test('dbg should work for Infinity number', async () => {
  const a = Infinity;
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: Infinity`);

  expect(res.name).toBe('a');
  expect(res.type).toBe('number');
  expect(res.value).toBe(Infinity);
});

test('dbg should work for -Infinity number', async () => {
  const a = -Infinity;
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: -Infinity`);

  expect(res.name).toBe('a');
  expect(res.type).toBe('number');
  expect(res.value).toBe(-Infinity);
});

test('dbg should work for NaN number', async () => {
  const a = NaN;
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: NaN`);

  expect(res.name).toBe('a');
  expect(res.type).toBe('number');
  expect(res.value).toBe(NaN);
});

test('dbg should work for BigInt', async () => {
  const a = 123n;
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: 123n`);


  expect(res.name).toBe('a');
  expect(res.type).toBe('bigint');
  expect(res.value).toBe(123n);
});

test('dbg should work for Objects', async () => {
  const a = { 123: 123, nested: { some: "thing" }, array: [1, 2, 3] };
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: {"123":123,"nested":{"some":"thing"},"array":[1,2,3]}`);
});

test('dbg should returns Symbol as string', () => {
  const a = Symbol('some');
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: Symbol(some)`);

  expect(res.name).toBe('a');
  expect(res.type).toBe('symbol');
})

test('dbg should supports custom delimiter', () => {
  const a = 123
  const log = jest.spyOn(console, "log").mockImplementation();
  const res = dbg(() => a, { delimiter: ':= ' });

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a:= 123`);

  expect(res.name).toBe('a');
  expect(res.type).toBe('number');
  expect(res.message).toBe(`${DEFAULT_PREFIX}a:= 123`);
})

test('dbg should support custom prefix', () => {
  const a = 123
  const log = jest.spyOn(console, "log").mockImplementation();
  const prefix = 'DEBUG:||';
  const res = dbg(() => a, { prefix });

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${prefix}a: 123`);

  expect(res.prefix).toBe(prefix)
})

test('dbg should not prints in console.log when set {"skipConsoleLog": true}', () => {
  const a = 123
  const log = jest.spyOn(console, "log").mockImplementation();
  const warn = jest.spyOn(console, "warn").mockImplementation();
  dbg(() => a, { outputFunction: console.warn });

  expect(log).toBeCalledTimes(0);
  expect(warn).toBeCalledTimes(1);
})

test('dbg should supports Functions', () => {
  const a = function abc() { return 123 };
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: function abc() { return 123; }`);
})

test('dbg should supports arrow Functions', () => {
  const a = () => 123;
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: () => 123`);
})

test('dbg should supports undefined', () => {
  const a = undefined;
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: undefined`);
});

test('dbg should supports null', () => {
  const a = null;
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: null`);
});


test('dbg should throws when given argument is not a function', () => {
  const a = 123

  // @ts-expect-error
  expect(() => dbg(a)).toThrow(Error);
})

test('dbg should print information about Some Option', () => {
  const a = Some(123);
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: {"status":1,"value":123}`);
})

test('dbg should print information about Some Option', () => {
  const a = None<number>();
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: {"status":0}`);
})

test('dbg should print information about Ok Result', () => {
  const a = Ok<number>(123);
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: {"status":1,"value":123,"error":null}`);
})
test('dbg should print information about Err Result', () => {
  const a = Err<number>(123);
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(() => a);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}a: {"status":-1,"value":null,"error":123}`);
})

test('dbg should prints for build-in object', () => {
  const log = jest.spyOn(console, "log").mockImplementation();
  dbg(Math.max);

  expect(log).toBeCalledTimes(1);
  expect(log).toBeCalledWith(`${DEFAULT_PREFIX}function max() { [native code] }: -Infinity`);
})
