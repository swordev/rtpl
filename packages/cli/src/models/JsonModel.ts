import { Callable, isPlainObject, resolve } from "../utils/object";
import { AbstractModel, TypeEnum } from "./AbstractModel";

export type JSONPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONObject
  | JSONArray;
export type JSONValue = Callable<JSONPrimitive | { toString(): string }>;
export type JSONObject = { [member: string]: JSONValue };
export type JSONArray = JSONValue[];

export function isPrimitiveValue(value: unknown): value is JSONPrimitive {
  const t = typeof value;
  return (
    value === null ||
    value === undefined ||
    t === "string" ||
    t === "number" ||
    t === "boolean" ||
    Array.isArray(value) ||
    isPlainObject(value)
  );
}

export const toString = (value: JSONValue): string => {
  return JSON.stringify(
    value,
    (key, value) => {
      value = resolve(value);
      if (isPrimitiveValue(value)) {
        return value;
      } else if (typeof value === "function") {
        return JSON.parse(toString(value));
      } else if (value && typeof value["toJSON"] === "function") {
        return value.toJSON();
      } else if (value && typeof value["toString"] === "function") {
        return value.toString();
      } else {
        return value;
      }
    },
    2
  );
};

export class JsonModel<
  T extends JSONValue | undefined,
  TConf extends Record<string, unknown> = {}
> extends AbstractModel<T, TConf> {
  protected static _tplModelType = TypeEnum.Json;
  toString() {
    return toString(this.spec);
  }
  toJSON() {
    return JSON.parse(this.toString());
  }
}
