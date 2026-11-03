import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

export type LockDataFile<TFile = undefined> = {
  creationDate: string;
  updatingDate?: string;
} & (undefined extends TFile ? {} : TFile);

export type LockData<TFile = undefined> = {
  dirs: Record<string, Pick<LockDataFile, "creationDate">>;
  files: Record<string, LockDataFile<TFile>>;
};

export class TplLock {
  constructor(readonly path: string) {}
  async read<TFile = undefined>(): Promise<LockData<TFile>> {
    try {
      const json = (await readFile(this.path)).toString();
      return JSON.parse(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return {
          dirs: {},
          files: {},
        };
      throw error;
    }
  }
  async write(data: LockData<any>) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(data, null, 2));
  }
}
