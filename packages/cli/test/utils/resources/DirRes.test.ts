import { DirRes, JsonRes } from "../../../src/index.js";
import { it, describe, expect } from "vitest";

describe("DirRes.symbol", () => {
  it("attach symbols", () => {
    const f1 = new JsonRes({});
    const f2 = new JsonRes({}, Symbol("f2"));
    const f3 = new JsonRes({});
    const f4 = new DirRes({
      data: { f3 },
    });
    const dir = new DirRes(
      {
        data: {
          f1,
          f2,
          d1: f4,
        },
      },
      Symbol("dir"),
    );

    expect(f1.symbol === dir.symbol).toBeTruthy();
    expect(f4.symbol === dir.symbol).toBeTruthy();
    expect(f3.symbol === dir.symbol).toBeTruthy();
    expect(!!f2.symbol && f2.symbol !== dir.symbol).toBeTruthy();
  });
});
