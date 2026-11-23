import { EnvRes } from "../../../src/resources/EnvRes.js";
import { it, describe, expect } from "vitest";

describe("EnvRes.toString", () => {
  it("resolves all values", () => {
    class C {
      toString() {
        return this.toJSON();
      }
      toJSON() {
        return "3";
      }
    }
    const res = new EnvRes({
      data: {
        a: () => 1,
        b: 2,
        c: new C(),
        d: () => new C(),
      },
    });
    expect(res.toString()).toBe(["a=1", "b=2", "c=3", "d=3"].join("\n"));
  });
});

describe("EnvRes undefined values", () => {
  it("skips undefined values", () => {
    const res = new EnvRes({
      data: { A: "1", B: undefined, C: () => undefined, D: false },
    });
    expect(res.toString()).toBe("A=1\nD=false");
  });
});
