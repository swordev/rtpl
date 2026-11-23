import { Secrets } from "../utils/self/secrets.js";
import { ResPath, setResPath } from "./ResPath.js";

export type ResDataObject<TData> = TData extends undefined
  ? { data?: TData }
  : { data: TData };

export type ResOptions<TData> = { name?: string } & ResDataObject<TData>;

export type ResReadyContext = {
  root: string;
  secrets: Secrets | undefined;
  initialSecrets: boolean;
};

export abstract class AbstractRes<TData = any> {
  /**
   * File name. Defaults to the resource key (plus `extension`).
   */
  readonly name: string | undefined;
  /**
   * Extension appended to the resource key when `name` is not defined.
   */
  readonly extension?: string;
  public data: TData;
  readonly path = new ResPath();
  constructor(options: ResOptions<TData>) {
    this.name = options.name;
    this.data = options.data as TData;
  }
  abstract toString(): string;
  protected async onReady(path: string, ctx: ResReadyContext) {
    setResPath(this.path, path);
  }
}
