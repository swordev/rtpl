import { DirModel, RawModel } from "../../../src";
import { resolveModels } from "../../../src/utils/self/resolve";
import { it, describe, expect } from "vitest";

describe("resolveModels", () => {
  it("uses model name as file name", async () => {
    const model = new RawModel({ name: "f1" });
    expect(await resolveModels({ input: { model } })).toMatchObject({
      f1: model,
    });
  });

  it("uses tag as file name", async () => {
    const f1 = new RawModel({});
    expect(await resolveModels({ input: { f1 } })).toMatchObject({
      f1,
    });
  });

  it("prepends folder", async () => {
    const model = new RawModel({ name: "f2" });
    expect(await resolveModels({ input: { folder: { model } } })).toMatchObject(
      {
        "folder/f2": model,
      }
    );
  });

  it("overrides file name", async () => {
    const model = new RawModel({ name: "f3" });
    expect(
      await resolveModels({ input: { "./folder/fx": model } })
    ).toMatchObject({
      "folder/fx": model,
    });
  });

  it("prepends folder", async () => {
    const model = new RawModel({ name: "f3" });
    expect(
      await resolveModels({ input: { "./folder/f/": model } })
    ).toMatchObject({
      "folder/f/f3": model,
    });
  });

  it("uses dir model as folder", async () => {
    const folder1 = new DirModel({ name: "folder1" });
    const model = new RawModel({ name: "f3" });
    expect(
      await resolveModels({ input: { main: folder1.set({ model }) } })
    ).toMatchObject({
      folder1: folder1,
      "folder1/f3": model,
    });
  });

  it("uses multiple folders", async () => {
    const folder1 = new DirModel({ name: "folder1" });
    const folder2 = new DirModel({ name: "folder2" });
    expect(
      await resolveModels({ input: { main: folder1.set({ folder2 }) } })
    ).toMatchObject({
      folder1: folder1,
      "folder1/folder2": folder2,
    });
  });

  it("uses same dir level", async () => {
    const f1 = new RawModel({ name: "f1" });
    const f2 = new RawModel({ name: "f2" });
    const f3 = new RawModel({ name: "f3" });
    expect(await resolveModels({ input: [f1, f2, f3] })).toMatchObject({
      f1,
      f2,
      f3,
    });
  });
});
