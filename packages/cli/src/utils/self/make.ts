import { merge } from "../object";
import { sourceDirname } from "../stack";
import {
  PartialOptions,
  Template,
  UseModel,
  UseOptions,
  UseTransformer,
} from "./config";
import { global } from "./global";
import Ajv from "ajv";
import { JSONSchema7 } from "json-schema";
import { dirname, join, relative } from "path";

export type CreateReturn = ReturnType<typeof make>;

export function makeTransformer<T>(
  transformer: UseTransformer<T>
): UseTransformer<T> {
  return transformer;
}

export type MakeTransformer<TOptions> = (
  cb: UseTransformer<TOptions>
) => UseTransformer<TOptions>;

export type MakeModel<TOptions> = <TModel>(
  cb: (options: TOptions, pkg?: any) => Promise<TModel>
) => UseModel<TOptions, TModel>;

export type MakeOptions<T> = (
  defaultsOrCb:
    | PartialOptions<T>
    | ((
        input: PartialOptions<T>,
        cast: (input: PartialOptions<T>) => PartialOptions<T>
      ) => Promise<PartialOptions<T>>)
) => UseOptions<T>;

export type MakeEntrypoint<TOptions> = (data: {
  name: string;
}) => (options?: PartialOptions<TOptions>) => Template<TOptions>;

export type Make<TOptions> = {
  makeEntrypoint: MakeEntrypoint<TOptions>;
  makeTransformer: MakeTransformer<TOptions>;
  makeOptions: MakeOptions<TOptions>;
  makeModel: MakeModel<TOptions>;
  path(...args: string[]): string;
  data: {
    schema?: JSONSchema7;
    useTransformer?: UseTransformer<TOptions>;
    useOptions?: UseOptions<TOptions>;
    useModel?: UseModel<TOptions, any>;
  };
};

type Schema = JSONSchema7 | string;

function resolveSchema(schema: Schema | undefined) {
  if (typeof schema === "string") {
    return require(schema);
  } else {
    return schema;
  }
}

export function useSourceDirname() {
  let cachedValue: string | undefined;
  const srcDir = {
    get value() {
      if (!cachedValue) cachedValue = sourceDirname([__filename]);
      return cachedValue;
    },
  };
  return srcDir;
}

export function make<TOptions extends Record<string, unknown> = {}>(
  schema?: Schema
): Make<TOptions> {
  const sourceDirname = useSourceDirname();
  const result: Make<TOptions> = {} as any;

  result.data = {
    schema: resolveSchema(schema),
  };

  result.makeOptions = (defaultsOrCb) => {
    if (result.data.useOptions)
      throw new Error(`'makeOptions' was already called`);

    return (result.data.useOptions = async (input) => {
      const defaults =
        typeof defaultsOrCb === "function"
          ? await (defaultsOrCb as Function)(
              input ?? ({} as PartialOptions<TOptions>),
              (o: PartialOptions<TOptions>) => o
            )
          : defaultsOrCb;

      const options = merge(defaults ?? {}, input) as TOptions;

      if (result.data.schema) {
        const validate = new Ajv().compile(result.data.schema);

        if (!validate(options))
          throw new Error(
            `Invalid options: ${JSON.stringify(validate.errors, null, 2)}`
          );
      }

      return options;
    });
  };

  result.makeModel = (cb) => {
    if (result.data.useModel) throw new Error(`'makeModel' was already called`);
    return (result.data.useModel = async function (input, defaults) {
      const inputOptions = (input ?? {}) as PartialOptions<TOptions>;
      const defaultOptions = (defaults ?? {}) as PartialOptions<TOptions>;
      const options = await result.data.useOptions?.(
        merge(defaultOptions, inputOptions)
      );
      return await cb(options ?? ({} as TOptions));
    });
  };

  result.makeTransformer = (cb) => {
    if (result.data.useTransformer)
      throw new Error(`'makeTranstormer' was already called`);
    return (result.data.useTransformer = cb);
  };

  result.makeEntrypoint = ({ name }) => {
    return function (options) {
      return {
        name,
        options,
        useOptions: result.data.useOptions,
        useModel: result.data.useModel,
        useTransformer: result.data.useTransformer,
      } as Template<TOptions>;
    };
  };

  result.path = (...args: string[]) => {
    let base = sourceDirname.value;
    if (global.lastCallOptions) {
      const lockDir = dirname(global.lastCallOptions.lockPath);
      base = relative(lockDir, base);
    }
    return "./" + join(base, ...args).replace(/\\/g, "/");
  };

  return result;
}
