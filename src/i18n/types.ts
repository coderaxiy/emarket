import type { en } from './locales/en';

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Shape every locale must implement — `en` with string literals widened to `string`. */
export type Dictionary = Widen<typeof en>;

type Join<P extends string, K extends string> = `${P}.${K}`;

/** Every real key, e.g. `"header.signIn"`. `t()` accepts nothing else. */
export type TranslationKey = {
  [N in keyof Dictionary & string]: Join<N, keyof Dictionary[N] & string>;
}[keyof Dictionary & string];

export type TranslationParams = Record<string, string | number>;
