import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { findBackupPath, readBackupFile } from "../utils/self/backup.js";
import { parseConfigFile } from "../utils/self/config.js";
import { writeLockFile } from "../utils/self/lock.js";
import { writeSecretsFile } from "../utils/self/secrets.js";
import chalk from "chalk";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { relative } from "path";

export type RestoreOptions = GlobalOptions & {
  input: string;
};

const normalizePath = (path: string) =>
  relative(process.cwd(), path).replace(/\\/g, "/");

export default async function restore(options: RestoreOptions) {
  const config = await parseConfigFile(options.config);
  const path = normalizePath(
    await findBackupPath(config.backup.path, options.input),
  );
  const { data: backupData, headers } = await readBackupFile(path);

  console.info(chalk.green("Restoring backup..."));

  if (headers.length) {
    console.info();
    console.info(chalk.grey(headers.join("\n")));
  }

  const errors = createRestoreErrors();

  if (existsSync(config.secrets.path)) errors.addPath(config.secrets.path);
  if (existsSync(config.lock.path)) errors.addPath(config.lock.path);

  for (const name in backupData.templates) {
    const tpl = backupData.templates[name];
    for (const path in tpl.files) {
      if (existsSync(path)) errors.addPath(path);
    }
  }

  if (errors.paths.length) {
    console.info();
    if (!(await confirmPrompt("Do you want to overwrite the files?", false)))
      return { exitCode: 1 };
  }

  const dirs = new Set<string>();
  for (const name in backupData.templates) {
    const tpl = backupData.templates[name];
    for (const path in tpl.dirs) {
      if (dirs.has(path)) continue;
      dirs.add(path);
      await mkdir(path, { recursive: true });
    }
    for (const path in tpl.files) {
      const contents = tpl.files[path].contents;
      if (typeof contents === "string") await writeFile(path, contents);
      delete (tpl.files[path] as any).contents;
    }
  }

  await writeSecretsFile(config.secrets.path, backupData.secrets);
  await writeLockFile(config.lock.path, {
    templates: backupData.templates as any,
  });

  console.info();
  console.info(chalk.green("Backup restored successfully."));

  return { exitCode: 0 };
}

function createRestoreErrors() {
  const paths: string[] = [];

  const addPath = (path: string) => {
    if (!paths.length) {
      console.error();
      console.error(chalk.red(`The following files already exist:`));
    }
    path = normalizePath(path);
    console.error(chalk.red(`- ${path}`));
    paths.push(path);
  };
  return { addPath, paths };
}
