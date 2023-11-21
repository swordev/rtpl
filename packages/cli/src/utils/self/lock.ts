import Ajv from "ajv";
import { readFile, writeFile } from "fs/promises";
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

export const lockSchema: JSONSchema7 = {
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

export function assertLockData(data: LockData): asserts data is LockData {
  const validate = new Ajv.default().compile(lockSchema);
  if (!validate(data))
    throw new Error(
      `Invalid json schema: ${JSON.stringify(validate.errors, null, 2)}`,
    );
}

export async function writeLockFile(path: string, data: LockData) {
  assertLockData(data);
  await writeFile(path, JSON.stringify(data, null, 2));
}

export async function parseLockFile<TFile = undefined>(
  path: string,
): Promise<LockData<TFile>> {
  try {
    const json = (await readFile(path)).toString();
    return JSON.parse(json);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { templates: {} };
    throw error;
  }
}
