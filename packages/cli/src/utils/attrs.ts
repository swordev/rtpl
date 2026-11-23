import type { Stats } from "fs";
import { chmod, chown, readFile, stat } from "fs/promises";
import { styleText } from "util";

export type IdKind = "user" | "group";

/**
 * Desired file attributes with users and groups resolved to numeric ids.
 */
export type ResolvedAttrs = {
  mode?: number;
  uid?: number;
  gid?: number;
};

export type AttrChange = { from?: number; to: number };

export type AttrChanges = {
  mode?: AttrChange;
  uid?: AttrChange;
  gid?: AttrChange;
};

export function attrsSupported() {
  return process.platform !== "win32";
}

/**
 * Parses an octal file mode (`0o640`, `"0640"` or `"640"`).
 */
export function parseMode(value: number | string | undefined) {
  if (value === undefined) return;
  let mode: number;
  if (typeof value === "number") {
    mode = value;
  } else {
    if (!/^0?[0-7]{3,4}$/.test(value))
      throw new Error(`Invalid file mode "${value}"`);
    mode = parseInt(value, 8);
  }
  if (!Number.isInteger(mode) || mode < 0 || mode > 0o7777)
    throw new Error(`Invalid file mode "${value}"`);
  return mode;
}

export function formatMode(mode: number) {
  return mode.toString(8).padStart(4, "0");
}

export function parseId(kind: IdKind, value: string | number | undefined) {
  if (value === undefined) return;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0)
      throw new Error(`Invalid ${kind} id "${value}"`);
    return value;
  }
  if (!value.length) throw new Error(`Invalid ${kind} name ""`);
  return /^\d+$/.test(value) ? Number(value) : value;
}

/**
 * Parses `/etc/passwd` or `/etc/group` contents into a `name -> id` map.
 */
export function parseIdFile(contents: string) {
  const ids = new Map<string, number>();
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [name, , id] = line.split(":");
    if (name && id && /^\d+$/.test(id) && !ids.has(name))
      ids.set(name, Number(id));
  }
  return ids;
}

const idFiles: Record<IdKind, string> = {
  user: "/etc/passwd",
  group: "/etc/group",
};

const idMaps: Partial<Record<IdKind, Promise<Map<string, number>>>> = {};

function readIdMap(kind: IdKind) {
  return (idMaps[kind] ??= readFile(idFiles[kind]).then(
    (buffer) => parseIdFile(buffer.toString()),
    (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return new Map<string, number>();
      throw error;
    },
  ));
}

export async function resolveId(kind: IdKind, value: string | number) {
  const parsed = parseId(kind, value)!;
  if (typeof parsed === "number") return parsed;
  const id = (await readIdMap(kind)).get(parsed);
  if (id === undefined) throw new Error(`Unknown ${kind} "${parsed}"`);
  return id;
}

export async function formatId(kind: IdKind, id: number) {
  try {
    for (const [name, value] of await readIdMap(kind))
      if (value === id) return name;
  } catch {}
  return id.toString();
}

let unsupportedWarned = false;

export async function resolveAttrs(input: {
  mode?: number;
  owner?: string | number;
  group?: string | number;
}): Promise<ResolvedAttrs> {
  const defined =
    input.mode !== undefined ||
    input.owner !== undefined ||
    input.group !== undefined;
  if (!defined) return {};
  if (!attrsSupported()) {
    if (!unsupportedWarned) {
      unsupportedWarned = true;
      console.warn(
        styleText(
          "yellow",
          `File modes and owners are ignored on ${process.platform}`,
        ),
      );
    }
    return {};
  }
  const attrs: ResolvedAttrs = {};
  if (input.mode !== undefined) attrs.mode = input.mode;
  if (input.owner !== undefined)
    attrs.uid = await resolveId("user", input.owner);
  if (input.group !== undefined)
    attrs.gid = await resolveId("group", input.group);
  return attrs;
}

/**
 * Compares the declared attributes with the current ones. Attributes that
 * are not declared are not managed and never reported.
 */
export function diffAttrs(
  stats: Pick<Stats, "mode" | "uid" | "gid"> | undefined,
  attrs: ResolvedAttrs,
): AttrChanges {
  const changes: AttrChanges = {};
  const current = stats
    ? { mode: stats.mode & 0o7777, uid: stats.uid, gid: stats.gid }
    : undefined;
  for (const key of ["mode", "uid", "gid"] as const) {
    const to = attrs[key];
    if (to === undefined) continue;
    const from = current?.[key];
    if (from !== to) changes[key] = { from, to };
  }
  return changes;
}

export function hasAttrChanges(changes: AttrChanges) {
  return !!(changes.mode || changes.uid || changes.gid);
}

/**
 * Applies the declared attributes that differ from the current ones.
 */
export async function applyAttrs(path: string, attrs: ResolvedAttrs) {
  if (
    attrs.mode === undefined &&
    attrs.uid === undefined &&
    attrs.gid === undefined
  )
    return;
  const changes = diffAttrs(await stat(path), attrs);
  const chowned = !!(changes.uid || changes.gid);
  // `chown` must go first since it can clear the setuid/setgid bits.
  if (chowned) await chown(path, changes.uid?.to ?? -1, changes.gid?.to ?? -1);
  if (changes.mode || (chowned && attrs.mode !== undefined))
    await chmod(path, attrs.mode!);
}

export async function formatAttrChanges(changes: AttrChanges) {
  const lines: string[] = [];
  const format = async (
    label: string,
    change: AttrChange | undefined,
    fn: (value: number) => string | Promise<string>,
  ) => {
    if (!change) return;
    const to = await fn(change.to);
    lines.push(
      change.from === undefined
        ? `${label}: ${to}`
        : `${label}: ${await fn(change.from)} -> ${to}`,
    );
  };
  await format("mode", changes.mode, formatMode);
  await format("owner", changes.uid, (id) => formatId("user", id));
  await format("group", changes.gid, (id) => formatId("group", id));
  return lines;
}
