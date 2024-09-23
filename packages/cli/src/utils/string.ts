export function parseStringListValue(value: unknown) {
  if (typeof value !== "string" || !value.length) return undefined;
  return value.split(",");
}

export function makeFilter(pattern: string) {
  return [pattern, ...(pattern === "**" ? [] : [`${pattern}/**`])];
}
