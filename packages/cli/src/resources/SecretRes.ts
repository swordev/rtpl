import {
  alphaCharset,
  alphaNumberCharset,
  lowerAlphaCharset,
  numberCharset,
  randomString,
  upperAlphaCharset,
} from "../utils/crypto.js";
import { readIfExists } from "../utils/fs.js";
import { AbstractRes, ResOptions, ResType } from "./AbstractRes.js";
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
  constructor(readonly options: ResOptions<SecretData>) {
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
  override async onReady(path: string) {
    await super.onReady(path);
    const value = (await readIfExists(path))?.toString();
    const hasNewValue = value ? false : true;
    const generate = this.data?.generate ?? true;
    let endValue = value;
    if (!endValue && generate) {
      const length = this.data?.length ?? 16;
      const inCharset = this.data?.charset ?? "alpha-number";
      const charsetMap = {
        number: numberCharset,
        lowerAlpha: lowerAlphaCharset,
        upperAlpha: upperAlphaCharset,
        alpha: alphaCharset,
        "alpha-number": alphaNumberCharset,
      };
      const charset =
        typeof inCharset === "string" ? charsetMap[inCharset] : inCharset.value;
      if (typeof charset !== "string")
        throw new Error(`Charset is not defined`);
      if (charset.length <= 10) {
        throw new Error(`Charset length is too small`);
      }
      endValue = randomString(length, charset);
    }
    const auxValue = await this.data?.onReady?.({
      path,
      prev: value,
      current: endValue,
    });
    if (typeof auxValue === "string") endValue = auxValue;
    if (typeof endValue !== "string") throw new Error(`Secret is empty`);
    setDelayedValue(this.value, endValue);
    setDelayedValue(this.hasNewValue, hasNewValue);
  }
}
