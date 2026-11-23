import { RawRes } from "../../../src/index.js";
import {
  ActionEnum,
  execFileAction,
  getFileAction,
} from "../../../src/utils/self/install.js";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const isWindows = process.platform === "win32";
const isRoot = process.getuid?.() === 0;
const lock = { creationDate: new Date(0).toISOString() };

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "rtpl-install-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const fileMode = async (path: string) => (await stat(path)).mode & 0o7777;

async function install(res: RawRes, path: string, previousLock = lock) {
  const action = await getFileAction(join(dir, path), res, previousLock);
  await execFileAction(action, dir, path, false);
  return action;
}

describe("file attributes", () => {
  it("does not report attributes when they are not declared", async () => {
    await writeFile(join(dir, "a"), "a");
    const action = await getFileAction(
      join(dir, "a"),
      new RawRes({ data: "a" }),
      lock,
    );
    expect(action.type).toBe(ActionEnum.NONE);
  });

  it.runIf(isWindows)("ignores attributes on Windows", async () => {
    await writeFile(join(dir, "a"), "a");
    const action = await getFileAction(
      join(dir, "a"),
      new RawRes({ data: "a", mode: 0o600, owner: 0 }),
      lock,
    );
    expect(action.type).toBe(ActionEnum.NONE);
  });

  describe.skipIf(isWindows)("posix", () => {
    it("creates files with the declared mode", async () => {
      const action = await install(
        new RawRes({ data: "secret", mode: 0o600 }),
        "sub/a",
      );
      expect(action.type).toBe(ActionEnum.ADD);
      expect(await fileMode(join(dir, "sub/a"))).toBe(0o600);
    });

    it("applies modes wider than the umask", async () => {
      await install(new RawRes({ data: "#!/bin/sh", mode: "0777" }), "a");
      expect(await fileMode(join(dir, "a"))).toBe(0o777);
    });

    it("detects mode-only changes", async () => {
      await writeFile(join(dir, "a"), "a");
      await chmod(join(dir, "a"), 0o644);
      const res = new RawRes({ data: "a", mode: 0o640 });

      const action = await install(res, "a");
      expect(action.type).toBe(ActionEnum.ATTRS);
      if (action.type !== ActionEnum.ATTRS) return;
      expect(action.attrChanges).toEqual({ mode: { from: 0o644, to: 0o640 } });
      expect(action.lock).toMatchObject({ updatingDate: expect.any(String) });
      expect(await fileMode(join(dir, "a"))).toBe(0o640);

      const next = await getFileAction(join(dir, "a"), res, lock);
      expect(next.type).toBe(ActionEnum.NONE);
    });

    it("updates contents and mode together", async () => {
      await writeFile(join(dir, "a"), "old");
      await chmod(join(dir, "a"), 0o644);
      const action = await install(
        new RawRes({ data: "new", mode: 0o600 }),
        "a",
      );
      expect(action.type).toBe(ActionEnum.UPDATE);
      expect((await readFile(join(dir, "a"))).toString()).toBe("new");
      expect(await fileMode(join(dir, "a"))).toBe(0o600);
    });

    it("rejects attribute changes of files outside the lock", async () => {
      await writeFile(join(dir, "a"), "a");
      await chmod(join(dir, "a"), 0o644);
      const action = await getFileAction(
        join(dir, "a"),
        new RawRes({ data: "a", mode: 0o600 }),
      );
      expect(action).toMatchObject({ type: ActionEnum.ATTRS, lock: false });
      await expect(execFileAction(action, dir, "a", false)).rejects.toThrow(
        "Path not found in lock",
      );
    });

    it("does not change anything in dry run", async () => {
      await writeFile(join(dir, "a"), "a");
      await chmod(join(dir, "a"), 0o644);
      const action = await getFileAction(
        join(dir, "a"),
        new RawRes({ data: "a", mode: 0o600 }),
        lock,
      );
      await execFileAction(action, dir, "a", true);
      expect(await fileMode(join(dir, "a"))).toBe(0o644);
    });

    it("fails with unknown users", async () => {
      await expect(
        getFileAction(
          join(dir, "a"),
          new RawRes({ data: "a", owner: "rtpl-unknown-user" }),
        ),
      ).rejects.toThrow('Unknown user "rtpl-unknown-user"');
    });

    it("accepts the current owner without root", async () => {
      const uid = process.getuid!();
      const gid = process.getgid!();
      await writeFile(join(dir, "a"), "a");
      const action = await install(
        new RawRes({ data: "a", owner: uid, group: gid }),
        "a",
      );
      expect(action.type).toBe(ActionEnum.NONE);
    });

    it.runIf(isRoot)("changes the owner", async () => {
      await install(
        new RawRes({ data: "a", owner: "root", group: 1, mode: 0o640 }),
        "a",
      );
      const stats = await stat(join(dir, "a"));
      expect(stats.uid).toBe(0);
      expect(stats.gid).toBe(1);
      expect(stats.mode & 0o7777).toBe(0o640);
    });
  });
});
