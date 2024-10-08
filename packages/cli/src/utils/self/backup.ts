import { RtplConfig } from "../../utils/self/config.js";
import { deleteByPolicy } from "../fs.js";
import { LockData, parseLockFile } from "./lock.js";
import { Secrets, parseSecretsFile } from "./secrets.js";
import { readFile, readdir } from "fs/promises";
import { parse, stringify } from "yaml";

export type BackupData = LockData<{ contents: string }> & {
  secrets: Secrets;
};

export function serializeBackupData(data: BackupData) {
  return stringify(data, { version: "1.1" });
}

function isBackupFile(name: string) {
  return /^\d+\.yaml$/.test(name);
}

export async function deleteOldBackups(config: RtplConfig["backup"]) {
  if (config.deletionPolicy === false) return [];
  return await deleteByPolicy(
    config.path,
    config.deletionPolicy || {},
    isBackupFile,
  );
}

export async function createBackupFile(
  config: Pick<RtplConfig, "lock" | "secrets" | "backup">,
): Promise<BackupData> {
  const lock = await parseLockFile<{ contents: string }>(config.lock.path);
  const secrets = await parseSecretsFile(config.secrets.path);
  return { templates: lock.templates, secrets };
}

export async function readBackupFile(
  path: string,
): Promise<{ data: BackupData; headers: string[] }> {
  const buffer = await readFile(path);
  const yaml = buffer.toString();
  const headers = [
    ...yaml.split(/\r?\n/).filter((v) => v.startsWith("#")),
    `# path: ${path}`,
  ];
  const data = parse(buffer.toString(), { version: "1.1" });
  return { data, headers };
}

async function findFileByIndex(path: string, index: number) {
  const id = (await readdir(path))
    .filter(isBackupFile)
    .map((f) => Number(f.split(".")[0]))
    .sort((a, b) => a - b)
    .at(index);
  return id ? `${id}.yaml` : undefined;
}

export async function findBackupPath(dir: string, rawInput: string | number) {
  const input = /^-\d+$/.test(rawInput.toString())
    ? Number(rawInput)
    : rawInput;

  if (typeof input === "number" && input < 0) {
    const fileName = await findFileByIndex(dir, input);
    if (!fileName) throw new Error(`Backup id not found`);
    return `${dir}/${fileName}`;
  }

  let output = input.toString();
  const isFileName = !output.includes("/") && !output.includes("\\");
  const hasExtension = output.includes(".");
  if (!isFileName) return output;
  if (!hasExtension) output += ".yaml";
  return `${dir}/${output}`;
}
