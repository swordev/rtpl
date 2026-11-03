export function isPlainObject(
  input: unknown,
): input is Record<string, unknown> {
  if (Object.prototype.toString.call(input) !== "[object Object]") return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === null || prototype === Object.prototype;
}

export function sort<T extends Record<string, unknown>>(object: T) {
  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      (result as any)[key] = object[key];
      return result;
    }, {} as T);
}

export function merge<TObject, TSource>(object: TObject, source: TSource) {
  if (!isPlainObject(object) || !isPlainObject(source))
    return object as TObject & TSource;

  return mergeRecords(
    object as Record<string, unknown>,
    source as Record<string, unknown>,
  ) as TObject & TSource;
}

function mergeRecords(
  object: Record<string, unknown>,
  source: Record<string, unknown>,
) {
  for (const [key, sourceValue] of Object.entries(source)) {
    const objectValue = object[key];

    if (Array.isArray(objectValue)) {
      object[key] = sourceValue;
      continue;
    }

    if (isPlainObject(objectValue) && isPlainObject(sourceValue)) {
      object[key] = mergeRecords(objectValue, sourceValue);
      continue;
    }

    object[key] = cloneMergeValue(sourceValue);
  }

  return object;
}

function cloneMergeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => cloneMergeValue(item));
  if (isPlainObject(value)) return mergeRecords({}, value);
  return value;
}

export function clone<T>(object: T) {
  return merge({}, object);
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
  constructor: Constructor<T>,
): subject is T {
  return (
    subject instanceof constructor ||
    (typeof constructor["isInstance"] === "function" &&
      constructor.isInstance(subject))
  );
}
