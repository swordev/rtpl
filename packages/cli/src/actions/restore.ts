import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { findBackupPath, readBackupFile } from "../utils/self/backup.js";
import { parseTplConfigFile } from "../utils/self/config.js";

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { applyAttrs, attrsSupported } from "../utils/attrs.js";
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
  const resolveResOutPath = (path: string) => join(outConfig.paths.root, path);

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
    const { contents, mode, uid, gid } = backupData.lock.files[path];
    const outPath = resolveResOutPath(path);
    if (typeof contents === "string") {
      await writeFile(outPath, contents);
      if (attrsSupported()) {
        // Owner first since `chown` can clear the setuid/setgid bits.
        try {
          await applyAttrs(outPath, { uid, gid });
        } catch (error) {
          console.warn(
            styleText(
              "yellow",
              `Unable to restore the owner of ${normalizePath(outPath)}: ${(error as Error).message}`,
            ),
          );
        }
        await applyAttrs(outPath, { mode });
      }
    }
    const file = backupData.lock.files[path] as Partial<
      (typeof backupData.lock.files)[string]
    >;
    delete file.contents;
    delete file.mode;
    delete file.uid;
    delete file.gid;
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
