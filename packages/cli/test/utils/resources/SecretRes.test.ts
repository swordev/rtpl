import {
  defineTpl,
  resolveTplResources,
  SecretRes,
} from "../../../src/index.js";
import { describe, expect, it } from "vitest";

describe("SecretRes", () => {
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
