import { AbstractModel } from "../../../src/models/AbstractModel";
import { it, describe, expect } from "vitest";

class StringModel extends AbstractModel<string | undefined> {
  toString(): string {
    return this.spec ?? "";
  }
}

describe("AbstractModel.lastStacks", () => {
  it("returns current source", () => {
    const [stack] = new StringModel({}).lastStacks;
    const normalize = (v: string) => v.replaceAll("\\", "/");
    expect(normalize(stack.getFileName())).toBe(normalize(__filename));
    expect(typeof stack.getLineNumber() == "number").toBe(true);
  });
});
