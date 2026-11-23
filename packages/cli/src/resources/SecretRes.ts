import {
  alphaCharset,
  alphaNumberCharset,
  lowerAlphaCharset,
  numberCharset,
  randomString,
  upperAlphaCharset,
} from "../utils/crypto.js";
import { readIfExists } from "../utils/fs.js";
import { AbstractRes, ResReadyContext } from "./AbstractRes.js";
import { DelayedValue, setDelayedValue } from "./DelayedValue.js";
import { join } from "path";

export type SecretData = {
  value?: string;
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

export class SecretRes extends AbstractRes<SecretData | undefined> {
  private readonly value = new DelayedValue<string>();
  readonly hasNewValue = new DelayedValue<boolean>();
  toJSON() {
    return this.toString();
  }
  override toString() {
    return this.value.toString();
  }
  override readonly extension = "secret";
  protected override async onReady(path: string, ctx: ResReadyContext) {
    await super.onReady(path, ctx);
    const prevFile = (await readIfExists(join(ctx.root, path)))?.toString();
    const prev =
      typeof this.data?.value === "string"
        ? this.data.value
        : ctx.secrets
          ? (ctx.secrets[path] ?? (ctx.initialSecrets ? prevFile : undefined))
          : undefined;
    const $generate = this.data?.generate ?? true;
    let current = prev ?? ($generate ? generate(this.data) : undefined);
    const custom = await this.data?.onReady?.({ path, prev, current });
    if (typeof custom === "string") current = custom;
    if (typeof current !== "string") throw new Error(`Secret is empty`);
    if (ctx.secrets) ctx.secrets[path] = current;
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
