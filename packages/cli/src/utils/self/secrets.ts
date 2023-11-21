import { readIfExists } from "../fs.js";

export type Secrets = Record<string /* path */, string>;

export async function parseSecretsFile(path: string): Promise<Secrets> {
  const buffer = await readIfExists(path);
  return buffer ? JSON.parse(buffer.toString()) : {};
}
