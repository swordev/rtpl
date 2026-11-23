import { defineTplConfig } from "../../../src/index.js";
import { describe, expect, it } from "vitest";

describe("defineTplConfig", () => {
  it("applies the default deletion policy", () => {
    expect(defineTplConfig({}).backup.deletionPolicy).toEqual({
      keepLast: 25,
    });
    expect(
      defineTplConfig({ backup: { deletionPolicy: { keepLast: 3 } } }).backup
        .deletionPolicy,
    ).toEqual({ keepLast: 3 });
  });

  it("disables the deletion policy with false", () => {
    const config = defineTplConfig({ backup: { deletionPolicy: false } });
    expect(config.backup.deletionPolicy).toBe(false);
  });
});
