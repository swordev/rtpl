import { AbstractModel } from "../../models/AbstractModel";
import { checkPath, mkrdir } from "../fs";
import { sort } from "../object";
import * as lock from "./lock";
import chalk from "chalk";
import { readFile, rm, writeFile } from "fs/promises";
import { dirname, join, relative } from "path";

export enum ActionEnum {
  NONE,
  ADD,
  UPDATE,
  DELETE,
}

type ActionResult =
  | {
      type: ActionEnum.NONE;
      lock: lock.LockDataFile;
    }
  | {
      type: ActionEnum.ADD;
      data: string;
      lock: lock.LockDataFile;
    }
  | {
      type: ActionEnum.UPDATE;
      data: string;
      lock: lock.LockDataFile | false;
    }
  | {
      type: ActionEnum.DELETE;
      lock: lock.LockDataFile | false | undefined;
    };

export function logAction(action: ActionEnum, path: string) {
  if (action === ActionEnum.NONE) {
    console.info(`[${chalk.grey("-")}]`, path);
  } else if (action === ActionEnum.ADD) {
    console.info(`[${chalk.green("A")}]`, path);
  } else if (action === ActionEnum.UPDATE) {
    console.info(`[${chalk.yellow("U")}]`, path);
  } else if (action === ActionEnum.DELETE) {
    console.info(`[${chalk.red("D")}]`, path);
  }
}

export async function getFileAction(
  path: string,
  model: AbstractModel,
  previousLock?: lock.LockDataFile
): Promise<ActionResult> {
  const lock: lock.LockDataFile = previousLock
    ? {
        ...previousLock,
      }
    : {
        creationDate: new Date().toISOString(),
      };

  if (model) {
    const data = model.toString();
    if (!(await checkPath(path))) {
      return { type: ActionEnum.ADD, data, lock };
    } else {
      let oldData;
      try {
        oldData = (await readFile(path)).toString();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EISDIR") throw oldData;
      }
      return oldData === data
        ? { type: ActionEnum.NONE, lock }
        : {
            type: ActionEnum.UPDATE,
            data,
            lock: previousLock
              ? { ...lock, updatingDate: new Date().toISOString() }
              : false,
          };
    }
  } else {
    return {
      type: ActionEnum.DELETE,
      lock: previousLock ? undefined : false,
    };
  }
}

export async function getFileActions(
  models: Record<string, AbstractModel>,
  lockDataEntrypoint: lock.LockDataTemplate
) {
  const result: Record<string, ActionResult> = {};
  const lockFilePaths = Object.keys(lockDataEntrypoint.files);

  for (const path of lockFilePaths) {
    const lock = lockDataEntrypoint.files[path];
    result[path] = await getFileAction(path, models[path], lock);
  }

  for (const path in models) {
    if (!(path in result)) {
      result[path] = await getFileAction(path, models[path]);
    }
  }

  return sort(result);
}

export async function execFileAction(
  action: ActionResult,
  baseDir: string,
  path: string,
  dryRun: boolean
) {
  logAction(action.type, path);
  const absPath = join(baseDir, path);
  if (action.lock === false) {
    throw new Error(`Path not found in lock entrypoint files`);
  } else if (!dryRun) {
    if (action.type === ActionEnum.ADD) {
      const dirs = await mkrdir(dirname(absPath), baseDir);
      await writeFile(absPath, action.data);
      return dirs.map((v) => relative(baseDir, v).replace(/\\/g, "/"));
    } else if (action.type === ActionEnum.UPDATE) {
      await writeFile(absPath, action.data);
    } else if (action.type === ActionEnum.DELETE) {
      try {
        await rm(absPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
}
