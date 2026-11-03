import { findPath, readAnyFile, DeletionPolicyOptions } from "../fs.js";
import { expandPaths } from "../path.js";
import { DeepPartial, MaybePromise } from "../ts.js";
import { join, resolve } from "path";
import { Tpl } from "./tpl.js";

export type TplConfig = {
  root: string;
  templates: MaybePromise<Tpl<any, any>>[];
  /**
   * @default "./resources"
   */
  resourcesDir: string;
  resourcePathAllowlist?: string[];
  /**
   * @default "./.rtpl"
   */
  dataDir: string;

  secrets: {
    /**
     * @default true
     */
    enabled: boolean;
  };
  backup: {
    /**
     * @default true
     */
    enabled: boolean;
    /**
     * @default {"keepLast": 25}
     */
    deletionPolicy?: false | DeletionPolicyOptions;
  };
};

export type TplConfigPaths = {
  cwd: string;
  root: string;
  resources: string;
  data: string;
  backup: string;
  secrets: string;
  lock: string;
};

export type ResolvedTplConfig = TplConfig & { paths: TplConfigPaths };

export type InTplConfig = DeepPartial<TplConfig>;

export const defaultsTplConfig = {
  root: ".",
  dataDir: ".rtpl",
  resourcesDir: "resources",
  secrets: {
    enabled: true,
  },
  backup: {
    enabled: true,
    deletionPolicy: {
      keepLast: 25,
    },
  },
} satisfies InTplConfig;

export function defineTplConfig(config: InTplConfig): TplConfig {
  return {
    ...defaultsTplConfig,
    ...config,
    backup: {
      ...defaultsTplConfig.backup,
      ...config.backup,
      deletionPolicy: {
        ...defaultsTplConfig.backup.deletionPolicy,
        ...config.backup?.deletionPolicy,
      },
    },
    secrets: {
      ...defaultsTplConfig.secrets,
      ...config.secrets,
    },
  } as any;
}

export function resolveTplConfig(config: TplConfig) {
  const root =
    config.root === "." || !config.root ? resolve(".") : resolve(config.root);
  return {
    ...config,
    paths: {
      cwd: process.env.INIT_CWD ?? process.cwd(),
      root: root,
      resources: join(root, config.resourcesDir),
      data: join(root, config.dataDir),
      backup: join(root, config.dataDir, "backup"),
      secrets: join(root, config.dataDir, "rtpl-secrets.json"),
      lock: join(root, config.dataDir, "rtpl-lock.json"),
    },
  };
}
export async function parseTplConfigFile(
  inPath: string,
  options?: { root: string },
): Promise<ResolvedTplConfig> {
  const paths = expandPaths(inPath, { js: true, ts: true, json: true });
  const path = await findPath(paths);
  const inConfig = path ? await readAnyFile(resolve(path)) : undefined;
  const config: TplConfig = {
    templates: [],
    ...defaultsTplConfig,
    ...inConfig,
    backup: {
      ...defaultsTplConfig.backup,
      ...inConfig?.backup,
    },
    secrets: {
      ...defaultsTplConfig.secrets,
      ...inConfig?.secrets,
    },
  };
  return resolveTplConfig({
    ...config,
    ...(options?.root && { root: options.root }),
  });
}
