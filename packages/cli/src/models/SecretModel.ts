import {
  alphaCharset,
  alphaNumberCharset,
  lowerAlphaCharset,
  numberCharset,
  randomString,
  upperAlphaCharset,
} from "../utils/crypto";
import { readIfExists } from "../utils/fs";
import {
  AbstractModel,
  Data,
  DelayedValue,
  setDelayedValue,
  TypeEnum,
} from "./AbstractModel";

export type SecretSpec = {
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

export class SecretModel extends AbstractModel<SecretSpec | undefined> {
  protected static _tplModelType = TypeEnum.Secret;
  private value: DelayedValue<string>;
  readonly hasNewValue: DelayedValue<boolean>;
  constructor(readonly data: Data<SecretSpec>) {
    super(data);
    this.value = new DelayedValue(undefined, this.lastStacks);
    this.hasNewValue = new DelayedValue(undefined, this.lastStacks);
  }
  toJSON() {
    return this.toString();
  }
  toString() {
    return this.value.toString();
  }
  async onReady(path: string) {
    await super.onReady(path);
    const value = (await readIfExists(path))?.toString();
    const hasNewValue = value ? false : true;
    const generate = this.spec?.generate ?? true;
    let endValue = value;
    if (!endValue && generate) {
      const length = this.spec?.length ?? 16;
      const inCharset = this.spec?.charset ?? "alpha-number";
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
    const auxValue = await this.spec?.onReady?.({
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
