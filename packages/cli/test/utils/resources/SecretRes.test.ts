import {
  defineTpl,
  resolveTplResources,
  SecretRes,
} from "../../../src/index.js";
import { describe, expect, it } from "vitest";

describe("SecretRes", () => {
  it("resolves a derived secret declared before its parent", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => {
        const parent = new SecretRes({});
        return { child: new SecretRes(parent), parent };
      },
    });
    const resources = await resolveTplResources([tpl], {
      "resources/app/parent.secret": "parentvalue12345",
    });
    expect(resources["resources/app/child.secret"]).toBe("parentvalue12345");
  });

  it("renders an empty value", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({ empty: new SecretRes({ data: { value: "" } }) }),
    });
    expect(await resolveTplResources([tpl])).toEqual({
      "resources/app/empty.secret": "",
    });
  });

  it("generates values with a custom charset", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        secret: new SecretRes({
          data: { charset: { value: "abcdefghijk" }, length: 8 },
        }),
      }),
    });
    const resources = await resolveTplResources([tpl]);
    expect(resources["resources/app/secret.secret"]).toMatch(/^[a-k]{8}$/);
  });
});
