import { GlobalOptions, pkg } from "../cli.js";
import * as lock from "../utils/self/lock.js";
import chalk from "chalk";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { stringify } from "yaml";

export type BackupOptions = GlobalOptions & {
  /**
   * @default true
   */
  log?: boolean;
};

export default async function backup(options: BackupOptions) {
  const log = options.log ?? true;
  const lockData = (lock.parseFile(options.lockPath, true) ?? {
    templates: {},
  }) as any as lock.LockData<{ contents: string }>;

  let files = 0;

  for (const name in lockData.templates) {
    const tpl = lockData.templates[name];
    for (const path in tpl.files) {
      files++;
      tpl.files[path].contents = (await readFile(path)).toString();
    }
  }

  const yaml = stringify(lockData, { version: "1.1" });

  const header = [
    `# version: ${pkg.version}`,
    `# date: ${new Date().toISOString()}`,
    `# files: ${files}`,
    `# checksum: ${createHash("sha1").update(yaml).digest("hex")}`,
  ];

  const file = [...header, yaml].join("\n");
  const path = join(options.backupPath, `${Date.now()}.yaml`);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, file);

  if (log) {
    for (const line of [...header, `# path: ${path}`])
      console.info(chalk.gray(line));
    console.info();
    console.info(chalk.green(`Backup created successfully.`));
  }
  return { exitCode: 0 };
}
