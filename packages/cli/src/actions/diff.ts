import { GlobalOptions } from "../cli.js";
import type { AbstractRes } from "../resources/AbstractRes.js";
import { readIfExists } from "../utils/fs.js";
import { parseTplConfigFile } from "../utils/self/config.js";
import {
  ActionEnum,
  getFileActions,
  logAction,
} from "../utils/self/install.js";
import { diffLines } from "diff";
import { TplLock } from "../utils/self/lock.js";
import { styleText } from "node:util";
import { createTplResources } from "../utils/self/resolve.js";

export type DiffOptions = GlobalOptions & {
  showAll: boolean;
  hideLines: boolean;
  lines: number;
};
export default async function diff(options: DiffOptions) {
  const config = await parseTplConfigFile(options.config);
  const { resources } = await createTplResources(config);

  let changes = 0;
  const lock = new TplLock(config.paths.lock);
  const lockData = await lock.read();
  const actions = await getFileActions(config, resources, lockData);
  for (const action of actions) {
    if (action.type === ActionEnum.NONE) continue;
    logAction(action.type, action.relativePath);
    changes++;
    if (action.type === ActionEnum.ADD || action.type === ActionEnum.UPDATE) {
      await showDiff(resources[action.resourcePath], action.fsPath, options);
    }
  }

  if (!changes) process.stderr.write(`${styleText("gray", "No changes")}\n`);
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
    console.info(styleText("cyan", path));
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
        result = styleText("green", subline);
      } else if (line.removed) {
        removed++;
        result = styleText("red", subline);
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
          `${styleText("gray", lineIndexStr)} ${styleText("white", "|")} ${result}`,
        );
      }
    }
  }
}
