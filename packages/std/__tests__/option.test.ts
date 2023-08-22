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

import { UndefinedBehaviorError } from '../src/errors';
import { None, Some, Option } from '../src/option';
import { Result } from '../src/result';

test(`Some should represents it's value`, () => {
  expect(Some(123).unwrap()).toBe(123);
});

test(`Some(Infinity) should returns None`, () => {
  const x = Some(Infinity);
  expect(x.isNone()).toBe(false);
  expect(x.isSome()).toBe(true);
});

test('Some() should returns None', () => {
  expect(Some().isNone()).toBe(true);
});

test('Some(0) should returns 0', () => {
  const zero = Some(0);
  expect(zero.isSome()).toBe(true);
  expect(zero.isNone()).toBe(false);
  expect(zero.unwrap()).toBe(0);
  expect(+zero).toBe(0);
  expect(+zero === 0).toBe(true);
});

test('Some("") should returns ""', () => {
  const zero = Some("");
  expect(zero.isSome()).toBe(true);
  expect(zero.isNone()).toBe(false);
  expect(zero.unwrap()).toBe("");
  expect(String(zero)).toBe("");
  expect(String(zero) === "").toBe(true);
});

test(`Some(undefined) should returns None`, () => {
  expect(Some(undefined).isNone()).toBe(true);
});

test(`Some should represents it's value`, () => {
  expect(Some(123).unwrap()).toBe(123);
});
test(`Some(undefined) should be None`, () => {
  expect(Some(undefined).isNone()).toBe(true);
});
test(`Some(null) should be Some`, () => {
  expect(Some(null).isSome()).toBe(true);
});

test('isSomeAnd should called when Some is provided', () => {
  const two = Some(2);
  const cb = jest.fn(x => x > 1);
  const result = two.isSomeAnd(cb);

  expect(cb).toBeCalled();
  expect(cb).toBeCalledTimes(1);
  expect(result).toBe(true)
});

test('isSomeAnd should called when Some is provided', () => {
  const two = Some(0);
  const cb = jest.fn(x => x > 1);
  const result = two.isSomeAnd(cb);

  expect(cb).toBeCalled();
  expect(cb).toBeCalledTimes(1);
  expect(result).toBe(false)
});

test('isSomeAnd should not be called when None is provided', () => {
  const two = None();
  const cb = jest.fn(x => x > 1);
  const result = two.isSomeAnd(cb);

  expect(cb).not.toBeCalled();
  expect(cb).not.toBeCalledTimes(1);
  expect(result).toBe(false)
});

test('expect should not fails when Some is provided', () => {
  const x = Some(123);

  expect(() => x.expect('Good')).not.toThrow();
});

test('expect should fails when None is provided', () => {
  const x = None();
  const fn = () => x.expect('Good')
  expect(fn).toThrow(Error);
  expect(fn).toThrow("Good");
});

test('unwrap should not throw when Some is provided', () => {
  const a = Some(123);
  expect(a.unwrap()).toBe(123);
});

test('unwrap should throws when None is provided', () => {
  const a = None();
  expect(() => a.unwrap()).toThrow(Error);
});

test('unwrapOr should not throws when Some is provided', () => {
  const a = Some(1);
  expect(a.unwrapOr(2)).toBe(1);
})

test('unwrapOr should return fallback when None is provided', () => {
  const a = None<number>();
  expect(a.unwrapOr(2)).toBe(2);
});

test('unwrapOrElse should not calls when Some is provided', () => {
  const a = Some(123);
  const fn = jest.fn();
  const res = a.unwrapOrElse(fn);

  expect(fn).not.toBeCalled();
  expect(res).toBe(123);
});

test('unwrapOrElse should calls when None is provided', () => {
  const a = None<number>();
  const fn = jest.fn(() => 15);
  const res = a.unwrapOrElse(fn);

  expect(fn).toBeCalled();
  expect(fn).toBeCalledTimes(1);
  expect(res).toBe(15);
});

test('map should be evaluated for Some value', () => {
  const a = Some('Hello world!');
  const fn = jest.fn((s: string) => s.length);
  const res = a.map(fn);

  expect(+res).toBe(12);
  expect(fn).toBeCalled();
  expect(fn).toBeCalledTimes(1);
  expect(res).toBeInstanceOf(Option);
});

test('map should not be called for None value', () => {
  const a = None<string>();
  const fn = jest.fn((s: string) => s.length);
  const res = a.map(fn);

  expect(res.isNone()).toBe(true);
  expect(res).toBeInstanceOf(Option);
  expect(fn).not.toBeCalled();
});

test('mapOr should be called predicate for Some value', () => {
  const a = Some("QWE");
  const fn = jest.fn((s: string) => s.length);
  const result = a.mapOr(42, fn);

  expect(result).toBe(3);
  expect(fn).toBeCalledTimes(1);
})
test('mapOr should be returns fallback value for None value', () => {
  const a = None<string>();

  const fn = jest.fn((s: string) => s.length);
  const result = a.mapOr(42, fn);

  expect(result).toBe(42);
  expect(fn).not.toBeCalled();
});

test('mapOrElse should be calls 2 function for Some value', () => {
  const x = Some("foo");
  const fn1 = jest.fn(() => 2);
  const fn2 = jest.fn((v: string) => {
    expect(v).toBe("foo");
    return v.length;
  });
  const result = x.mapOrElse(fn1, fn2);

  expect(+result).toBe(3);
  expect(fn1).not.toBeCalled();
  expect(fn2).toBeCalledTimes(1);
})
test('mapOrElse should be calls 1 function for None value', () => {
  const x = None<string>();
  const fn1 = jest.fn(() => 2);
  const fn2 = jest.fn((v: string) => {
    return v.length;
  });
  const result = x.mapOrElse(fn1, fn2);

  expect(+result).toBe(2);
  expect(fn1).toBeCalledTimes(1);
  expect(fn2).not.toBeCalled();
});

test('okOr should returns Ok as Result instance for Some value', () => {
  const a = Some('foo');
  const res = a.okOr(0);

  expect(res.unwrap()).toBe("foo");
  expect(res).toBeInstanceOf(Result);
});

test('okOr should returns Err as Result instance for None value', () => {
  const a = None<string>();
  const res = a.okOr(0);

  expect(res.unwrapErr()).toBe(0);
  expect(res).toBeInstanceOf(Result);
});

test('okOrElse callback should not be called for Some value', () => {
  const a = Some('foo');

  const fn = jest.fn();
  const result = a.okOrElse(fn);

  expect(String(a)).toBe(String(result));
  expect(String(result)).toBe('foo');
  expect(fn).not.toHaveBeenCalled();
});

test('okOrElse callback should be called for None value', () => {
  const a = None<string>();

  const fn = jest.fn(() => 'Error!');
  const result = a.okOrElse(fn);

  expect(result.isErr()).toBe(true);
  expect(fn).toBeCalled();
  expect(result).toBeInstanceOf(Result);
  expect(result.unwrapErr()).toBe('Error!');
});

test('and should return 2 Option for (Some,Some) pair', () => {
  const a = Some(123);

  const result = a.and(Some(12345))

  expect(result.unwrap()).toBe(12345);
  expect(result).toBeInstanceOf(Option);
  expect(result.isSome()).toBe(true);
  expect(result.isNone()).toBe(false);
});

test('and should return None Option for (None,Some) pair', () => {
  const a = None<number>();

  const result = a.and(Some(12345))

  expect(result).toBeInstanceOf(Option);
  expect(result.isSome()).toBe(false);
  expect(result.isNone()).toBe(true);
});

test('and should return None Option for (None,None) pair', () => {
  const a = None<number>();

  const result = a.and(None())

  expect(result).toBeInstanceOf(Option);
  expect(result.isSome()).toBe(false);
  expect(result.isNone()).toBe(true);
});

test('and should throw if provided argument is not an Option isntance', () => {
  const a = Some(5);
  // @ts-expect-error
  expect(() => a.and(4)).toThrow(UndefinedBehaviorError);
});

test('andThen should not have been called if 1 Option is None', () => {
  const a = None<number>();

  const fn = jest.fn();
  const result = a.andThen(fn);
  expect(result.isNone()).toBe(true);
  expect(result.isSome()).toBe(false);
});


test('andThen should throw an "UndefinedBehavior" when arguemnt is not a function and have Some status', () => {
  const a = Some(5);

  // @ts-expect-error
  expect(() => a.andThen(123)).toThrow(UndefinedBehaviorError);
});

test('andThen should calls function when argument is Some', () => {
  const a = Some(5);
  // @ts-expect-error
  expect(() => a.andThen(() => 5)).toThrow(UndefinedBehaviorError);
});

test('andThen should calls function', () => {
  const a = Some(5);
  const res = a.andThen(() => None());
  expect(res.isNone()).toBeTruthy();
});

test('filter predicate should not been called when option is None', () => {
  const a = None<string>();

  const fn = jest.fn();
  const result = a.filter(fn);

  expect(result.isNone()).toBe(true);
  expect(fn).not.toHaveBeenCalled();
});

test('filter predicate should been called when option is Some', () => {
  const a = Some(4);
  const fn = jest.fn(x => x % 2 === 0);
  const result = a.filter(fn);

  expect(result.isSome()).toBe(true);
  expect(fn).toHaveBeenCalled();
  expect(result.unwrap()).toBe(4);
});

test('filter predicate should been called and returns None when option is Some and predicate is returns false', () => {
  const a = Some(3);
  const fn = jest.fn(x => x % 2 === 0);
  const result = a.filter(fn);

  expect(result.isNone()).toBe(true);
  expect(fn).toHaveBeenCalled();
});

test('filter predicate should been called and returns Some when option is Some and predicate is returns true', () => {
  const a = Some(4);
  const fn = jest.fn(x => x % 2 === 0);
  const result = a.filter(fn);

  expect(result.isNone()).toBeFalsy();
  expect(result.isSome()).toBeTruthy();
  expect(fn).toHaveBeenCalled();
});

test('xor shoud returns None when argument is not Option', () => {
  const a = Some(123);

  // @ts-expect-error
  const res = a.xor(1234);

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test('xor should return Some for (Some, Some) pair', () => {
  const a = Some(123);

  const res = a.xor(Some(12));

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test('xor should return Some for (None, Some) pair', () => {
  const a = None<number>();

  const res = a.xor(Some(12));

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(12);
});

test('xor should return Some for (Some, None) pair', () => {
  const a = Some<number>(123);

  const res = a.xor(None());

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(123);
});

test('xor should return None for (None, None) pair', () => {
  const a = None<number>();

  const res = a.xor(None());

  expect(res).toBeInstanceOf(Option);
  expect(res.isNone()).toBe(true);
});


test('xor should returns optb when self is None', () => {
  const a = None<number>();

  const res = a.xor(Some(6));

  expect(res).toBeInstanceOf(Option);
  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(6);
});

test('xor should throws an "UndefinedBehavior" error for non Option instance', () => {
  const a = None<number>();

  // @ts-expect-error
  expect(() => a.xor(10)).toThrow(UndefinedBehaviorError);
});

test('insert should mutate original Some value', () => {
  const a = Some(123);

  expect(a.unwrap()).toBe(123);

  const another = a.insert(12);

  expect(a.unwrap()).toBe(12);
  expect(another.isSome()).toBe(true);
  expect(another.unwrap()).toBe(12);
});

test('insert should mutate original None value', () => {
  const a = None<number>();

  expect(a.isNone()).toBe(true);

  const another = a.insert(12);

  expect(a.unwrap()).toBe(12);
  expect(another.isSome()).toBe(true);
  expect(another.unwrap()).toBe(12);
});

test('insert should returns None for undefined value', () => {
  const a = Some<number | undefined>(6);

  const res = a.insert(undefined);

  expect(res).toBeInstanceOf(Option);
  expect(res.isNone()).toBeTruthy();
});

test('replace should return swap instances for Some', () => {
  const a = Some(1);
  const b = a.replace(2);

  expect(a.unwrap()).toBe(2);
  expect(b.unwrap()).toBe(1);
})

test('replace should return swap instances for None', () => {
  const a = None<number>();
  const b = a.replace(2);

  expect(a.unwrap()).toBe(2);
  expect(b.isNone()).toBe(true);
});

test('zip should create a tuple of Option', () => {
  const a = Some(1).zip(Some(2));

  const values = a.unwrap();
  expect(values).toBeInstanceOf(Array);
  expect(values.length).toBe(2);
  expect(values).toEqual([1, 2]);
});

test('zip should throw an "UndefinedBehavior" error for non Option instance', () => {
  const a = Some(5);

  // @ts-expect-error
  expect(() => a.zip(123)).toThrow(UndefinedBehaviorError);
});

test('zip should None for (None, None) pair', () => {
  const a = None<number>();

  const res = a.zip(None());
  expect(res.isNone()).toBeTruthy();
});

test('zipWith should throws error when called for non-Option value', () => {
  const a = Some(1);
  // @ts-expect-error
  expect(() => a.zipWith(123, () => { })).toThrow(UndefinedBehaviorError);
});

test('zipWith should returns None if given Option is None', () => {
  const a = Some(1);
  const res = a.zipWith(None(), () => { });

  expect(res.isNone()).toBe(true);
});

test('zipWith should returns Some for given Option is Some', () => {
  const a = Some(1);

  const fn = jest.fn(() => 4);
  const res = a.zipWith(Some(2), fn);

  expect(res.isSome()).toBe(true);
  expect(res.unwrap()).toBe(4);
  expect(fn).toBeCalledWith(1, 2);
  expect(fn).toBeCalledTimes(1);
});

test('unzip should returns (None, None) for Some value', () => {
  const a = Some(1);

  const res = a.unzip()

  expect(res.length).toBe(2);
  expect(res[0].isNone()).toBe(true)
  expect(res[1].isNone()).toBe(true)
});

test('unzip should returns (Some(1), Some(2)) for Some([1,2]) value', () => {
  const a = Some<[1, 2]>([1, 2]);

  const res = a.unzip()

  expect(res.length).toBe(2);
  expect(res[0].isSome()).toBe(true);
  expect(res[1].isSome()).toBe(true);
  expect(res[0].unwrap()).toBe(1);
  expect(res[1].unwrap()).toBe(2);
});


test('unzip should returns (None, None) for Some([1,2,3]) value', () => {
  const a = Some<[1, 2, 3]>([1, 2, 3]);

  const res = a.unzip()

  expect(res.length).toBe(2);
  expect(res[0].isNone()).toBe(true)
  expect(res[1].isNone()).toBe(true)
});

test('flatten should returns same result for non-nesting value', () => {
  const a = Some(5);
  const nested = a.flatten();

  expect(nested).toBeInstanceOf(Option);
  expect(a.unwrap()).toBe(nested.unwrap());
  expect(nested.isSome()).toBe(true);
});

test('flatten should returns -1 level result for nesting value', () => {
  const a = Some(Some(5));
  const nested = a.flatten();

  expect(nested).toBeInstanceOf(Option);
  expect(a.unwrap().unwrap()).toBe(nested.unwrap());
  expect(nested.isSome()).toBe(true);
});

test('equal should returns true for Option with same boxed value', () => {
  const a = Some(5);

  const equals = a.equal(Some(5));

  expect(equals).toBeTruthy();
})

test('equal should returns false for non Option value', () => {
  const a = Some(5);

  const equals = a.equal(5);

  expect(equals).toBeFalsy();
});

test('getOrInsert should returns provided value for None self', () => {
  const a = None<number>();

  expect(a.getOrInsert(7)).toBe(7);
  expect(a.isSome()).toBe(true);
  expect(a.unwrap()).toBe(7)
});

test('getOrInsert should throws an "UdndefinedBehavior" error when call undefined for None', () => {
  const a = None<number>();

  // @ts-expect-error
  expect(() => a.getOrInsert(undefined)).toThrow(UndefinedBehaviorError);
});

test('getOrInsert should returns same value for Some self result', () => {
  const a = Some(5);

  const res = a.getOrInsert(123);
  expect(res).toBe(5);
});

test('getOrInsertWith should throws an "UndefinedBehavior" when pass not a function', () => {
  const a = None<number>();

  // @ts-expect-error
  expect(() => a.getOrInsertWith(123)).toThrow(UndefinedBehaviorError);
});

test('getOrInsertWith should throws an "UndefinedBehavior" for function which returns undefiend', () => {
  const a = None<number | undefined>();

  expect(() => a.getOrInsertWith(() => undefined)).toThrow(UndefinedBehaviorError);
});

test('getOrInsertWith should returns self value for Some', () => {
  const a = Some(6);

  const b = a.getOrInsertWith(() => 5);

  expect(b).toBe(6);
});

test('getOrInsertWith should returns value for None', () => {
  const a = None<number>();

  const b = a.getOrInsertWith(() => 5);

  expect(b).toBe(5);
});

test('or should throws an "UndefinedBehavior" error for non Option instance', () => {
  const a = None<number>();

  // @ts-expect-error
  expect(() => a.or(123)).toThrow(UndefinedBehaviorError);
});

test('or should returns self value for Some result', () => {
  const a = Some(6);

  // @ts-expect-error
  const res = a.or(123)
  expect(res.unwrap()).toBe(6);
});

test('or should returns optb for None value', () => {
  const a = None<number>();

  const res = a.or(Some(6));

  expect(res.unwrap()).toBe(6);
});

test('orElse should returns self value for Some result', () => {
  const a = Some(6);
  const res = a.orElse(() => Some(4));
  expect(res).toBeInstanceOf(Option);
  expect(res.unwrap()).toBe(6)
})

test('orElse should throws an "UndefinedBehavior" error for non function argument', () => {
  const a = None<number>();
  // @ts-expect-error
  expect(() => a.orElse(123)).toThrow(UndefinedBehaviorError);
});

test('orElse should throws an "UndefinedBehavior" error for function which returns non Option instance', () => {
  const a = None<number>();
  // @ts-expect-error
  expect(() => a.orElse(() => 5)).toThrow(UndefinedBehaviorError);
});

test('orElse should returns Option instance', () => {
  const a = None<number>();
  const res = a.orElse(() => Some(5));

  expect(res).toBeInstanceOf(Option);
  expect(res.unwrap()).toBe(5);
});

test('toString should returns [object Option]', () => {
  const a = Some(5);

  expect(Object.prototype.toString.call(a)).toBe("[object Option]");
});
