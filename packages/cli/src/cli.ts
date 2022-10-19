import check from "./actions/check";
import diff from "./actions/diff";
import init from "./actions/init";
import install from "./actions/install";
import options from "./actions/options";
import render from "./actions/render";
import { resolveUnixPath } from "./utils/fs";
import { parseStringListValue } from "./utils/string";
import chalk from "chalk";
import { program } from "commander";
import { resolve } from "path";

export type GlobalOptions = {
  templatePath: string;
  outPath: string;
  lockPath: string;
  filter: string[] | undefined;
};

function getGlobalOptions(): GlobalOptions {
  const options = program.opts() as GlobalOptions;
  options.templatePath = resolveUnixPath(options.templatePath);
  options.outPath = resolve(options.outPath);
  options.lockPath = resolve(options.lockPath);
  return options;
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

export default (defaultOptions?: Partial<GlobalOptions>) => {
  const pkg = require(`${__dirname}/package.json`);
  program.name("rtpl");
  program.version(pkg.version);
  program
    .option("-t,--template-path <value>", "template file path", ".")
    .option(
      "-l,--lock-path <value>",
      "lock file path",
      defaultOptions?.lockPath ?? "rtpl-lock.json"
    )
    .option("-o,--out-path <value>", "out path", ".")
    .option(
      "-f,--filter <patterns>",
      "patterns filter",
      parseStringListValue,
      defaultOptions?.filter ?? undefined
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
    .option("-i,--interactive", "interactive mode", false)
    .option(
      "-l,--lines <value>",
      "diff context lines (interactive mode)",
      Number,
      1
    )
    .action(makeAction(install));
  program
    .command("options")
    .alias("o")
    .option("--format <type>", "Output format (json, js, yaml)", "json")
    .action(makeAction(options));
  program.command("render").alias("r").action(makeAction(render));
  program.parse(process.argv);
};
