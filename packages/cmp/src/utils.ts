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

import type { Eq, Ord, PartialEq, PartialOrd } from './types.ts';

export function isOrd(arg: unknown): arg is Ord {
  if (
    isPartialOrd(arg) &&
    'compare' in arg &&
    typeof arg.compare === 'function' &&
    'max' in arg &&
    typeof arg.max === 'function' &&
    'min' in arg &&
    typeof arg.min === 'function' &&
    'clamp' in arg &&
    typeof arg.clamp === 'function'
  ) {
    return true;
  }
  return false;
}

export function isPartialOrd(arg: unknown): arg is PartialOrd {
  if (
    isPartialEquals(arg) &&
    'partialCompare' in arg &&
    typeof arg.partialCompare === 'function' &&
    'lt' in arg &&
    typeof arg.lt === 'function' &&
    'le' in arg &&
    typeof arg.le === 'function' &&
    'gt' in arg &&
    typeof arg.gt === 'function' &&
    'ge' in arg &&
    typeof arg.ge === 'function'
  ) {
    return true;
  }
  return false;
}

export function isEquals(arg: unknown): arg is Eq {
  if (
    isPartialEquals(arg) &&
    'equals' in arg &&
    typeof arg.equals === 'function'
  ) {
    return true;
  }
  return false;
}

export function isPartialEquals(arg: unknown): arg is PartialEq {
  if (
    typeof arg === 'object' &&
    arg !== null &&
    'partialEquals' in arg &&
    typeof arg.partialEquals === 'function' &&
    'notEquals' in arg &&
    typeof arg.notEquals === 'function'
  ) {
    return true;
  }
  return false;
}
