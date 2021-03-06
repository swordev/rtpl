import { GlobalOptions } from "../cli";
import { readIfExists } from "../utils/fs";
import { resolve } from "../utils/self/resolve";
import chalk from "chalk";
import { diffLines } from "diff";

export type DiffOptions = GlobalOptions & {
  showAll: boolean;
  hideLines: boolean;
  context: number;
};
export default async function diff(options: DiffOptions) {
  const allModels = await resolve({
    filter: options.filter,
    configPath: options.configPath,
    lockPath: options.lockPath,
    outPath: options.outPath,
  });
  let someChange = false;
  for (const name in allModels) {
    const models = allModels[name];
    for (const path in models) {
      const model = models[path];
      const old = (await readIfExists(path))?.toString();
      const lines = diffLines(old ?? "", model.toString());
      const haveChanges =
        typeof old !== "string" ||
        lines.some((line) => line.added || line.removed);

      if (haveChanges) someChange = true;
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
          if (options.context === 1 && !haveLineChanges) continue;

          if (options.hideLines) {
            console.info(result);
          } else {
            const lineIndexStr = lineIndex.toString().padStart(3, " ");
            console.info(
              `${chalk.grey(lineIndexStr)} ${chalk.white("|")} ${result}`
            );
          }
        }
      }
      console.info();
    }
  }
  if (!someChange) process.stderr.write(`${chalk.grey("No changes")}\n`);
  return { exitCode: someChange ? 1 : 0 };
}
