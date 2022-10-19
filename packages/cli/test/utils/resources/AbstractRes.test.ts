import { AbstractRes } from "../../../src/resources/AbstractRes";
import { it, describe, expect } from "vitest";

class StringRes extends AbstractRes<string | undefined> {
  toString(): string {
    return this.data ?? "";
  }
}

describe("AbstractRes.lastStacks", () => {
  it("returns current source", () => {
    const [stack] = new StringRes({}).lastStacks;
    const normalize = (v: string) => v.replaceAll("\\", "/");
    expect(normalize(stack.getFileName())).toBe(normalize(__filename));
    expect(typeof stack.getLineNumber() == "number").toBe(true);
  });
});
