import { randomBytes } from "crypto";

export const upperAlphaCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const lowerAlphaCharset = "abcdefghijklmnopqrstuvwxyz";
export const numberCharset = "0123456789";
export const alphaCharset = `${upperAlphaCharset}${lowerAlphaCharset}`;
export const alphaNumberCharset = `${alphaCharset}${numberCharset}`;

export function randomString(
  length: number,
  charset: string = alphaNumberCharset,
) {
  let result = "";
  if (charset.length > 255) throw new Error("Charset length is over 255 bytes");
  const random = randomBytes(length);
  for (let index = 0; index < length; ++index) {
    result += charset[random[index] % charset.length];
  }
  return result;
}
