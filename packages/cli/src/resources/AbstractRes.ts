import { parseId, parseMode } from "../utils/attrs.js";
import { Secrets } from "../utils/self/secrets.js";
import { ResPath, setResPath } from "./ResPath.js";

export type ResDataObject<TData> = TData extends undefined
  ? { data?: TData }
  : { data: TData };

export type ResBaseOptions<TData> = { name?: string } & ResDataObject<TData>;

export type ResAttrs = {
  /**
   * File mode applied on install (`0o640`, `"0640"` or `"640"`).
   * Not managed when undefined.
   */
  mode?: number | string;
  /**
   * File owner (user name or uid). Not managed when undefined.
   */
  owner?: string | number;
  /**
   * File group (group name or gid). Not managed when undefined.
   */
  group?: string | number;
};

export type ResOptions<TData> = ResBaseOptions<TData> & ResAttrs;

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
  /**
   * Octal file mode. Not managed when undefined.
   */
  readonly mode: number | undefined;
  readonly owner: string | number | undefined;
  readonly group: string | number | undefined;
  readonly path = new ResPath();
  constructor(options: ResOptions<TData>) {
    this.name = options.name;
    this.data = options.data as TData;
    this.mode = parseMode(options.mode);
    this.owner = parseId("user", options.owner);
    this.group = parseId("group", options.group);
  }
  abstract toString(): string;
  protected async onReady(path: string, ctx: ResReadyContext) {
    setResPath(this.path, path);
  }
}
