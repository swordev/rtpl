import { AbstractRes, ResReadyContext } from "../../resources/AbstractRes.js";
import { MinimalDirRes } from "../../resources/DirRes.js";
import { checkPath, findPath, readAnyFile } from "../fs.js";
import { isPlainObject } from "../object.js";
import { expandPaths, isDir, isPath, stripRootBackPaths } from "../path.js";
import { makeFilter } from "../string.js";
import { RtplConfig } from "./config.js";
import { MinimalTpl, ResourcesResultItem } from "./minimal-tpl.js";
import { createResourceSystem } from "./rs.js";
import { parseSecretsFile } from "./secrets.js";
import mm from "micromatch";
import { basename, join, relative } from "path";
import * as posix from "path/posix";

export type ResolveConfigOptions = {
  config: RtplConfig;
  filter?: string[];
};

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
    !levels.length && MinimalDirRes.isInstance(res) && !res.name?.length;
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
  filter?: string[];
  config: RtplConfig;
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
      const path = join(...pathLevels).replace(/\\/g, "/");

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
      if (actions.process && MinimalDirRes.isInstance(input))
        await process(input.data, pathLevels);
    }
  };
  await process(options.resources, []);
  return values;
}

export async function parseTplFile(inPath: string): Promise<MinimalTpl> {
  const paths = expandPaths(inPath, { js: true, ts: true });
  const path = await findPath(paths);
  if (!path) throw new Error(`Template file not found: ${inPath}`);
  return readAnyFile(path);
}

export async function resolveTpl(
  tpl: MinimalTpl,
  options: ResolveConfigOptions,
) {
  const { config } = options;
  const resourcesDir = relative(config.root, config.resources.path).replace(
    /\\/g,
    "/",
  );
  const resultItems: ResourcesResultItem[] = [];
  const inResources = await resolveResources({
    config,
    filter: options.filter,
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
    await item.tpl.config.onResolve?.bind(rs)(item.resources, tplOptions);
  }

  const ctx = new ResReadyContext({
    secrets: config.secrets.enabled
      ? await parseSecretsFile(config.secrets.path)
      : undefined,
    initialSecrets: !(await checkPath(config.secrets.path)),
  });

  const resources = await resolveResources({
    config,
    filter: options.filter,
    resources: inResources,
    onValue: async (path, res, actions) => {
      await res.onReady(posix.join(resourcesDir, path), ctx);
      if (MinimalDirRes.isInstance(res)) {
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
      resources[posix.join(resourcesDir, newPath)] = resources[path];
    }
    delete resources[path];
  }

  return { resources, secrets: ctx.data.secrets };
}
