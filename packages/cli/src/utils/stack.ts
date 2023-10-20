import { readFileSync } from "fs";
import { dirname } from "path";

export type Call = { getFileName(): string; getLineNumber(): number };

export function captureStackTrace(limit = 15): Call[] {
  const prepareStackTrace = Error.prepareStackTrace;
  const stackTraceLimit = Error.stackTraceLimit;
  try {
    Error.stackTraceLimit = limit;
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    Error.captureStackTrace(err);
    return (err.stack as any as Call[]).map((stack) => {
      return {
        getFileName() {
          const fileName = stack.getFileName();
          return fileName.startsWith("file://")
            ? stack.getFileName()
            : new URL(`file://${fileName}`).href;
        },
        getLineNumber: stack.getLineNumber.bind(stack),
      };
    });
  } catch (error) {
    return [];
  } finally {
    Error.prepareStackTrace = prepareStackTrace;
    Error.stackTraceLimit = stackTraceLimit;
  }
}

export type AfterOf =
  | string
  | {
      startsWith: string;
    };

export function getLastStacks(
  afterOf: AfterOf[] | undefined,
  required: true,
): [Call, ...Call[]];
export function getLastStacks(
  excluafterOfde?: AfterOf[],
  required?: false,
): Call[];
export function getLastStacks(afterOf?: AfterOf[], required?: boolean): Call[] {
  const trace = captureStackTrace();
  const stacks: Call[] = [];
  let include = false;
  for (const stack of trace) {
    const fileName = stack.getFileName();
    if (include) {
      stacks.push(stack);
    } else if (fileName === import.meta.url) {
      if (!afterOf) include = true;
      continue;
    } else if (
      afterOf?.some((pattern) => {
        if (typeof pattern === "string") {
          return fileName === pattern;
        } else {
          return fileName.startsWith(pattern.startsWith);
        }
      })
    ) {
      include = true;
    }
  }
  if (required && !stacks.length)
    throw new Error("Could not capture file name from stack trace");
  return stacks;
}

export function parseSourceMap(path: string, ifExists?: boolean) {
  let sourceMap: string | undefined;
  try {
    sourceMap = readFileSync(path).toString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && ifExists) return;
    throw error;
  }
  return JSON.parse(sourceMap) as {
    sources: string[];
  };
}

export function sourceFilename(exclude?: string[]) {
  const [stack] = getLastStacks(exclude, true);
  const fileName = stack.getFileName();
  return fileName;
}

export function sourceDirname(exclude?: string[]) {
  return dirname(sourceFilename(exclude));
}
