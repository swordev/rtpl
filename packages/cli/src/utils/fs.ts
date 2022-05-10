import braceExpansion from "brace-expansion";
import type { Stats } from "fs";
import { mkdir, readFile, stat } from "fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  posix,
  relative,
  resolve,
} from "path";
import { parse as parseYaml } from "yaml";

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

export async function readIfExists(path: string) {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export async function resolveIndexPath(path: string): Promise<string>;
export async function resolveIndexPath(
  path: string,
  allowOptionalFlag?: boolean
): Promise<string | undefined>;
export async function resolveIndexPath(
  path: string,
  allowOptionalFlag?: boolean
): Promise<string | undefined> {
  const paths = braceExpansion(path);
  let optionalFlags = 0;
  for (let path of paths) {
    const hasOptionalFlag = allowOptionalFlag && path.endsWith("?");
    if (hasOptionalFlag) {
      path = path.slice(0, path.length - 1);
      optionalFlags++;
    }
    path = resolve(path);
    let info: Stats | undefined;
    try {
      info = await stat(path);
    } catch (error) {}
    const paths = [
      ...(info?.isFile() ? [path] : []),
      `${path}.ts`,
      `${path}.js`,
      ...(info?.isDirectory() ? [join(path, "index.ts")] : []),
      ...(info?.isDirectory() ? [join(path, "index.js")] : []),
    ];
    for (const path of paths) {
      if (await checkPath(path)) {
        return path;
      }
    }
  }
  if (allowOptionalFlag && optionalFlags === paths.length) return;
  throw new Error(`Index files not founds: ${paths.join(", ")}`);
}

export async function resolvePackagePath(input: string) {
  let resultPath: string | undefined;
  if (!basename(input).includes(".")) input = `${input}/package.json`;
  if (!isAbsolute(input)) input = join(process.cwd(), input);
  resultPath = require.resolve(input);
  if (basename(resultPath) === "package.json") {
    const pkg = await parseJsonFile<{ name: string; main: string }>(resultPath);
    return {
      name: pkg.name,
      main: normalize(dirname(resultPath) + "/" + pkg.main),
    };
  } else {
    return {
      name: relative(process.cwd(), resultPath).replace(/\\/g, "/"),
      main: resultPath,
    };
  }
}

export async function parseJsonFile<T = unknown>(path: string): Promise<T> {
  if (/\.json$/i.test(path)) {
    return require(path);
  } else if (/\.js$/i.test(path)) {
    return require(path).default;
  } else if (/\.ts$/i.test(path)) {
    require("ts-node/register");
    return require(path).default;
  } else if (/\.(ya?ml)$/i.test(path)) {
    const contents = await readFile(path);
    return parseYaml(contents.toString());
  } else {
    throw new Error(`Invalid values path: ${path}`);
  }
}

export function resolveUnixPath(path: string) {
  return isAbsolute(path)
    ? path
    : posix.join(process.cwd().replace(/\\/g, "/"), path);
}

export async function mkrdir(dir: string, baseDir?: string) {
  const relativeDir = baseDir ? relative(baseDir, dir) : dir;
  const folders = relativeDir.split(/[\\\/]/g);
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
