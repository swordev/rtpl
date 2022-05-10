import { GlobalOptions } from "../cli";
import {
  ActionEnum,
  execFileAction,
  getFileActions,
} from "../utils/self/install";
import * as lock from "../utils/self/lock";
import { resolve } from "../utils/self/resolve";
import chalk from "chalk";
import { rmdir } from "fs/promises";
import { dirname, join } from "path";

export type InstallActionOptions = GlobalOptions & {
  dryRun: boolean;
};

export default async function install(options: InstallActionOptions) {
  const allModels = await resolve({
    filter: options.filter,
    configPath: options.configPath,
    lockPath: options.lockPath,
    outPath: options.outPath,
  });

  const lockData = lock.parseFile(options.lockPath, true) ?? {
    templates: {},
  };

  const lockDir = dirname(options.lockPath);
  let changes = 0;
  let errors = 0;

  for (const name in allModels) {
    const models = allModels[name];

    const selfLockData = lockData.templates[name] || {
      files: {},
      dirs: {},
    };

    const actions = await getFileActions(models, selfLockData);

    for (const path in actions) {
      const action = actions[path];
      if (action.type !== ActionEnum.NONE) {
        changes++;
      }
      try {
        const dirs = await execFileAction(
          action,
          lockDir,
          path,
          options.dryRun
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
          chalk.grey((error as Error).message)
        );
      }
    }

    const dirs = Object.keys(selfLockData.dirs).sort().reverse();
    for (const dir of dirs) {
      try {
        await rmdir(join(lockDir, dir));
        delete selfLockData.dirs[dir];
      } catch (error) {}
    }

    lockData.templates[name] = selfLockData;

    if (!options.dryRun) await lock.writeFile(options.lockPath, lockData);
  }
  return { changes, exitCode: errors ? 1 : 0 };
}
