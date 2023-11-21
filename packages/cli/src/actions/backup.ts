import { GlobalOptions, pkg } from "../cli.js";
import { createBackupFile, serializeBackupData } from "../utils/self/backup.js";
import { parseConfigFile } from "../utils/self/config.js";
import chalk from "chalk";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

export type BackupOptions = GlobalOptions & {
  /**
   * @default true
   */
  log?: boolean;
};

export default async function backup(options: BackupOptions) {
  const log = options.log ?? true;
  const config = await parseConfigFile(options.config);
  const backupData = await createBackupFile(config);

  let files = 0;

  for (const name in backupData.templates) {
    const tpl = backupData.templates[name];
    for (const path in tpl.files) {
      files++;
      tpl.files[path].contents = (await readFile(path)).toString();
    }
  }

  const backupDataText = serializeBackupData(backupData);

  const name = Date.now();
  const header = [
    `# name: ${name}`,
    `# date: ${new Date().toISOString()}`,
    `# files: ${files}`,
    `# version: ${pkg.version}`,
    `# checksum: ${createHash("sha1").update(backupDataText).digest("hex")}`,
  ];

  const file = [...header, backupDataText].join("\n");
  const path = join(config.backup.path, `${name}.yaml`);

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
