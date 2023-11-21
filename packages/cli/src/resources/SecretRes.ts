import {
  alphaCharset,
  alphaNumberCharset,
  lowerAlphaCharset,
  numberCharset,
  randomString,
  upperAlphaCharset,
} from "../utils/crypto.js";
import { readIfExists } from "../utils/fs.js";
import {
  AbstractRes,
  ResOptions,
  ResReadyContext,
  ResType,
} from "./AbstractRes.js";
import { DelayedValue, setDelayedValue } from "./DelayedValue.js";

export type SecretData = {
  /**
   * @default true
   */
  generate?: boolean;
  /**
   * @default 'alpha-number'
   */
  charset?:
    | "number"
    | "upperAlpha"
    | "lowerAlpha"
    | "alpha"
    | "alpha-number"
    | {
        value: string;
      };
  /**
   * @default 16
   */
  length?: number;
  onReady?: (data: {
    path: string;
    prev: string | undefined;
    current: string | undefined;
  }) => Promise<string | undefined>;
};

export class SecretRes extends AbstractRes<
  ResType.Secret,
  SecretData | undefined
> {
  protected static override type = ResType.Secret;
  protected override readonly type = ResType.Secret;
  private value: DelayedValue<string>;
  readonly hasNewValue: DelayedValue<boolean>;
  constructor(readonly options: ResOptions<SecretData | undefined>) {
    super(options);
    this.value = new DelayedValue(undefined, this.lastStacks);
    this.hasNewValue = new DelayedValue(undefined, this.lastStacks);
  }
  override getDefaultExtension() {
    return "secret";
  }
  toJSON() {
    return this.toString();
  }
  override toString() {
    return this.value.toString();
  }
  override async onReady(path: string, ctx: ResReadyContext) {
    await super.onReady(path, ctx);
    const prevFile = (await readIfExists(path))?.toString();
    const prev = ctx.data.secrets
      ? ctx.data.secrets[path] ??
        (ctx.data.initialSecrets ? prevFile : undefined)
      : undefined;
    const $generate = this.data?.generate ?? true;
    let current = prev ?? ($generate ? generate(this.data) : undefined);
    const custom = await this.data?.onReady?.({ path, prev, current });
    if (typeof custom === "string") current = custom;
    if (typeof current !== "string") throw new Error(`Secret is empty`);
    if (ctx.data.secrets) ctx.data.secrets[path] = current;
    setDelayedValue(this.value, current);
    setDelayedValue(this.hasNewValue, current !== prevFile);
  }
}

function generate(data: SecretData = {}) {
  const length = data.length ?? 16;
  const inCharset = data.charset ?? "alpha-number";
  const charsetMap = {
    number: numberCharset,
    lowerAlpha: lowerAlphaCharset,
    upperAlpha: upperAlphaCharset,
    alpha: alphaCharset,
    "alpha-number": alphaNumberCharset,
  };
  const charset =
    typeof inCharset === "string" ? charsetMap[inCharset] : inCharset.value;
  if (typeof charset !== "string") throw new Error(`Charset is not defined`);
  if (charset.length <= 10) {
    throw new Error(`Charset length is too small`);
  }
  return randomString(length, charset);
}
