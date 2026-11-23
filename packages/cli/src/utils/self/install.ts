import { AbstractRes } from "../../resources/AbstractRes.js";
import { mkrdir, statIfExists } from "../fs.js";
import {
  applyAttrs,
  AttrChanges,
  diffAttrs,
  hasAttrChanges,
  ResolvedAttrs,
  resolveAttrs,
} from "../attrs.js";
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
  /**
   * Only the file mode or owner changed.
   */
  ATTRS,
}

type ActionAttrs = {
  /**
   * Declared attributes (applied after writing the file).
   */
  attrs: ResolvedAttrs;
  /**
   * Declared attributes that differ from the current ones.
   */
  attrChanges: AttrChanges;
};

export type ActionResult =
  | ({
      type: ActionEnum.NONE;
      lock: LockDataFile;
    } & ActionAttrs)
  | ({
      type: ActionEnum.ADD;
      data: string;
      lock: LockDataFile;
    } & ActionAttrs)
  | ({
      type: ActionEnum.UPDATE;
      data: string;
      lock: LockDataFile | false;
    } & ActionAttrs)
  | ({
      type: ActionEnum.ATTRS;
      lock: LockDataFile | false;
    } & ActionAttrs)
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
  } else if (action === ActionEnum.ATTRS) {
    console.info(`[${styleText("blue", "P")}]`, path);
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
    const attrs = await resolveAttrs(res);
    const stats = await statIfExists(absPath);
    if (!stats) {
      const attrChanges = diffAttrs(undefined, attrs);
      return { type: ActionEnum.ADD, data, lock, attrs, attrChanges };
    } else {
      let oldData;
      try {
        oldData = (await readFile(absPath)).toString();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EISDIR") throw error;
      }
      const attrChanges = diffAttrs(
        stats.isDirectory() ? undefined : stats,
        attrs,
      );
      const updatingLock = previousLock
        ? { ...lock, updatingDate: new Date().toISOString() }
        : false;
      if (oldData !== data) {
        return {
          type: ActionEnum.UPDATE,
          data,
          lock: updatingLock,
          attrs,
          attrChanges,
        };
      } else if (hasAttrChanges(attrChanges)) {
        return {
          type: ActionEnum.ATTRS,
          lock: updatingLock,
          attrs,
          attrChanges,
        };
      } else {
        return { type: ActionEnum.NONE, lock, attrs, attrChanges };
      }
    }
  } else {
    return {
      type: ActionEnum.DELETE,
      lock: previousLock ? undefined : false,
    };
  }
}

async function getFileActionAt(
  resourcePath: string,
  fsPath: string,
  resources: Record<string, AbstractRes>,
  lock?: LockDataFile,
) {
  try {
    return await getFileAction(fsPath, resources[resourcePath], lock);
  } catch (error) {
    throw new Error(`${resourcePath}: ${(error as Error).message}`, {
      cause: error,
    });
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
    const fsPath = join(config.paths.root, resourcePath);
    const relativePath = relative(config.paths.cwd, fsPath).replace(/\\/g, "/");
    result[resourcePath] = {
      ...(await getFileActionAt(resourcePath, fsPath, resources, lock)),
      relativePath,
      resourcePath,
      fsPath,
    };
  }

  for (const resourcePath in resources) {
    if (!(resourcePath in result)) {
      const fsPath = join(config.paths.root, resourcePath);
      const relativePath = relative(config.paths.cwd, fsPath).replace(
        /\\/g,
        "/",
      );
      result[resourcePath] = {
        ...(await getFileActionAt(resourcePath, fsPath, resources)),
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
      // Create the file with the final mode so its contents are never
      // exposed with wider permissions (the umask may still narrow it).
      await writeFile(
        absPath,
        action.data,
        action.attrs.mode === undefined ? {} : { mode: action.attrs.mode },
      );
      await applyAttrs(absPath, action.attrs);
      return dirs.map((v) => relative(baseDir, v).replace(/\\/g, "/"));
    } else if (action.type === ActionEnum.UPDATE) {
      const exec = async () => await writeFile(absPath, action.data);
      // Restrict the existing file before writing the new contents.
      await applyAttrs(absPath, action.attrs);
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
      await applyAttrs(absPath, action.attrs);
    } else if (action.type === ActionEnum.ATTRS) {
      await applyAttrs(absPath, action.attrs);
    } else if (action.type === ActionEnum.DELETE) {
      try {
        await rm(absPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
}
