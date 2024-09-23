import { mkdir, readdir, readFile, rm, stat } from "fs/promises";
import { join, relative } from "path";

export async function statIfExists(path: string) {
  try {
    return await stat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export async function checkPath(path: string) {
  return !!(await statIfExists(path));
}

export async function findPath(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    if (await checkPath(path)) return path;
  }
}
export async function readIfExists(path: string) {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EISDIR") return;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export async function mkrdir(dir: string, baseDir?: string) {
  const relativeDir = baseDir ? relative(baseDir, dir) : dir;
  const folders = relativeDir.split(/[\\/]/g);
  const dirs: string[] = [];
  let path = baseDir ?? "";
  for (const folder of folders) {
    path = join(path, folder);
    try {
      await mkdir(path);
      dirs.push(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return dirs;
}

export async function readAnyFile(path: string) {
  if (/\.[cm]?[jt]s$/i.test(path)) {
    if (path.endsWith(".ts"))
      // @ts-ignore
      await import("tsx");
    const object = await import(`file://${path}`);
    return object.default ?? object;
  } else if (/\.json$/i.test(path)) {
    const buffer = await readFile(path);
    return JSON.parse(buffer.toString());
  } else {
    throw new Error(`Invalid extension: ${path}`);
  }
}

export type DeletionPolicyOptions = {
  keepLast?: number;
};

export async function deleteByPolicy(
  path: string,
  options: DeletionPolicyOptions,
  filter: (file: string) => boolean,
) {
  let inputFiles = (await readdir(path)).filter(filter);
  let removeFiles: string[] = [];
  if (options.keepLast)
    removeFiles = inputFiles.sort().reverse().slice(options.keepLast);
  for (const file of removeFiles) await rm(join(path, file));
  return removeFiles;
}
