import { DirRes, JsonRes } from "../../../src/index.js";
import { it, describe, expect, expectTypeOf } from "vitest";

describe("DirRes.config", () => {
  it("does not include data nor name", () => {
    const f1 = new JsonRes({});
    const dir = new DirRes({ name: "dir", data: { f1 } });

    expect(dir.config).toEqual({});
    expect("data" in dir.config).toBe(false);
    expect("name" in dir.config).toBe(false);

    expectTypeOf(dir.config).toEqualTypeOf<{}>();
    expectTypeOf(dir.config).not.toHaveProperty("data");
    expectTypeOf(dir.config).not.toHaveProperty("name");
  });

  it("infers custom config without data nor name", () => {
    const f1 = new JsonRes({});
    const dir = new DirRes({ name: "dir", data: { f1 }, mode: 0o755 });

    expect(dir.config).toEqual({ mode: 0o755 });

    expectTypeOf(dir.config).toEqualTypeOf<{ mode: number }>();
    expectTypeOf(dir.data).toEqualTypeOf<{ f1: typeof f1 }>();
  });

  it("keeps custom config without data", () => {
    const f1 = new JsonRes({});
    const dir = new DirRes<{ f1: typeof f1 }, { mode: number }>({
      data: { f1 },
      mode: 0o755,
    });

    expect(dir.config).toEqual({ mode: 0o755 });

    expectTypeOf(dir.config).toEqualTypeOf<{ mode: number }>();
    expectTypeOf(dir.config).not.toHaveProperty("data");
  });
});

describe("DirRes.add", () => {
  it("adds array items to an empty dir", () => {
    const a = new JsonRes({});
    const b = new JsonRes({});
    expect(new DirRes({}).add([a, b]).data).toEqual([a, b]);
  });

  it("appends array items", () => {
    const a = new JsonRes({});
    const b = new JsonRes({});
    expect(new DirRes({}).add([a]).add([b]).data).toEqual([a, b]);
  });
});
