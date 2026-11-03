import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { findBackupPath, readBackupFile } from "../utils/self/backup.js";
import { parseTplConfigFile } from "../utils/self/config.js";

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join, relative } from "path";
import { TplSecrets } from "../utils/self/secrets.js";
import { TplLock } from "../utils/self/lock.js";
import { styleText } from "util";

export type RestoreOptions = GlobalOptions & {
  input: string;
  output?: string;
};

const normalizePath = (path: string) =>
  relative(process.cwd(), path).replace(/\\/g, "/");

export default async function restore(options: RestoreOptions) {
  const config = await parseTplConfigFile(options.config);
  const outConfig = options.output
    ? await parseTplConfigFile(options.config, { root: options.output })
    : config;
  const path = normalizePath(
    await findBackupPath(config.paths.backup, options.input),
  );
  const { data: backupData, headers } = await readBackupFile(path);

  console.info(styleText("green", "Restoring backup..."));

  if (headers.length) {
    console.info();
    console.info(styleText("gray", headers.join("\n")));
  }

  const errors = createRestoreErrors();
  const checkPath = (...paths: string[]) => {
    for (const path of paths) if (existsSync(path)) errors.addPath(path);
  };
  const resolveResOutPath = (path: string) =>
    options.output ? join(options.output, path) : path;

  checkPath(outConfig.paths.secrets, outConfig.paths.lock);

  for (const path in backupData.lock.files) {
    const outPath = resolveResOutPath(path);
    checkPath(outPath);
  }

  if (errors.paths.length) {
    console.info();
    if (!(await confirmPrompt("Do you want to overwrite the files?", false)))
      return { exitCode: 1 };
  }

  const dirs = new Set<string>();

  for (const path in backupData.lock.dirs) {
    const outPath = resolveResOutPath(path);
    if (dirs.has(outPath)) continue;
    dirs.add(outPath);
    await mkdir(outPath, { recursive: true });
  }
  for (const path in backupData.lock.files) {
    const contents = backupData.lock.files[path].contents;
    const outPath = resolveResOutPath(path);
    if (typeof contents === "string") await writeFile(outPath, contents);
    delete (backupData.lock.files[path] as any).contents;
  }

  const secrets = new TplSecrets(outConfig.paths.secrets);
  await secrets.write(backupData.secrets);
  const lock = new TplLock(outConfig.paths.lock);
  await lock.write(backupData.lock);

  console.info();
  console.info(styleText("green", "Backup restored successfully."));

  return { exitCode: 0 };
}

function createRestoreErrors() {
  const paths: string[] = [];

  const addPath = (path: string) => {
    if (!paths.length) {
      console.error();
      console.error(styleText("red", `The following files already exist:`));
    }
    path = normalizePath(path);
    console.error(styleText("red", `- ${path}`));
    paths.push(path);
  };
  return { addPath, paths };
}
