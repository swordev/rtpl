import { findPath, readAnyFile } from "../fs.js";
import { merge } from "../object.js";
import { expandPaths } from "../path.js";
import { dirname, join, resolve } from "path";

export type RtplConfig = {
  /**
   * @default "."
   */
  root: string;
  template: {
    /**
     * @default "rtpl.*"
     */
    path: string;
  };
  lock: {
    /**
     * @default "rtpl-lock.json"
     */
    path: string;
  };
  resources: {
    /**
     * @default "resources"
     */
    path: string;
  };
  secrets: {
    /**
     * @default true
     */
    enabled: boolean;
    /**
     * @default "rtpl-secrets.json"
     */
    path: string;
  };
  backup: {
    /**
     * @default true
     */
    enabled: boolean;
    /**
     * @default ".rtpl-backup"
     */
    path: string;
  };
};

export type InRtplConfg = Partial<RtplConfig>;

const defaults: RtplConfig = {
  root: ".",
  template: {
    path: "rtpl.*",
  },
  lock: {
    path: "rtpl-lock.json",
  },
  resources: {
    path: "resources",
  },
  secrets: {
    enabled: true,
    path: "rtpl-secrets.json",
  },
  backup: {
    enabled: true,
    path: ".rtpl-backup",
  },
};

export function defineConfig(config: InRtplConfg): InRtplConfg {
  return config;
}

export async function parseConfigFile(inPath: string): Promise<RtplConfig> {
  const paths = expandPaths(inPath, { js: true, ts: true, json: true });
  const path = await findPath(paths);
  const inConfig = path ? await readAnyFile(resolve(path)) : undefined;
  const config: RtplConfig = merge(
    structuredClone(defaults),
    structuredClone(inConfig),
  );
  if (!config.root || config.root === ".") config.root = dirname(inPath);
  config.root = resolve(config.root);
  config.template.path = join(config.root, config.template.path);
  config.lock.path = join(config.root, config.lock.path);
  config.resources.path = join(config.root, config.resources.path);
  config.backup.path = join(config.root, config.backup.path);
  config.secrets.path = join(config.root, config.secrets.path);
  return config;
}
