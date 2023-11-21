import { GlobalOptions } from "../cli.js";
import { AbstractRes } from "../index.js";
import { readIfExists } from "../utils/fs.js";
import { parseConfigFile } from "../utils/self/config.js";
import {
  ActionEnum,
  getFileActions,
  logAction,
} from "../utils/self/install.js";
import { parseLockFile } from "../utils/self/lock.js";
import { parseTplFile, resolveTpl } from "../utils/self/resolve.js";
import chalk from "chalk";
import { diffLines } from "diff";

export type DiffOptions = GlobalOptions & {
  showAll: boolean;
  hideLines: boolean;
  lines: number;
};
export default async function diff(options: DiffOptions) {
  const config = await parseConfigFile(options.config);
  const tpl = await parseTplFile(config.template.path);
  const { resources } = await resolveTpl(tpl, {
    config,
    filter: options.filter,
  });
  let changes = 0;
  const lockData = await parseLockFile(config.lock.path);
  const selfLockData = lockData.templates[tpl.config.name] || {
    files: {},
    dirs: {},
  };
  const actions = await getFileActions(resources, selfLockData);
  for (const path in actions) {
    const action = actions[path];
    if (action.type === ActionEnum.NONE) continue;
    logAction(action.type, path);
    changes++;
    if (action.type === ActionEnum.ADD || action.type === ActionEnum.UPDATE) {
      await showDiff(resources[path], path, options);
    }
  }

  if (!changes) process.stderr.write(`${chalk.grey("No changes")}\n`);
  return { exitCode: changes ? 1 : 0, changes };
}

async function showDiff(
  res: AbstractRes<any, any>,
  path: string,
  options: DiffOptions,
) {
  let resValue: string;
  try {
    resValue = res.toString();
  } catch (error) {
    console.info("\x1b[36m%s\x1b[0m", path);
    throw error;
  }
  const old = (await readIfExists(path))?.toString();
  const lines = diffLines(old ?? "", resValue);
  const haveChanges =
    typeof old !== "string" || lines.some((line) => line.added || line.removed);

  if (!options.showAll && !haveChanges) return;

  let lineIndex = 0;
  let removed = 0;

  for (const line of lines) {
    const sublines = line.value.split(/\r?\n/).slice(0, line.count);
    for (const subline of sublines) {
      ++lineIndex;
      let result: string;

      if (line.added) {
        lineIndex -= removed;
        removed = 0;
        result = chalk.green(subline);
      } else if (line.removed) {
        removed++;
        result = chalk.red(subline);
      } else {
        result = subline;
      }

      const haveLineChanges = line.added || line.removed;
      if (options.lines === 1 && !haveLineChanges) continue;

      if (options.hideLines) {
        console.info(result);
      } else {
        const lineIndexStr = lineIndex.toString().padStart(3, " ");
        console.info(
          `${chalk.grey(lineIndexStr)} ${chalk.white("|")} ${result}`,
        );
      }
    }
  }
}
