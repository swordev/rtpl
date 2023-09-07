import { GlobalOptions } from "../cli";
import { confirmPrompt } from "../utils/cli";
import { LockData } from "../utils/self/lock";
import chalk from "chalk";
import { existsSync } from "fs";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { relative } from "path";
import { parse } from "yaml";

export type RestoreOptions = GlobalOptions & {
  input: string;
};

async function findFileByIndex(path: string, index: number) {
  const id = (await readdir(path))
    .filter((f) => /^\d+\.yaml$/.test(f))
    .map((f) => Number(f.split(".")[0]))
    .sort((a, b) => a - b)
    .at(index);
  return id ? `${id}.yaml` : undefined;
}

async function findBackup(backupPath: string, rawInput: string | number) {
  const input = /^-\d+$/.test(rawInput.toString())
    ? Number(rawInput)
    : rawInput;

  if (typeof input === "number" && input < 0) {
    const fileName = await findFileByIndex(backupPath, input);
    if (!fileName) throw new Error(`Backup id not found`);
    return `${backupPath}/${fileName}`;
  }

  let output = input.toString();
  const isFileName = !output.includes("/") && !output.includes("\\");
  const hasExtension = output.includes(".");
  if (!isFileName) return output;
  if (!hasExtension) output += ".yaml";
  return `${backupPath}/${output}`;
}

const normalizePath = (path: string) =>
  relative(process.cwd(), path).replace(/\\/g, "/");

export default async function restore(options: RestoreOptions) {
  const path = normalizePath(
    await findBackup(options.backupPath, options.input),
  );
  const yaml = (await readFile(path)).toString();
  const lockData = parse(yaml, { version: "1.1" }) as LockData<{
    contents?: string;
  }>;

  console.info(chalk.green("Restoring backup..."));
  console.info();
  console.info(
    chalk.grey(
      [
        ...yaml.split(/\r?\n/).filter((v) => v.startsWith("#")),
        `# path: ${path}`,
      ].join("\n"),
    ),
  );

  const errorFiles: string[] = [];

  const logError = (path: string) => {
    if (!errorFiles.length) {
      console.error();
      console.error(chalk.red(`The following files already exist:`));
    }
    path = normalizePath(path);
    console.error(chalk.red(`- ${path}`));
    errorFiles.push(path);
  };

  if (existsSync(options.lockPath)) logError(options.lockPath);

  for (const name in lockData.templates) {
    const tpl = lockData.templates[name];
    for (const path in tpl.files) {
      if (existsSync(path)) logError(path);
    }
  }

  if (errorFiles.length) console.info();
  if (
    errorFiles.length &&
    !(await confirmPrompt("Do you want to overwrite the files?", false))
  )
    return { exitCode: 1 };

  const dirs = new Set<string>();
  for (const name in lockData.templates) {
    const tpl = lockData.templates[name];
    for (const path in tpl.dirs) {
      if (dirs.has(path)) continue;
      dirs.add(path);
      await mkdir(path, { recursive: true });
    }
    for (const path in tpl.files) {
      const contents = tpl.files[path].contents;
      if (typeof contents === "string") await writeFile(path, contents);
      delete tpl.files[path].contents;
    }
  }

  await writeFile(options.lockPath, JSON.stringify(lockData, null, 2));

  console.info();
  console.info(chalk.green("Backup restored successfully."));

  return { exitCode: 0 };
}
