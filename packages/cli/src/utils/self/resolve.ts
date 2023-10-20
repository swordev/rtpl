import { AbstractRes, Tpl } from "../../index.js";
import { DirRes } from "../../resources/DirRes.js";
import { checkPath, statIfExists } from "../fs.js";
import { isPlainObject } from "../object.js";
import { isDir, isPath, stripRootBackPaths } from "../path.js";
import { makeFilter } from "../string.js";
import {
  ResourcesResultItem,
  TplResolveSelf,
  createEnabledArray,
} from "./config.js";
import { createResourceSystem } from "./rs.js";
import mm from "micromatch";
import { basename, dirname, join, relative } from "path";
import * as posix from "path/posix";

export type ResolveConfigOptions = {
  filter?: string[];
  outPath: string;
  lockPath: string;
};

export function resolvePath(data: {
  path: string;
  outPath: string;
  lockDir: string;
}) {
  let path = join(data.outPath, data.path);
  path = relative(data.lockDir, path);
  return path.replace(/\\/g, "/");
}

function resolveTag(tag: string, input: AbstractRes) {
  const defaultExtension = input.getDefaultExtension();
  if (
    typeof defaultExtension === "string" &&
    !tag.includes(".") &&
    !input.name
  ) {
    return `${tag}.${defaultExtension}`;
  }
  return tag;
}

function splitLevels(res: AbstractRes, levels: string[]): [string[], string] {
  const folders = levels.slice(0, -1);
  const rawTag = levels.slice(-1)[0] ?? "_";
  const tag = resolveTag(rawTag, res);
  return [folders, tag];
}

function resolvePathLevels(res: AbstractRes, levels: string[]) {
  const isRootDir =
    !levels.length && DirRes.isInstance(res) && !res.name?.length;
  if (isRootDir) return [];

  const [pathLevels, tag] = splitLevels(res, levels);

  if (isPath(tag)) {
    if (isDir(tag)) {
      pathLevels.push(tag, res.name ?? "_");
    } else {
      pathLevels.push(tag);
    }
  } else {
    pathLevels.push(res.name ?? tag);
  }
  return pathLevels;
}

export async function resolveResources(options: {
  resources: unknown;
  outPath?: string;
  lockDir?: string;
  filter?: string[];
  onValue?: (
    key: string,
    value: AbstractRes,
    actions: { process: boolean; add: boolean },
  ) => Promise<void | false>;
}) {
  const values: Record<string, AbstractRes> = {};
  const patterns = options?.filter?.flatMap((v) => makeFilter(v));

  const process = async (input: unknown, levels: string[]) => {
    if (isPlainObject(input)) {
      for (const name in input) {
        const value = input[name];
        await process(value, [...levels, name]);
      }
    } else if (typeof input === "function") {
      if (input.length === 0) {
        const value = await input();
        await process(value, levels);
      }
    } else if (Array.isArray(input)) {
      let index = 0;
      for (const value of input) {
        await process(value, [...levels, (index++).toString()]);
      }
    } else if (AbstractRes.isInstance(input)) {
      const resName = input.name;

      if (resName) {
        const resNameBase = basename(resName);
        if (resName !== resNameBase)
          throw new Error(`Invalid resource name: ${resName}`);
      }

      const pathLevels = resolvePathLevels(input, levels);
      const path = resolvePath({
        path: pathLevels.join("/"),
        lockDir: options.lockDir ?? ".",
        outPath: options.outPath ?? ".",
      });

      if (
        patterns &&
        !mm.isMatch(path, patterns, {
          dot: true,
        })
      )
        return;
      const actions = { process: true, add: true };
      const result = await options.onValue?.(path, input, actions);
      if (result === false) actions.add = actions.process = false;
      if (actions.add) {
        if (path in values)
          throw new Error(`Duplicated resource path: ${path}`);
        values[path] = input as any;
      }
      if (actions.process && DirRes.isInstance(input))
        await process(input.data, pathLevels);
    }
  };
  await process(options.resources, []);
  return values;
}

export async function readTplFile(path: string): Promise<Tpl> {
  const info = await statIfExists(path);

  if (!info) throw new Error(`Invalid path: ${path}`);

  let filePath: string | undefined;

  if (info.isDirectory()) {
    const paths = [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"].map((ext) =>
      join(path, `rtpl${ext}`),
    );
    for (const v of paths) {
      if (await checkPath(v)) filePath = v;
    }
    if (!filePath) throw new Error(`Invalid path: ${path}`);
  } else {
    filePath = path;
  }

  if (/\.[cm]?[jt]s$/i.test(filePath)) {
    const object = await import(`file://${filePath}`);
    return object.default ?? object;
  } else {
    throw new Error(`Invalid values path: ${path}`);
  }
}

export async function resolveTpl(tpl: Tpl, options: ResolveConfigOptions) {
  const lockDir = dirname(options.lockPath);
  const outPath = options.outPath;
  const filter = options.filter;
  const resolveOptions = {
    lockDir,
    outPath,
    filter,
  };

  const outFolder = "resources";
  const resultItems: ResourcesResultItem[] = [];
  const inResources = await resolveResources({
    ...resolveOptions,
    resources: await tpl.resources(resultItems),
    onValue: async (path, res, actions) => {
      if (res.resolved === false) {
        actions.process = false;
      } else {
        (res as { resolved: boolean }).resolved = true;
      }
    },
  });

  const rs = createResourceSystem(inResources);

  for (const item of resultItems) {
    const tplOptions = await item.tpl.options();
    const enabled = createEnabledArray(
      tplOptions.enabled,
      item.tpl.config.depGroups,
    );
    const self: TplResolveSelf<any> = {
      isEnabled: (name) => enabled.includes(name),
      ...rs,
    };
    await item.tpl.config.onResolve?.bind(self)(item.resources, tplOptions);
  }

  const resources = await resolveResources({
    ...resolveOptions,
    resources: inResources,
    onValue: async (path, res, actions) => {
      await res.onReady(posix.join(outFolder, path));
      if (DirRes.isInstance(res)) {
        actions.add = false;
        actions.process = !res.resolved;
      }
    },
  });

  for (const path in resources) {
    const isRootPath = path.startsWith("../");

    const newPath = stripRootBackPaths(path);
    if (isRootPath) {
      resources[newPath] = resources[path];
    } else {
      resources[posix.join(outFolder, newPath)] = resources[path];
    }
    delete resources[path];
  }

  return resources;
}
