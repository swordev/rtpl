import { GlobalOptions } from "../cli.js";
import { styleText } from "util";
import { confirmPrompt } from "../utils/cli.js";
import { parseTplConfigFile } from "../utils/self/config.js";
import {
  ActionEnum,
  execFileAction,
  getFileActions,
  logAction,
} from "../utils/self/install.js";
import { TplLock } from "../utils/self/lock.js";
import { splitGlobalOptions } from "../utils/self/options.js";
import { TplSecrets } from "../utils/self/secrets.js";
import backup from "./backup.js";
import diff from "./diff.js";
import { rmdir } from "fs/promises";
import { join } from "path";
import { createTplResources } from "../utils/self/resolve.js";

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

  const config = await parseTplConfigFile(globalOptions.config);

  if (!options.noBackup && config.backup.enabled) {
    const backupResult = await backup({
      ...globalOptions,
      log: false,
    });
    if (backupResult.exitCode)
      return { exitCode: backupResult.exitCode, changes: 0 };
  }

  const { resources, secrets } = await createTplResources(config);

  const lock = new TplLock(config.paths.lock);
  const lockData = await lock.read();
  const actions = await getFileActions(config, resources, lockData);
  let changes = 0;
  let errors = 0;
  for (const action of actions) {
    if (action.type !== ActionEnum.NONE) {
      logAction(action.type, action.relativePath);
      changes++;
    }
    try {
      const dirs = await execFileAction(
        action,
        config.root,
        action.resourcePath,
        options.dryRun,
      );
      if (action.lock) {
        lockData.files[action.resourcePath] = action.lock;
        if (dirs) {
          for (const dir of dirs) {
            lockData.dirs[dir] = {
              creationDate: action.lock.creationDate,
            };
          }
        }
      } else if (typeof action.lock === "undefined") {
        delete lockData.files[action.resourcePath];
      }
    } catch (error) {
      errors++;
      console.error(
        `[${styleText("red", "!")}]`,
        action.relativePath,
        styleText("gray", (error as Error).message),
      );
    }
  }

  const dirs = Object.keys(lockData.dirs).sort().reverse();
  for (const dir of dirs) {
    try {
      await rmdir(join(config.root, dir));
      delete lockData.dirs[dir];
    } catch (error) {}
  }

  if (!options.dryRun) {
    if (secrets) {
      const secretsHandler = new TplSecrets(config.paths.secrets);
      await secretsHandler.write(secrets);
    }
    await lock.write(lockData);
  }

  if (!changes) process.stderr.write(`${styleText("gray", "No changes")}\n`);
  return { changes, exitCode: errors ? 1 : 0 };
}
