import { dirname } from "path";
import { readIfExists } from "../fs.js";
import { mkdir, writeFile } from "fs/promises";

export type Secrets = Record<string /* path */, string>;

export class TplSecrets {
  constructor(readonly path: string) {}
  async read(): Promise<Secrets> {
    const buffer = await readIfExists(this.path);
    return buffer ? JSON.parse(buffer.toString()) : {};
  }
  async purge(newSecrets?: Secrets) {
    const currentSecrets = await this.read();
    const secrets: Secrets = {};
    const deletions: string[] = [];
    for (const path in currentSecrets) {
      if (path in (newSecrets || {})) {
        secrets[path] = currentSecrets[path];
      } else {
        deletions.push(path);
      }
    }
    return { deletions, secrets };
  }
  async write(data: Secrets) {
    const sorted: Secrets = {};
    for (const key of Object.keys(data).sort()) sorted[key] = data[key];
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(sorted, null, 2));
  }
}
