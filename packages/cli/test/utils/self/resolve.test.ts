import { DirRes, RawRes } from "../../../src";
import { resolveResources } from "../../../src/utils/self/resolve";
import { it, describe, expect } from "vitest";

describe("resolveResources", () => {
  it("uses res name as file name", async () => {
    const res = new RawRes({ name: "f1" });
    expect(await resolveResources({ resources: { res } })).toMatchObject({
      f1: res,
    });
  });

  it("uses tag as file name", async () => {
    const f1 = new RawRes({});
    expect(await resolveResources({ resources: { f1 } })).toMatchObject({
      f1,
    });
  });

  it("prepends folder", async () => {
    const res = new RawRes({ name: "f2" });
    expect(
      await resolveResources({ resources: { folder: { res } } })
    ).toMatchObject({
      "folder/f2": res,
    });
  });

  it("overrides file name", async () => {
    const res = new RawRes({ name: "f3" });
    expect(
      await resolveResources({ resources: { "./folder/fx": res } })
    ).toMatchObject({
      "folder/fx": res,
    });
  });

  it("prepends folder", async () => {
    const res = new RawRes({ name: "f3" });
    expect(
      await resolveResources({ resources: { "./folder/f/": res } })
    ).toMatchObject({
      "folder/f/f3": res,
    });
  });

  it("uses dir res as folder", async () => {
    const folder1 = new DirRes({ name: "folder1" });
    const res = new RawRes({ name: "f3" });
    expect(
      await resolveResources({ resources: { main: folder1.set({ res }) } })
    ).toMatchObject({
      folder1: folder1,
      "folder1/f3": res,
    });
  });

  it("uses multiple folders", async () => {
    const folder1 = new DirRes({ name: "folder1" });
    const folder2 = new DirRes({ name: "folder2" });
    expect(
      await resolveResources({ resources: { main: folder1.set({ folder2 }) } })
    ).toMatchObject({
      folder1: folder1,
      "folder1/folder2": folder2,
    });
  });

  it("uses same dir level", async () => {
    const f1 = new RawRes({ name: "f1" });
    const f2 = new RawRes({ name: "f2" });
    const f3 = new RawRes({ name: "f3" });
    expect(await resolveResources({ resources: [f1, f2, f3] })).toMatchObject({
      f1,
      f2,
      f3,
    });
  });
});
