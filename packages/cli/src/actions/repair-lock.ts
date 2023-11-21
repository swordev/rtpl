import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { parseConfigFile } from "../utils/self/config.js";
import { parseLockFile, writeLockFile } from "../utils/self/lock.js";
import chalk from "chalk";
import { existsSync } from "fs";

export type RepairLockOptions = GlobalOptions & {};

export default async function repairLock(options: RepairLockOptions) {
  const config = await parseConfigFile(options.config);
  const lockData = await parseLockFile(config.lock.path);

  const notfounds: string[] = [];

  for (const name in lockData.templates) {
    const tpl = lockData.templates[name];
    for (const path in tpl.files) {
      if (!existsSync(path)) {
        delete tpl.files[path];
        if (!notfounds.length) console.info(chalk.yellow("Files not found:"));
        console.info(chalk.yellow(`- ${path}`));
        notfounds.push(path);
      }
    }
  }

  if (notfounds.length) console.info();

  if (!notfounds.length) {
    console.info(chalk.green("Lock file is correct."));
    return { exitCode: 0 };
  }

  const confirm = await confirmPrompt(
    "Do you want to remove those files from the rtpl lock file?",
  );

  if (!confirm) return { exitCode: 1 };

  await writeLockFile(config.lock.path, lockData);

  console.info(chalk.green("Lock file repared."));

  return { exitCode: 0 };
}
