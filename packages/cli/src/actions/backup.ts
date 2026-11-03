import { styleText } from "util";
import { GlobalOptions, pkg } from "../cli.js";
import {
  createBackupFile,
  deleteOldBackups,
  serializeBackupData,
} from "../utils/self/backup.js";
import { parseTplConfigFile } from "../utils/self/config.js";
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
  const config = await parseTplConfigFile(options.config);
  const backupData = await createBackupFile(config);

  let files = 0;

  for (const path in backupData.lock.files) {
    files++;
    backupData.lock.files[path].contents = (await readFile(path)).toString();
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
  const path = join(config.paths.backup, `${name}.yaml`);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, file);

  const removed = await deleteOldBackups(config);

  if (log) {
    for (const line of [...header, `# path: ${path}`])
      console.info(styleText("gray", line));
    console.info();
    console.info(styleText("green", `Backup created successfully.`));
    if (removed.length) {
      console.info(
        styleText("green", `Old backups deleted: ${removed.length}`),
      );
    }
  }
  return { exitCode: 0 };
}
