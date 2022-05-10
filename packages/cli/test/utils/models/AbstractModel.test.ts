import { AbstractModel } from "../../../src/models/AbstractModel";

class StringModel extends AbstractModel<string | undefined> {
  toString(): string {
    return this.spec ?? "";
  }
}

describe("AbstractModel.lastStacks", () => {
  it("returns current source", () => {
    const [stack] = new StringModel({}).lastStacks;
    expect(stack.getFileName()).toBe(__filename);
    expect(typeof stack.getLineNumber() == "number").toBe(true);
  });
});
