import { mkdir, readFile, stat } from "fs/promises";
import { isAbsolute, join, posix, relative } from "path";

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

export function resolveUnixPath(path: string) {
  return isAbsolute(path)
    ? path
    : posix.join(process.cwd().replace(/\\/g, "/"), path);
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
    const object = await import(`file://${path}`);
    return object.default ?? object;
  } else if (/\.json$/i.test(path)) {
    const buffer = await readFile(path);
    return JSON.parse(buffer.toString());
  } else {
    throw new Error(`Invalid extension: ${path}`);
  }
}
