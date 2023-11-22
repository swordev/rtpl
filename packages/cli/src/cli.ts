import backup from "./actions/backup.js";
import check from "./actions/check.js";
import diff from "./actions/diff.js";
import init from "./actions/init.js";
import install from "./actions/install.js";
import options from "./actions/options.js";
import render from "./actions/render.js";
import repairLock from "./actions/repair-lock.js";
import restore from "./actions/restore.js";
import { GlobalOptions } from "./utils/self/options.js";
import { parseStringListValue } from "./utils/string.js";
import chalk from "chalk";
import { program } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

export type { GlobalOptions };

function getGlobalOptions(): GlobalOptions {
  return program.opts() as GlobalOptions;
}

function makeAction(cb: (options: any) => Promise<any>) {
  return async (options: Record<string, unknown>) => {
    try {
      const result: {
        exitCode?: number;
      } = await cb({ ...getGlobalOptions(), ...options });
      if (typeof result?.exitCode === "number") process.exit(result.exitCode);
    } catch (error) {
      console.error(chalk.red((error as Error).stack));
      process.exit(2);
    }
  };
}

const $dirname = fileURLToPath(new URL(".", import.meta.url));

export const pkg = JSON.parse(
  readFileSync(`${$dirname}/../package.json`).toString(),
);

export default (defaultOptions?: Partial<GlobalOptions>) => {
  program.name("rtpl");
  program.version(pkg.version);
  program
    .option("-c,--config <path>", "config file path", "./rtpl-config.*")
    .option(
      "-f,--filter <patterns>",
      "patterns filter",
      parseStringListValue,
      defaultOptions?.filter ?? undefined,
    );
  program.command("check").action(makeAction(check));
  program
    .command("diff")
    .alias("d")
    .option("-a,--show-all", "show all")
    .option("--hide-lines", "hide lines", false)
    .option("--lines <value>", "diff context lines", Number, 1)
    .action(makeAction(diff));
  program.command("init").action(makeAction(init));
  program
    .command("install")
    .alias("i")
    .option("-d,--dry-run", "dry run", false)
    .option("--no-backup", "no backup", false)
    .option("-c,--confirm", "confirm changes", false)
    .option(
      "-l,--lines <value>",
      "diff context lines (interactive mode)",
      Number,
      1,
    )
    .action(makeAction(install));
  program
    .command("options")
    .alias("o")
    .option("--format <type>", "Output format (json, yaml)", "json")
    .action(makeAction(options));
  program.command("render").alias("r").action(makeAction(render));
  program.command("repair-lock").action(makeAction(repairLock));
  program.command("backup").alias("b").action(makeAction(backup));
  program
    .command("restore")
    .option(
      "-i,--input <value>",
      "path, negative index or file without extension",
      "-1",
    )
    .action(makeAction(restore));
  program.parse(process.argv);
};
