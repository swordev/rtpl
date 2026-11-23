import { RawRes } from "../../src/index.js";
import {
  diffAttrs,
  formatMode,
  hasAttrChanges,
  parseId,
  parseIdFile,
  parseMode,
} from "../../src/utils/attrs.js";
import { describe, expect, it } from "vitest";

describe("parseMode", () => {
  it("parses numbers and octal strings", () => {
    expect(parseMode(undefined)).toBeUndefined();
    expect(parseMode(0o640)).toBe(0o640);
    expect(parseMode("0640")).toBe(0o640);
    expect(parseMode("640")).toBe(0o640);
    expect(parseMode("4755")).toBe(0o4755);
  });

  it("rejects invalid modes", () => {
    expect(() => parseMode("rw-r--r--")).toThrow(
      'Invalid file mode "rw-r--r--"',
    );
    expect(() => parseMode("0898")).toThrow();
    expect(() => parseMode(0o10000)).toThrow();
    expect(() => parseMode(-1)).toThrow();
  });

  it("formats modes", () => {
    expect(formatMode(0o640)).toBe("0640");
    expect(formatMode(0o4755)).toBe("4755");
  });
});

describe("parseId", () => {
  it("keeps names and converts numeric strings", () => {
    expect(parseId("user", undefined)).toBeUndefined();
    expect(parseId("user", "www-data")).toBe("www-data");
    expect(parseId("user", "33")).toBe(33);
    expect(parseId("group", 0)).toBe(0);
  });

  it("rejects invalid ids", () => {
    expect(() => parseId("user", -1)).toThrow('Invalid user id "-1"');
    expect(() => parseId("group", "")).toThrow();
  });
});

describe("parseIdFile", () => {
  it("parses passwd and group files", () => {
    const passwd = [
      "# comment",
      "root:x:0:0:root:/root:/bin/bash",
      "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
      "",
    ].join("\n");
    expect(parseIdFile(passwd)).toEqual(
      new Map([
        ["root", 0],
        ["www-data", 33],
      ]),
    );
    expect(parseIdFile("docker:x:999:user1,user2\r\n")).toEqual(
      new Map([["docker", 999]]),
    );
  });
});

describe("diffAttrs", () => {
  const stats = { mode: 0o100644, uid: 1000, gid: 1000 };

  it("ignores undeclared attributes", () => {
    const changes = diffAttrs(stats, {});
    expect(changes).toEqual({});
    expect(hasAttrChanges(changes)).toBe(false);
  });

  it("ignores the file type bits", () => {
    expect(diffAttrs(stats, { mode: 0o644 })).toEqual({});
  });

  it("reports changed attributes", () => {
    const changes = diffAttrs(stats, { mode: 0o600, uid: 0, gid: 1000 });
    expect(changes).toEqual({
      mode: { from: 0o644, to: 0o600 },
      uid: { from: 1000, to: 0 },
    });
    expect(hasAttrChanges(changes)).toBe(true);
  });

  it("reports declared attributes of new files", () => {
    expect(diffAttrs(undefined, { mode: 0o600 })).toEqual({
      mode: { from: undefined, to: 0o600 },
    });
  });
});

describe("AbstractRes attributes", () => {
  it("normalizes mode, owner and group", () => {
    const res = new RawRes({
      data: "",
      mode: "0600",
      owner: "1000",
      group: "www-data",
    });
    expect(res.mode).toBe(0o600);
    expect(res.owner).toBe(1000);
    expect(res.group).toBe("www-data");
  });

  it("does not manage undefined attributes", () => {
    const res = new RawRes({ data: "" });
    expect(res.mode).toBeUndefined();
    expect(res.owner).toBeUndefined();
    expect(res.group).toBeUndefined();
  });

  it("validates the mode on creation", () => {
    expect(() => new RawRes({ data: "", mode: "abc" })).toThrow(
      'Invalid file mode "abc"',
    );
  });
});
