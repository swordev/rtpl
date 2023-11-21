import { readIfExists } from "../fs.js";
import { writeFile } from "fs/promises";

export type Secrets = Record<string /* path */, string>;

export async function parseSecretsFile(path: string): Promise<Secrets> {
  const buffer = await readIfExists(path);
  return buffer ? JSON.parse(buffer.toString()) : {};
}

export async function writeSecretsFile(path: string, data: Secrets) {
  await writeFile(path, JSON.stringify(data, null, 2));
}
