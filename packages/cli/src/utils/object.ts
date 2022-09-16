import _isPlainObject from "lodash.isplainobject";
import mergeWith from "lodash.mergewith";

export const isPlainObject: (
  input: unknown
) => input is Record<string, unknown> = _isPlainObject as any;

export function sort<T extends Record<string, unknown>>(object: T) {
  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      (result as any)[key] = object[key];
      return result;
    }, {} as T);
}

export function merge<TObject, TSource>(object: TObject, source: TSource) {
  return mergeWith<TObject, TSource>(object, source, (objValue, srcValue) => {
    if (Array.isArray(objValue)) {
      return srcValue;
    }
  });
}

export type JSONClass = { toString(): string; toJSON(): string };
export type Callable<T, TArgs extends any[] = []> = T | ((...args: TArgs) => T);

export function resolve<T>(data: Callable<T>): T {
  if (typeof data === "function") data = (data as () => T)();
  return data;
}

export function stringify(data: Callable<unknown>) {
  data = resolve(data);
  return data?.toString() ?? "";
}

export type Constructor<T> = {
  new (...args: any[]): T;
  isInstance?: (subject: unknown) => boolean;
};

export function isInstanceOf<T>(
  subject: unknown,
  constructor: Constructor<T>
): subject is T {
  return (
    subject instanceof constructor ||
    (typeof constructor["isInstance"] === "function" &&
      constructor.isInstance(subject))
  );
}
