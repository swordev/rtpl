export type GlobalOptions = {
  templatePath: string;
  backupPath: string;
  outPath: string;
  lockPath: string;
  filter: string[] | undefined;
};

export function splitGlobalOptions<T extends GlobalOptions>(
  input: T,
): [GlobalOptions, Omit<T, keyof GlobalOptions>] {
  const { backupPath, filter, lockPath, outPath, templatePath, ...others } =
    input;
  return [{ backupPath, filter, lockPath, outPath, templatePath }, others];
}
