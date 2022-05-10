import { GlobalOptions } from "../cli";
import { checkPath } from "../utils/fs";
import chalk from "chalk";
import { writeFile } from "fs/promises";
import { join } from "path";

export type CheckOptions = GlobalOptions;

export default async function init(options: CheckOptions) {
  const code = `
import { defineConfig } from "@rtpl/cli";

export default defineConfig({
  templates: [],
});
`;
  const base = `rtpl.config.ts`;
  const path = join(process.cwd(), base);
  if (await checkPath(path)) {
    console.error(`[${chalk.yellow("!")}] "${base}" already exists`);
    return { exitCode: 1 };
  }
  await writeFile(path, code);
}
