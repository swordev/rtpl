import { readIfExists } from "../fs.js";
import { join } from "path";

export type Secrets = Record<string /* path */, string>;

export function getSecretsPath(dir: string) {
  return join(dir, "rtpl.secrets.json");
}

export async function parseSecretsFile(path: string): Promise<Secrets> {
  const buffer = await readIfExists(path);
  return buffer ? JSON.parse(buffer.toString()) : {};
}
