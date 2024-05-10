import type { MinimalRes } from "../resources/AbstractRes.js";
import type { Builtin, IsTuple } from "ts-essentials";

type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsAny<T> extends true
  ? false
  : unknown extends T
  ? true
  : false;

export type DeepPartial<T, E = Builtin> = T extends MinimalRes
  ? T
  : T extends E
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepPartial<K, E>, DeepPartial<V, E>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepPartial<K, E>, DeepPartial<V, E>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepPartial<K, E>, DeepPartial<V, E>>
  : T extends Set<infer U>
  ? Set<DeepPartial<U, E>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepPartial<U, E>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepPartial<U, E>>
  : T extends Array<infer U>
  ? T extends IsTuple<T>
    ? {
        [K in keyof T]?: DeepPartial<T[K], E>;
      }
    : Array<DeepPartial<U, E>>
  : T extends Promise<infer U>
  ? Promise<DeepPartial<U, E>>
  : T extends {}
  ? {
      [K in keyof T]?: DeepPartial<T[K], E>;
    }
  : IsUnknown<T> extends true
  ? unknown
  : Partial<T>;
