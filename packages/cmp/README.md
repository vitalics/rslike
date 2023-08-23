# Compare Package

Compare pakage - set of the classes/types for make your structures comparable and orderable.

## Installation

```bash
npm i @rslike/cmp
yarn add @rslike/cmp
pnpm add @rslike/cmp
```

## Adding global functions and classes

1. Install [package](#installation)
2. In your entry file write next:

```typescript
// your main file

// add global types in globalThis Some,None,Option, Result,Ok,Err functions
import '@rslike/cmp/globals';

// rest your file
```

## WIKI

Available by link: https://github.com/vitalics/rslike/wiki

## API

### Ordering

An Ordering is the result of a comparison between two values.

**NOTE**: Constructor is private, you cannot call this instance with new keyword.

## Properties

### Greater

Indicates that some value is more than another

### Less

Indicates that some value is less than another

### Equal

Indicates that some value is equals than another

## Static methods

### is

Checks than incoming value is instance of `Ordering`

### from

tries to transform incoming value to instance of `Ordering`

## Methods

### isEq

Returns `true` if the ordering is the [`Equal`](#equal) variant.

```ts
Ordering.Less.isEq() // false
Ordering.Equal.isEq() // true
Ordering.Greater.isEq() // false
```

### isNe

Returns `true` if the ordering is not the [`Equal`](#equal) variant.

```ts

Ordering.Less.isNe() // true
Ordering.Equal.isNe() // false
Ordering.Greater.isNe() // true
```

### isLt

Returns `true` if the ordering is the [`Less`](#less) variant.

```ts

Ordering.Less.isLt() // true
Ordering.Equal.isLt() // false
Ordering.Greater.isLt() // false
```

### isLe

Returns `true` if the ordering is either the [`Less`](#less) or [`Equal`](#equal) variant.

### isGt

Returns `true` if the ordering is the [`Greater`](#greater) variant.

```ts

Ordering.Less.isGt() // false
Ordering.Equal.isGt() // false
Ordering.Greater.isGt() // true
```

### isGe

Returns `true` if the ordering is either the [`Greater`](#greater) or [`Equal`](#equal) variant

### reverse

Reverses the `Ordering`.

- [`Less`](#less) becomes [`Greater`](#greater).
- [`Greater`](#greater) becomes [`Less`](#less).
- [`Equal`](#equal) becomes [`Equal`](#equal).

```ts
Ordering.Less.reverse() === Ordering.Greater
```

### then

Chains two orderings.

Returns `this` when it’s not `Equal`. Otherwise returns `other`.

#### Throws

[`UndefinedBehaviorError`](../std/UndefinedBehaviorError.md) if argument is not instance of `Ordering`

```ts
const result = Ordering.Equal.then(Ordering.Less);
result === Ordering.Less // true
```

### thenWith

Chains the ordering with the given function.

Returns `this` when it’s not `Equal`. Otherwise calls `f` and returns the result.

#### Throws

[`UndefinedBehaviorError`](../std/UndefinedBehaviorError.md) if function is not returns instance of `Ordering`.

### valueOf

Returns the numeric value of the `Ordering` state.

## Example

```ts

(1).compare(2) === Ordering.Less;
(2).compare(2) === Ordering.Equal;
(3).compare(2) === Ordering.Greater;
```
