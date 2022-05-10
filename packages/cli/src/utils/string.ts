import set from "lodash.set";
import { parse } from "yaml";

export function parseStringListValue(value: unknown) {
  if (typeof value !== "string" || !value.length) return undefined;
  return value.split(",");
}

export function parseSet(input: string, values: Record<string, unknown>) {
  const parts = input.split("=");
  const key = parts[0].trim();
  const value = parts.slice(1).join("=").trim();
  const keys = key.split(".");
  set(values, keys, parse(value));
  return values;
}

export function makeFilter(pattern: string) {
  return [pattern, ...(pattern === "**" ? [] : [`${pattern}/**`])];
}

export function makeRef(name: string | number, parentRef: string | null) {
  return parentRef ? `${parentRef}/${name.toString()}` : name.toString();
}

export function cameCase(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}
