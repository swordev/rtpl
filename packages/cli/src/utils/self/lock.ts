import Ajv from "ajv";
import { writeFile as _writeFile } from "fs/promises";
import { JSONSchema7 } from "json-schema";

export type LockDataFile<TFile = undefined> = {
  creationDate: string;
  updatingDate?: string;
} & (undefined extends TFile ? {} : TFile);

export type LockDataTemplate<TFile = undefined> = {
  dirs: Record<string, Pick<LockDataFile, "creationDate">>;
  files: Record<string, LockDataFile<TFile>>;
};

export type LockData<TFile = undefined> = {
  templates: Record<string, LockDataTemplate<TFile>>;
};

export const schema: JSONSchema7 = {
  definitions: {
    template: {
      type: "object",
      required: ["files"],
      properties: {
        files: {
          type: "object",
          patternProperties: {
            ".+": {
              $ref: "#/definitions/file",
            },
          },
        },
        dirs: {
          type: "object",
          patternProperties: {
            ".+": {
              $ref: "#/definitions/dir",
            },
          },
        },
      },
    },
    file: {
      type: "object",
      required: ["creationDate"],
      properties: {
        creationDate: { type: "string" },
        updatingDate: { type: "string" },
      },
    },
    dir: {
      type: "object",
      required: ["creationDate"],
      properties: {
        creationDate: { type: "string" },
      },
    },
  },
  type: "object",
  required: ["templates"],
  properties: {
    templates: {
      type: "object",
      patternProperties: {
        ".+": {
          $ref: "#/definitions/template",
        },
      },
    },
  },
};

export function initData(): LockData {
  return {
    templates: {},
  };
}

export function validate(data: LockData) {
  const validate = new Ajv().compile(schema);
  if (!validate(data))
    throw new Error(
      `Invalid json schema: ${JSON.stringify(validate.errors, null, 2)}`,
    );
}

export async function writeFile(path: string, data: LockData) {
  validate(data);
  await _writeFile(path, JSON.stringify(data, null, 2));
}

export function parseFile(path: string, ifExists?: boolean) {
  try {
    return require(path) as LockData;
  } catch (error) {
    if (
      ifExists &&
      (error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND"
    )
      return;
    throw error;
  }
}
