import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { parseConfigFile } from "../utils/self/config.js";
import {
  ActionEnum,
  execFileAction,
  getFileActions,
  logAction,
} from "../utils/self/install.js";
import { parseLockFile, writeLockFile } from "../utils/self/lock.js";
import { splitGlobalOptions } from "../utils/self/options.js";
import { parseTplFile, resolveTpl } from "../utils/self/resolve.js";
import { writeSecretsFile } from "../utils/self/secrets.js";
import backup from "./backup.js";
import diff from "./diff.js";
import chalk from "chalk";
import { rmdir } from "fs/promises";
import { join } from "path";

export type InstallActionOptions = GlobalOptions & {
  dryRun: boolean;
  confirm: boolean;
  noBackup: boolean;
  lines: number;
};

export default async function install(options: InstallActionOptions) {
  const [globalOptions] = splitGlobalOptions(options);

  if (!options.confirm) {
    const diffResult = await diff({
      ...globalOptions,
      lines: options.lines,
      hideLines: false,
      showAll: false,
    });

    if (!diffResult.changes) return { changes: 0, exitCode: 0 };
    if (!(await confirmPrompt("Do you want to install the changes?")))
      return { changes: diffResult.changes, exitCode: 1 };
    console.info();
  }

  const config = await parseConfigFile(globalOptions.config);

  if (!options.noBackup && config.backup.enabled) {
    const backupResult = await backup({
      ...globalOptions,
      log: false,
    });
    if (backupResult.exitCode)
      return { exitCode: backupResult.exitCode, changes: 0 };
  }

  const tpl = await parseTplFile(config.template.path);
  const { resources, secrets } = await resolveTpl(tpl, {
    config,
    filter: options.filter,
  });

  const lockData = await parseLockFile(config.lock.path);
  const selfLockData = lockData.templates[tpl.config.name] || {
    files: {},
    dirs: {},
  };

  const actions = await getFileActions(resources, selfLockData);
  let changes = 0;
  let errors = 0;
  for (const path in actions) {
    const action = actions[path];
    if (action.type !== ActionEnum.NONE) {
      logAction(action.type, path);
      changes++;
    }
    try {
      const dirs = await execFileAction(
        action,
        config.root,
        path,
        options.dryRun,
      );
      if (action.lock) {
        selfLockData.files[path] = action.lock;
        if (dirs) {
          for (const dir of dirs) {
            selfLockData.dirs[dir] = {
              creationDate: action.lock.creationDate,
            };
          }
        }
      } else if (typeof action.lock === "undefined") {
        delete selfLockData.files[path];
      }
    } catch (error) {
      errors++;
      console.error(
        `[${chalk.red("!")}]`,
        path,
        chalk.grey((error as Error).message),
      );
    }
  }

  const dirs = Object.keys(selfLockData.dirs).sort().reverse();
  for (const dir of dirs) {
    try {
      await rmdir(join(config.root, dir));
      delete selfLockData.dirs[dir];
    } catch (error) {}
  }

  lockData.templates[tpl.config.name] = selfLockData;

  if (!options.dryRun) {
    if (secrets) await writeSecretsFile(config.secrets.path, secrets);
    await writeLockFile(config.lock.path, lockData);
  }

  if (!changes) process.stderr.write(`${chalk.grey("No changes")}\n`);
  return { changes, exitCode: errors ? 1 : 0 };
}
