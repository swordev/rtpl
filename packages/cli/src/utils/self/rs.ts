import { AbstractRes } from "../../index.js";
import { DelayedValue } from "../../resources/DelayedValue.js";
import { DirRes } from "../../resources/DirRes.js";
import {
  Constructor,
  isInstanceOf,
  isPlainObject,
  JSONClass,
} from "../object.js";
import { Resources } from "./tpl.js";
import { basename } from "path";
import { join } from "path/posix";

export type StringifyClass = JSONClass | AbstractRes | DelayedValue;
type FilteConstructor<T> = { new (...args: any[]): T };
type Guard<T> = (val: unknown) => val is T;
type UnsafeGuard = (val: unknown) => boolean;

export type FilterInput<T = any> = {
  name?: string | { startsWith: string };
  test?: Guard<T> | UnsafeGuard;
  symbol?: symbol;
  instanceOf?: FilteConstructor<T> | { data: FilteConstructor<T> };
};

export type FilterResult<F extends FilterInput> =
  F["instanceOf"] extends FilteConstructor<infer R>
    ? R
    : F["instanceOf"] extends { data: FilteConstructor<infer D> }
    ? AbstractRes<D>
    : F["test"] extends Guard<infer T>
    ? T
    : AbstractRes;

export type ResourceSystem = ReturnType<typeof createResourceSystem>;

export function createResourceSystem(resources: Resources) {
  const helpers = {
    forEach,
    filter,
    find,
    findOrFail,
    remove,
    extractMap,
    move,
    moveToRoot,
  };
  for (const name in helpers) {
    const $helpers = helpers as any;
    $helpers[name] = $helpers[name].bind(resources);
  }
  return { resources, ...helpers };
}

export function forEach<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
  onFound: (data: {
    ref: string;
    resource: T;
    resources: Resources;
  }) => boolean | void,
) {
  const instanceOf: Constructor<T> | undefined =
    "instanceOf" in input && typeof input.instanceOf === "function"
      ? input.instanceOf
      : undefined;
  const instanceDataOf: Constructor<T> | undefined =
    "instanceOf" in input && input.instanceOf && "data" in input.instanceOf
      ? input.instanceOf.data
      : undefined;

  for (const ref in this) {
    const res = this[ref] as AbstractRes;
    if (isPlainObject(res)) {
      forEach.bind(res)(input, onFound as any);
      continue;
    } else if (res instanceof DirRes && isPlainObject(res.data)) {
      if (!res.resolved) forEach.bind(res.data)(input, onFound as any);
    }
    if (input.symbol && res.symbol !== input.symbol) continue;
    if (instanceOf && !isInstanceOf(res, instanceOf)) continue;
    if (instanceDataOf && !isInstanceOf(res.data, instanceDataOf)) continue;
    if (input.name) {
      const name = basename(ref);
      if (typeof input.name === "string") {
        if (input.name !== name) continue;
      } else if (!name.startsWith(input.name.startsWith)) {
        continue;
      }
    }
    if (input.test && !input.test(res)) continue;
    if (onFound({ ref, resource: res as any, resources: this }) === false)
      return;
  }
}

export function filter<T, F extends FilterInput<T>>(this: Resources, input: F) {
  const result: FilterResult<F>[] = [];
  forEach.bind(this)(input, ({ resource }) => {
    result.push(resource as any);
  });
  return result;
}

export function find<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
): FilterResult<F> | undefined {
  return filter.bind(this)(input)[0] as any;
}

export function findOrFail<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
): FilterResult<F> {
  const resource = filter.bind(this)(input)[0] as any;
  if (!resource) throw new Error("Resource not found");
  return resource;
}

export function extractMap<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
) {
  const extracted: Record<string, FilterResult<F>> = {};
  forEach.bind(this)(input, ({ ref, resource, resources }) => {
    extracted[ref] = resource as any;
    delete resources[ref];
  });
  return extracted;
}

export function remove<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
): FilterResult<F>[] {
  return Object.values(extractMap.bind(this)(input)) as any;
}

export function move<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
  target: string,
) {
  const extracted = extractMap.bind(this)(input);

  for (const path in extracted) {
    const base = basename(path);
    const newPath = join(target, base);
    this[newPath] = extracted[path];
  }
  return Object.values(extracted);
}

export function moveToRoot<T, F extends FilterInput<T>>(
  this: Resources,
  input: F,
) {
  const extracted = extractMap.bind(this)(input);

  for (const path in extracted) {
    const base = basename(path);
    const newPath = join("../", base);
    this[newPath] = extracted[path];
  }
  return Object.values(extracted);
}
