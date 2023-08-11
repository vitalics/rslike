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
import { Bind } from './bind.ts';
import { match } from './match.ts'
import { Result, Ok, Err } from './result.ts';
import { Option, Some } from './option.ts';


/**
 * Tries to resolve async value into `Result<Option<T>,E>`.
 * 
 * **NOTE:** Returned promise will never calls `catch` function, since `Promise` always resolved as success, whenever error or not.
 * 
 * `Promise` result will be mapped into `Ok(Some(result))`
 * 
 * `undefined` will be mapped into `Ok(None())`
 * 
 * @see {@link Bind} - If you want to bind whole (`async` or not) function, not a `Promise`.
 * @see {@link match} if you would like to unwrap `Result` or `Option` successfully.
 * @example
 * function unsafePromise(arg: number){
 *  return new Promise((res, rej) => {
 *    if(res % 2 === 0) res(arg);
 *    rej('Argument should be odd');
 *  })
 * }
 * 
 * const result = await Async(unsafePromise(2))
 * result.unwrap().unwrap() // 2
 * const resultErr = await Async(unsafePromise(3))
 * resule.unwrapErr() // Argument should be odd
 * 
 * await Async(undefined) // Ok(None())
 * await Async(Promise.resolve(undefiend)) // Ok(None())
 * await Async(Promise.resolve(123)) // Ok(Some(123))
 * 
 * 
 * @export
 * @template T
 * @template E
 * @param {(T | PromiseLike<T>)} value `Promise` object
 * @return {*}  {Promise<Result<T, E>>}
 */
export async function Async<T, E = unknown>(value?: T | PromiseLike<T>): Promise<Result<Option<T>, E>> {
  try {
    return Ok(Some(await value));
  } catch (e) {
    return Err<Option<T>, E>(e as E);
  }
}