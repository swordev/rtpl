import { AbstractRes } from "../../resources/AbstractRes.js";
import type { DelayedValue } from "../../resources/DelayedValue.js";
import { DirRes } from "../../resources/DirRes.js";
import { isPlainObject, JSONClass } from "../object.js";
import { basename } from "path";
import { join } from "path/posix";

export type Resources = Record<string, unknown>;
export type StringifyClass = JSONClass | AbstractRes | DelayedValue;
type Constructor<T> = new (...args: any[]) => T;
type Guard<T> = (val: unknown) => val is T;

export type FilterInput<T = any> = {
  name?: string | { startsWith: string };
  test?: Guard<T> | ((val: unknown) => boolean);
  instanceOf?: Constructor<T> | { data: Constructor<T> };
};

export type FilterResult<F extends FilterInput> =
  F["instanceOf"] extends Constructor<infer R>
    ? R
    : F["instanceOf"] extends { data: Constructor<infer D> }
      ? AbstractRes<D>
      : F["test"] extends Guard<infer T>
        ? T
        : AbstractRes;

type Found = { ref: string; resource: any; resources: Resources };

export type ResourceSystem = ReturnType<typeof createResourceSystem>;

function matches(ref: string, res: unknown, input: FilterInput) {
  const { instanceOf, name, test } = input;
  if (typeof instanceOf === "function") {
    if (!(res instanceof instanceOf)) return false;
  } else if (instanceOf) {
    if (!(res instanceof AbstractRes && res.data instanceof instanceOf.data))
      return false;
  }
  if (name) {
    const base = basename(ref);
    if (
      typeof name === "string"
        ? name !== base
        : !base.startsWith(name.startsWith)
    )
      return false;
  }
  return !test || test(res);
}

/**
 * @returns `false` when the iteration was stopped
 */
function walk(
  resources: Resources,
  input: FilterInput,
  onFound: (data: Found) => boolean | void,
  exclude: Set<unknown>,
): boolean {
  // Resources already present at an upper level (e.g. the flat map built by
  // `createTplResources`) must not be visited twice through their `DirRes`.
  const childExclude = new Set([...exclude, ...Object.values(resources)]);

  for (const ref in resources) {
    const res = resources[ref];
    if (exclude.has(res)) continue;
    if (isPlainObject(res)) {
      if (!walk(res, input, onFound, childExclude)) return false;
      continue;
    }
    if (res instanceof DirRes && isPlainObject(res.data)) {
      if (!walk(res.data, input, onFound, childExclude)) return false;
    }
    if (!matches(ref, res, input)) continue;
    if (onFound({ ref, resource: res, resources }) === false) return false;
  }
  return true;
}

export function createResourceSystem(resources: Resources) {
  function forEach<F extends FilterInput>(
    input: F,
    onFound: (data: {
      ref: string;
      resource: FilterResult<F>;
      resources: Resources;
    }) => boolean | void,
  ) {
    walk(resources, input, onFound, new Set());
  }

  function filter<F extends FilterInput>(input: F) {
    const result: FilterResult<F>[] = [];
    forEach(input, ({ resource }) => {
      result.push(resource);
    });
    return result;
  }

  function find<F extends FilterInput>(input: F): FilterResult<F> | undefined {
    return filter(input)[0];
  }

  function findOrFail<F extends FilterInput>(input: F): FilterResult<F> {
    const resource = find(input);
    if (!resource) throw new Error("Resource not found");
    return resource;
  }

  function extract<F extends FilterInput>(input: F) {
    const extracted: Record<string, FilterResult<F>> = {};
    forEach(input, ({ ref, resource, resources }) => {
      extracted[ref] = resource;
      delete resources[ref];
    });
    return extracted;
  }

  function remove<F extends FilterInput>(
    input: F,
    map: true,
  ): Record<string, FilterResult<F>>;
  function remove<F extends FilterInput>(input: F): FilterResult<F>[];
  function remove(input: FilterInput, map?: boolean): any {
    const extracted = extract(input);
    return map ? extracted : Object.values(extracted);
  }

  function move<F extends FilterInput>(input: F, target: string) {
    const extracted = extract(input);
    for (const path in extracted)
      resources[join(target, basename(path))] = extracted[path];
    return Object.values(extracted);
  }

  return { resources, forEach, filter, find, findOrFail, remove, move };
}
