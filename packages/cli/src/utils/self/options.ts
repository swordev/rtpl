export type GlobalOptions = {
  config: string;
  filter: string[] | undefined;
};

export function splitGlobalOptions<T extends GlobalOptions>(
  input: T,
): [GlobalOptions, Omit<T, keyof GlobalOptions>] {
  const { config, filter, ...others } = input;
  return [{ config, filter }, others];
}
