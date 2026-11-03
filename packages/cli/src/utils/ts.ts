import { StandardSchemaV1 } from "@standard-schema/spec";
import type { MinimalRes } from "../resources/AbstractRes.js";

export type Writable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> =
  IsAny<T> extends true ? false : unknown extends T ? true : false;

export type MaybePromise<T> = T | Promise<T>;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type NonDeepPartialObject =
  | MinimalRes
  | Date
  | RegExp
  | Map<unknown, unknown>
  | ReadonlyMap<unknown, unknown>
  | WeakMap<object, unknown>
  | Set<unknown>
  | ReadonlySet<unknown>
  | WeakSet<object>
  | Promise<unknown>
  | ((...args: unknown[]) => unknown);

export type DeepPartial<T> =
  IsUnknown<T> extends true
    ? unknown
    : T extends Primitive
      ? T
      : T extends NonDeepPartialObject
        ? T
        : T extends ReadonlyArray<infer U>
          ? ReadonlyArray<DeepPartial<U>>
          : T extends object
            ? {
                [K in keyof T]?: DeepPartial<T[K]>;
              }
            : Partial<T>;

export type InferInput<S extends StandardSchemaV1> = NonNullable<
  S["~standard"]["types"]
>["input"];

export type InferOutput<S extends StandardSchemaV1> = NonNullable<
  S["~standard"]["types"]
>["output"];
