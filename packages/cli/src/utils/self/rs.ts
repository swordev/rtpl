import { AbstractRes } from "../..";
import { DelayedValue } from "../../resources/DelayedValue";
import { DirRes } from "../../resources/DirRes";
import { Constructor, isInstanceOf, isPlainObject, JSONClass } from "../object";
import { Resources } from "./config";
import { basename } from "path";
import { join } from "path/posix";

export type StringifyClass = JSONClass | AbstractRes | DelayedValue;
type FilteConstructor<T> = { new (...args: any[]): T };
type Guard<T> = (val: unknown) => val is T;
type UnsafeGuard = (val: unknown) => boolean;

export type Filter<T = any> = {
  name?: string | { startsWith: string };
  test?: Guard<T> | UnsafeGuard;
  instanceOf?: FilteConstructor<T> | { data: FilteConstructor<T> };
};

export type FilterResult<F extends Filter> =
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
    find,
    findOne,
    findOneOrFail,
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

export function forEach<T, F extends Filter<T>>(
  this: Resources,
  filter: F,
  onFound: (data: {
    ref: string;
    resource: T;
    resources: Resources;
  }) => boolean | void,
) {
  const resources = this;
  const instanceOf: Constructor<T> | undefined =
    "instanceOf" in filter && typeof filter.instanceOf === "function"
      ? filter.instanceOf
      : undefined;
  const instanceDataOf: Constructor<T> | undefined =
    "instanceOf" in filter && filter.instanceOf && "data" in filter.instanceOf
      ? filter.instanceOf.data
      : undefined;

  for (const ref in resources) {
    const res = resources[ref] as AbstractRes;
    if (isPlainObject(res)) {
      forEach.bind(res)(filter, onFound as any);
      continue;
    } else if (res instanceof DirRes && isPlainObject(res.data)) {
      if (!res.resolved) forEach.bind(res.data)(filter, onFound as any);
    }
    if (instanceOf && !isInstanceOf(res, instanceOf)) continue;
    if (instanceDataOf && !isInstanceOf(res.data, instanceDataOf)) continue;
    if (filter.name) {
      const name = basename(ref);
      if (typeof filter.name === "string") {
        if (filter.name !== name) continue;
      } else if (!name.startsWith(filter.name.startsWith)) {
        continue;
      }
    }
    if (filter.test && !filter.test(res)) continue;
    if (onFound({ ref, resource: res as any, resources: resources }) === false)
      return;
  }
}

export function find<T, F extends Filter<T>>(this: Resources, filter: F) {
  const result: FilterResult<F>[] = [];
  forEach.bind(this)(filter, ({ resource }) => {
    result.push(resource as any);
  });
  return result;
}

export function findOne<T, F extends Filter<T>>(
  this: Resources,
  filter: F,
): FilterResult<F> | undefined {
  return find.bind(this)(filter)[0] as any;
}

export function findOneOrFail<T, F extends Filter<T>>(
  this: Resources,
  filter: F,
): FilterResult<F> {
  const resource = find.bind(this)(filter)[0] as any;
  if (!resource) throw new Error("Resource not found");
  return resource;
}

export function extractMap<T, F extends Filter<T>>(this: Resources, filter: F) {
  const extracted: Record<string, FilterResult<F>> = {};
  forEach.bind(this)(filter, ({ ref, resource, resources }) => {
    extracted[ref] = resource as any;
    delete resources[ref];
  });
  return extracted;
}

export function remove<T, F extends Filter<T>>(
  this: Resources,
  filter: F,
): FilterResult<F>[] {
  return Object.values(extractMap.bind(this)(filter)) as any;
}

export function move<T, F extends Filter<T>>(
  this: Resources,
  filter: F,
  target: string,
) {
  const extracted = extractMap.bind(this)(filter);

  for (const path in extracted) {
    const base = basename(path);
    const newPath = join(target, base);
    this[newPath] = extracted[path];
  }
  return Object.values(extracted);
}

export function moveToRoot<T, F extends Filter<T>>(this: Resources, filter: F) {
  const extracted = extractMap.bind(this)(filter);

  for (const path in extracted) {
    const base = basename(path);
    const newPath = join("../", base);
    this[newPath] = extracted[path];
  }
  return Object.values(extracted);
}
