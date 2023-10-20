import { DirData, DirRes } from "../../../src/index.js";
import { AbstractRes } from "../../../src/resources/AbstractRes.js";
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
    expect(normalize(stack.getFileName())).toBe(import.meta.url);
    expect(typeof stack.getLineNumber() == "number").toBe(true);
  });
});

describe("AbstractRes.isInstance", () => {
  it("with custom DirRes", () => {
    class Dir<T extends DirData> extends DirRes<T> {}
    expect(DirRes.isInstance(new Dir({}))).toBeTruthy();
  });

  it("with custom resource", () => {
    class CustomRes extends AbstractRes {
      toString() {
        return "";
      }
    }
    const r1 = new CustomRes({});
    const r2 = new StringRes({});

    expect(CustomRes.isInstance(r2)).toBeFalsy();

    expect(CustomRes.isInstance(r1)).toBeTruthy();
    expect(AbstractRes.isInstance(r1)).toBeTruthy();
    expect(StringRes.isInstance(r2)).toBeTruthy();
  });
  it("returns true", () => {
    expect(AbstractRes.isInstance(new StringRes({}))).toBeTruthy();
  });
  it("returns false", () => {
    expect(AbstractRes.isInstance(null)).toBeFalsy();
  });
});
