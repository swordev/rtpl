import { AbstractRes } from "../../resources/AbstractRes.js";
import { checkPath, mkrdir } from "../fs.js";
import { styleText } from "util";
import { sort } from "../object.js";
import { LockData, LockDataFile } from "./lock.js";
import { readFile, rm, rmdir, writeFile } from "fs/promises";
import { dirname, join, relative } from "path";
import { ResolvedTplConfig } from "./config.js";

export enum ActionEnum {
  NONE,
  ADD,
  UPDATE,
  DELETE,
}

type ActionResult =
  | {
      type: ActionEnum.NONE;
      lock: LockDataFile;
    }
  | {
      type: ActionEnum.ADD;
      data: string;
      lock: LockDataFile;
    }
  | {
      type: ActionEnum.UPDATE;
      data: string;
      lock: LockDataFile | false;
    }
  | {
      type: ActionEnum.DELETE;
      lock: LockDataFile | false | undefined;
    };

export function logAction(action: ActionEnum, path: string) {
  if (action === ActionEnum.NONE) {
    console.info(`[${styleText("gray", "-")}]`, path);
  } else if (action === ActionEnum.ADD) {
    console.info(`[${styleText("green", "A")}]`, path);
  } else if (action === ActionEnum.UPDATE) {
    console.info(`[${styleText("yellow", "U")}]`, path);
  } else if (action === ActionEnum.DELETE) {
    console.info(`[${styleText("red", "D")}]`, path);
  }
}

export async function getFileAction(
  absPath: string,
  res: AbstractRes,
  previousLock?: LockDataFile,
): Promise<ActionResult> {
  const lock: LockDataFile = previousLock
    ? { ...previousLock }
    : { creationDate: new Date().toISOString() };

  if (res) {
    const data = res.toString();
    if (!(await checkPath(absPath))) {
      return { type: ActionEnum.ADD, data, lock };
    } else {
      let oldData;
      try {
        oldData = (await readFile(absPath)).toString();
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
  config: ResolvedTplConfig,
  resources: Record<string, AbstractRes>,
  lockData: LockData,
) {
  const result: Record<
    string,
    ActionResult & {
      relativePath: string;
      resourcePath: string;
      fsPath: string;
    }
  > = {};
  const lockFilePaths = Object.keys(lockData.files);

  for (const resourcePath of lockFilePaths) {
    const lock = lockData.files[resourcePath];
    const fsPath = join(config.root, resourcePath);
    const relativePath = relative(config.paths.cwd, fsPath).replace(/\\/g, "/");
    result[resourcePath] = {
      ...(await getFileAction(fsPath, resources[resourcePath], lock)),
      relativePath,
      resourcePath,
      fsPath,
    };
  }

  for (const resourcePath in resources) {
    if (!(resourcePath in result)) {
      const fsPath = join(config.root, resourcePath);
      const relativePath = relative(config.paths.cwd, fsPath).replace(
        /\\/g,
        "/",
      );
      result[resourcePath] = {
        ...(await getFileAction(fsPath, resources[resourcePath])),
        relativePath,
        resourcePath,
        fsPath,
      };
    }
  }

  return Object.values(sort(result));
}

export async function execFileAction(
  action: ActionResult,
  baseDir: string,
  path: string,
  dryRun: boolean,
) {
  const absPath = join(baseDir, path);
  if (action.lock === false) {
    throw new Error(`Path not found in lock entrypoint files`);
  } else if (!dryRun) {
    if (action.type === ActionEnum.ADD) {
      const dirs = await mkrdir(dirname(absPath), baseDir);
      await writeFile(absPath, action.data);
      return dirs.map((v) => relative(baseDir, v).replace(/\\/g, "/"));
    } else if (action.type === ActionEnum.UPDATE) {
      const exec = async () => await writeFile(absPath, action.data);
      try {
        await exec();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EISDIR") throw error;
        try {
          await rmdir(absPath);
        } catch (_error) {
          throw error;
        }
        await exec();
      }
    } else if (action.type === ActionEnum.DELETE) {
      try {
        await rm(absPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
}
