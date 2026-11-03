import { StandardSchemaV1 } from "@standard-schema/spec";

export function defineTplSchema<T>(
  validate?: StandardSchemaV1<T, T>["~standard"]["validate"],
): StandardSchemaV1<T, T> {
  return {
    "~standard": {
      validate: validate ?? ((value) => ({ value, issues: [] })),
      vendor: "local",
      version: 1,
      types: {
        input: {} as T,
        output: {} as T,
      },
    },
  };
}
