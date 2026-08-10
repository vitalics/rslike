import { type Option, Some, None } from "@rslike/std";
import { Iter, ParIter, type IntoIterLike } from "@rslike/iter";

import { type IterSource, toIterable } from "./iter-source";

export class RSLikeMap<K, V>
  implements
    Omit<Map<K, V>, "get" | "set" | "entries" | "keys" | "values">,
    IntoIterLike<[K, V]>
{
  _internalMap: Map<K, V>;
  /**
   * @param source - Optional source of `[key, value]` pairs: any iterable
   *   or a pull-based `IterLike` (`next(): Option<[K, V]>`).
   */
  constructor(source?: IterSource<readonly [K, V]> | null) {
    if (source) {
      this._internalMap = new Map(toIterable(source));
    } else {
      this._internalMap = new Map();
    }
  }

  clear(): void {
    this._internalMap.clear();
  }
  delete(key: K): boolean {
    return this._internalMap.delete(key);
  }
  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any
  ): void {
    this._internalMap.forEach(callbackfn, thisArg);
  }

  get(key: K): Option<V> {
    return Some(this._internalMap.get(key) as V) as never;
  }
  has(key: K): boolean {
    return this._internalMap.has(key);
  }
  /** Like Rust's `HashMap::insert` — returns `Some(old)` if key existed, `None` if new. */
  set(key: K, value: V): Option<V> {
    if (this._internalMap.has(key)) {
      const old = this._internalMap.get(key) as V;
      this._internalMap.set(key, value);
      return Some(old);
    }
    this._internalMap.set(key, value);
    return None();
  }
  get size(): number {
    return this._internalMap.size;
  }
  get length(): number {
    return this._internalMap.size;
  }
  entries(): RSLikeMapIterator<[K, V]> {
    return new RSLikeMapIterator(this._internalMap.entries());
  }
  keys(): RSLikeMapIterator<K> {
    return new RSLikeMapIterator(this._internalMap.keys());
  }
  values(): RSLikeMapIterator<V> {
    return new RSLikeMapIterator(this._internalMap.values());
  }
  /** Returns an `Iter<[K, V]>` over the map's entries. */
  iter(): Iter<[K, V]> {
    return new Iter(this._internalMap.entries());
  }
  /** Returns a `ParIter<[K, V]>` for Rayon-style concurrent async operations. */
  parIter(): ParIter<[K, V]> {
    return new ParIter(this._internalMap.entries());
  }
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this._internalMap[Symbol.iterator]();
  }
  get [Symbol.toStringTag]() {
    return this._internalMap[Symbol.toStringTag];
  }
}

export class RSLikeMapIterator<T> extends Iter<T> {
  constructor(iter: Iterator<T>) {
    super(() => iter);
  }

  next(): Option<T> {
    const result = super.next();
    return result;
  }

  [Symbol.iterator](): Iterator<T> {
    return super[Symbol.iterator]();
  }
}
