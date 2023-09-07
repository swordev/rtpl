import { GlobalOptions } from "../cli";
import { readIfExists } from "../utils/fs";
import { readTplFile, resolveTpl } from "../utils/self/resolve";
import chalk from "chalk";
import { diffLines } from "diff";

export type DiffOptions = GlobalOptions & {
  showAll: boolean;
  hideLines: boolean;
  lines: number;
};
export default async function diff(options: DiffOptions) {
  const tpl = await readTplFile(options.templatePath);
  const resources = await resolveTpl(tpl, {
    filter: options.filter,
    lockPath: options.lockPath,
    outPath: options.outPath,
  });
  let changes = 0;
  for (const path in resources) {
    const res = resources[path];
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
      typeof old !== "string" ||
      lines.some((line) => line.added || line.removed);

    if (haveChanges) changes++;
    if (!options.showAll && !haveChanges) continue;
    console.info("\x1b[36m%s\x1b[0m", path);

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
    console.info();
  }

  if (!changes) process.stderr.write(`${chalk.grey("No changes")}\n`);
  return { exitCode: changes ? 1 : 0, changes };
}
