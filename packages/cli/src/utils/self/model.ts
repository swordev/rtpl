import { AbstractModel } from "../..";
import { DelayedValue } from "../../models/AbstractModel";
import { DirModel } from "../../models/DirModel";
import { Constructor, isInstanceOf, isPlainObject, JSONClass } from "../object";
import { Models } from "./config";
import { basename } from "path";

export type StringifyClass = JSONClass | AbstractModel | DelayedValue;

export type ExtractFilter = {
  name?: string | { startsWith: string };
  test?: (model: AbstractModel) => boolean;
};

export type ExtractModelFilter<TModel> = ExtractFilter & {
  instanceOf?: { new (...args: any[]): TModel };
};

export type ExtractSpecFilter<TSpec> = ExtractFilter & {
  instanceSpecOf?: { new (...args: any[]): TSpec };
};

export function forEach<T>(
  models: Models,
  filter: ExtractModelFilter<T> | ExtractSpecFilter<T>,
  onFound: (data: { ref: string; model: T; models: Models }) => boolean | void
) {
  const instanceOf: Constructor<T> | undefined =
    "instanceOf" in filter && typeof filter.instanceOf === "function"
      ? filter.instanceOf
      : undefined;
  const instanceSpecOf: Constructor<T> | undefined =
    "instanceSpecOf" in filter && typeof filter.instanceSpecOf === "function"
      ? filter.instanceSpecOf
      : undefined;

  for (const ref in models) {
    const model = models[ref] as AbstractModel;
    if (isPlainObject(model)) {
      forEach(model as Record<string, AbstractModel>, filter, onFound);
      continue;
    } else if (model instanceof DirModel && isPlainObject(model.spec)) {
      if (!model.resolved) forEach(model.spec, filter, onFound);
    }
    if (instanceOf && !isInstanceOf(model, instanceOf)) continue;
    if (instanceSpecOf && !isInstanceOf(model.spec, instanceSpecOf)) continue;
    if (filter.name) {
      const name = basename(ref);
      if (typeof filter.name === "string") {
        if (filter.name !== name) continue;
      } else if (!name.startsWith(filter.name.startsWith)) {
        continue;
      }
    }
    if (filter.test && !filter.test(model)) continue;
    if (onFound({ ref, model: model as any, models }) === false) return;
  }
}

export function find<T>(models: Models, filter: ExtractModelFilter<T>): T[];
export function find<T>(
  models: Models,
  filter: ExtractSpecFilter<T>
): AbstractModel<T>[];
export function find<T>(
  models: Models,
  filter: ExtractModelFilter<T> | ExtractSpecFilter<T>
) {
  const result: AbstractModel[] = [];
  forEach(models, filter, ({ model }) => {
    result.push(model as any);
  });
  return result;
}

export function extractMap<T>(
  models: Models,
  filter: ExtractModelFilter<T>
): Record<string, T>;
export function extractMap<T>(
  models: Models,
  filter: ExtractSpecFilter<T>
): Record<string, AbstractModel<T>>;
export function extractMap<T>(models: Models, filter: ExtractModelFilter<T>) {
  const extracted: Record<string, any> = {};
  forEach(models, filter, ({ ref, model, models }) => {
    extracted[ref] = model as any;
    delete models[ref];
  });
  return extracted;
}

export function extract<T>(models: Models, filter: ExtractModelFilter<T>): T[];
export function extract<T>(
  models: Models,
  filter: ExtractSpecFilter<T>
): AbstractModel<T>[];
export function extract<T>(
  models: Models,
  filter: ExtractModelFilter<T> | ExtractSpecFilter<T>
): T[] | AbstractModel<T>[] {
  return Object.values(extractMap(models, filter)) as any;
}
