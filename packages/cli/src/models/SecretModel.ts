import {
  alphaCharset,
  alphaNumberCharset,
  lowerAlphaCharset,
  numberCharset,
  randomString,
  upperAlphaCharset,
} from "../utils/crypto";
import { readIfExists } from "../utils/fs";
import { AbstractModel, Data, DelayedValue, TypeEnum } from "./AbstractModel";
import { Writable } from "ts-essentials";

export type SecretSpec = {
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
};

export class SecretModel extends AbstractModel<SecretSpec | undefined> {
  protected static _tplModelType = TypeEnum.Secret;
  private value: DelayedValue<string>;
  constructor(readonly data: Data<SecretSpec>) {
    super(data);
    this.value = new DelayedValue(undefined, this.lastStacks);
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
    let newValue = value;
    if (!newValue) {
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
      newValue = randomString(length, charset);
    }
    (this.value as Writable<typeof this.value>).value = newValue;
  }
}
