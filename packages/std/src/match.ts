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

import { UndefinedBehaviorError } from './errors.ts';
import { Option, } from './option.ts';
import { Result } from './result.ts';
import { Fn } from './types.ts';

type OkCb<I, R> = I extends Option<infer Some> ? Fn<R, [value: Some]> : I extends Result<infer Ok, unknown> ? Fn<R, [value: Ok]> : I extends boolean ? Fn<R, [true]> : never
type ErrCb<I, R> = I extends Option<unknown> ? Fn<R> : I extends Result<unknown, infer E> ? Fn<R, [error: E]> : I extends boolean ? Fn<R, [false]> : never

/**
 * matches the `boolean` or `Option` or `Result` and calls callback functions.
 * 
 * 1 callback function will be executed for `true` or `Ok` or `Some` result.
 * 
 * 2 callback function will be executed for `false` or `Err` or `None` result.
 *
 * If incoming arguments is not `Option` or `Result` or callback functions is not a functions then it throws an `UndefinedBehavior` error.
 * 
 * @see {@link https://github.com/vitalics/rslike/wiki/Match Wiki}
 * @example
 * const resFromBackend = Bind(async () => return await (await fetch('<args>')).json())
 * 
 * const json = match(resFromBackend, (res) => {
 *    return match(res, (unwrapped) => {
 *      console.log('JSON is:', unwrapped)
 *    }, () => {
 *      console.log('JSON is None')
 *    })
 * }, (e) => {
 *  console.log('Error:', e)
 * })
 * console.log(json) // YOUR JSON data from backend.
 * 
 * @export
 * @template R
 * @template I
 * @param {I} value `Option` or `Result` instance.
 * @param {OkCb<I, R>} okOrSomeCb calls when result is `Ok` or `Some`.
 * @param {ErrCb<I, R>} errOrNoneCb calls when result is `Err` or `None`.
 * @return {*}  {R}
 */
export function match<R, I extends Option<unknown> | Result<unknown, unknown> | boolean>(value: I, okOrSomeCb: OkCb<I, R>, errOrNoneCb: ErrCb<I, R>): R {
  if (typeof okOrSomeCb !== 'function') {
    throw new UndefinedBehaviorError(`match function expects to provide a function.`, { cause: { value: okOrSomeCb, type: typeof okOrSomeCb } })
  }
  if (typeof errOrNoneCb !== 'function') {
    throw new UndefinedBehaviorError(`match function expects to provide a function.`, { cause: { value: okOrSomeCb, type: typeof okOrSomeCb } })
  }
  if (typeof value === 'boolean') {
    if (value === true) {
      return okOrSomeCb(true);
    }
    return errOrNoneCb(false);
  } else if (value instanceof Option) {
    if (value.isSome()) {
      return (okOrSomeCb as OkCb<Option<unknown>, R>)(value.unwrap());
    }
    return errOrNoneCb(undefined as never);
  } else if (value instanceof Result) {
    if (value.isOk()) {
      return (okOrSomeCb as OkCb<Result<unknown, unknown>, R>)(value.unwrap());
    }
    return (errOrNoneCb as OkCb<Result<unknown, unknown>, R>)(value.unwrapErr());
  }
  throw new UndefinedBehaviorError(`only boolean type, Option or Result instance are allowed`, { cause: { value, type: typeof value, ctor: (value as object).constructor?.name } })
}
