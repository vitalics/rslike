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

import { Errors } from './errors';
import { Option, } from './option';
import { Result } from './result';


type OkCb<I, R> = I extends Option<infer Some> ? (value: Some) => R : I extends Result<infer Ok, unknown> ? (value: Ok) => R : never
type ErrCb<I, R> = I extends Option<unknown> ? () => R : I extends Result<unknown, infer E> ? (error: E) => R : never

/**
 * matches the `Option` or `Result` and calls callback functions.
 * 
 * 1 callback function will be executed for `Ok` or `Some` result.
 * 
 * 2 callback function will be executed for `Err` or `None` result.
 *
 * If incoming arguments is not `Option` or `Result` or callback functions is not a functions then it throws an `UndefinedBehavior` error.
 * 
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
 * 
 * @export
 * @template R
 * @template I
 * @param {I} optOrRes
 * @param {OkCb<I, R>} okOrSomeCb calls when result is `Ok` or `Some`.
 * @param {ErrCb<I, R>} errOrNoneCb calls when result is `Err` or `None`.
 * @return {*}  {R}
 */
export function match<R, I extends Option<unknown> | Result<unknown, unknown>>(optOrRes: I, okOrSomeCb: OkCb<I, R>, errOrNoneCb: ErrCb<I, R>): R {
  if (!(optOrRes instanceof Option) && !(optOrRes instanceof Result)) {
    throw new Errors.UndefinedBehavior('only instance of Option or Result are allowed for match function', { cause: { value: optOrRes } });
  }
  if (typeof okOrSomeCb !== 'function') {
    throw new Errors.UndefinedBehavior(`match function expects to provide a function.`, { cause: { value: okOrSomeCb, type: typeof okOrSomeCb } })
  }
  if (typeof errOrNoneCb !== 'function') {
    throw new Errors.UndefinedBehavior(`match function expects to provide a function.`, { cause: { value: okOrSomeCb, type: typeof okOrSomeCb } })
  }
  if (optOrRes instanceof Option) {
    if (optOrRes.isSome()) {
      return okOrSomeCb(optOrRes.unwrap());
    }
    return errOrNoneCb(undefined as never);
  }
  if (optOrRes.isOk()) {
    return okOrSomeCb(optOrRes.unwrap());
  }
  return errOrNoneCb(optOrRes.unwrapErr());
}
