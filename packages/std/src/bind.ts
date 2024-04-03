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

/* eslint-disable @typescript-eslint/no-unused-vars */

import { Async } from './async.ts';
import { match } from './match.ts';
import { UndefinedBehaviorError } from './utils.ts';
import { Option, Some } from './option.ts'
import { Result, Err, Ok } from './result.ts';

/**
 * Function decorator. Combines `Option` and `Result` classes.
 *
 * Binds function and return a new callable function.
 *
 * Result of this function will be mapped into `Result<Option<T>,E>`.
 *
 * Function `result` will be mapped into `Ok(Some(result))`.
 *
 * `undefined` funtion result will mapped into `Ok(None())`.
 *
 * @see {@link https://github.com/vitalics/rslike/wiki/Bind Wiki}
 * @see {@link Async} if you would like to resolve `Promise` or value, not a whole function.
 * @see {@link match} if you would like to unwrap `Result` or `Option` successfully.
 * @example
 * const fn = (a: number) => a + 2;
 * const newFn = Bind(fn);
 *
 * const res = newFn(1);
 * res.unwrap().unwrap() // 3
 * newFn(10).unwrap().unwrap() // 12
 *
 * const thrower = () => {throw new Error('shit happens :)')};
 * const func = Bind(thrower);
 * func().isErr() // true
 * const err = func().unwrapErr();
 * console.log(err) // {message: 'shit happens :)'}
 * err instanceof Error // true
 *
 * // async example
 * const asyncFn = () => Promise.resolve(123);
 * const fn = Bind(asyncFn);
 *
 * const r = await fn();
 *
 * r.isOk() // true
 * r.unwrap() // 123
 * @export
 * @template T Function result
 * @template E Function error result
 * @template A Function arguments array
 * @template This Function This binded argument
 * @param {(this: This, ...args: A) => T} fn
 * @param {(This | undefined)} [thisArg=undefined]
 * @return {*}  {(...args: A) => Result<Option<T>, E>}
 */
export function Bind<T, E = unknown, A extends unknown[] = [], This = void>(fn: (this: This, ...args: A) => T, thisArg: This | undefined = undefined): (...args: A) => T extends Promise<infer P> ? Promise<Result<Option<P>, E>> : Result<Option<T>, E> {
  if (typeof fn !== 'function') {
    throw new UndefinedBehaviorError(`"Bind" function expect to pass function as 1 argument`, { cause: { value: fn, type: typeof fn } })
  }
  return function (...args: A) {
    try {
      const result = fn.call(thisArg as This, ...args);
      if (result instanceof Promise) {
        return result.then(v => Ok(Some(v))).catch(e => Err(e));
      }
      // if result === undefined. Some will be automatically transformed into None
      return Ok(Some(result));
    } catch (e) {
      return Err(e as E);
    }
  } as never;
}

export default Bind;
