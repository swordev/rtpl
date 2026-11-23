import { IniRes } from "../../../src/index.js";
import { describe, expect, it } from "vitest";

describe("IniRes.toString", () => {
  it("renders nested groups, skips undefined and empties null", () => {
    const out = new IniRes({
      data: { top: 1, group: { a: "x", b: undefined, c: null } },
    }).toString();
    expect(out).toBe("top = 1\n[group]\n  a = x\n  c = ");
  });
});
