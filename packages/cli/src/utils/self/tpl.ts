import { AbstractRes } from "../../resources/AbstractRes.js";
import { DirRes } from "../../resources/DirRes.js";
import type {
  DeepPartial,
  InferInput,
  InferOutput,
  MaybePromise,
} from "./../ts.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { ResourceSystem } from "./rs.js";
import { merge } from "../object.js";
import { TplConfig } from "./config.js";

export interface TplResourceNode {
  [key: string]: AbstractRes | TplResourceNode;
}

export type TplResources = DirRes | TplResourceNode;

type TplOptionsOutput<S extends StandardSchemaV1> = [S] extends [never]
  ? undefined
  : InferOutput<S>;

export type TplCommon<
  O,
  R extends MaybePromise<TplResources> = MaybePromise<TplResources>,
> = {
  name: string;
  onResolve?: (data: {
    fs: ResourceSystem;
    resources: Awaited<R>;
    options: O;
  }) => MaybePromise<void>;
};

export type TplOptions<
  S extends StandardSchemaV1 = never,
  R extends MaybePromise<TplResources> = MaybePromise<TplResources>,
> = TplCommon<TplOptionsOutput<S>, R> & {
  schema?: S;
  resources(
    ...args: [S] extends [never]
      ? [name: string]
      : [options: InferOutput<S>, name: string]
  ): R;
  defaultOptions?: [S] extends [never]
    ? never
    :
        | ((
            options: DeepPartial<InferInput<S>>,
          ) => MaybePromise<DeepPartial<InferInput<S>>>)
        | DeepPartial<InferInput<S>>;
  onOptions?: [S] extends [never]
    ? never
    : (
        options: DeepPartial<InferInput<S>>,
      ) => MaybePromise<DeepPartial<InferInput<S>>>;
};

export type Tpl<
  O = undefined,
  R extends MaybePromise<TplResources> = MaybePromise<TplResources>,
> = TplCommon<O, R> & {
  options: O;
  resources(): R;
};

export type TplBuilder<
  S extends StandardSchemaV1,
  R extends MaybePromise<TplResources>,
> = {
  with(input: {
    name?: string;
    options?: DeepPartial<InferInput<S>>;
  }): Promise<Tpl<InferOutput<S>, R>>;
  withOptions(
    input: DeepPartial<InferInput<S>>,
  ): Promise<Tpl<InferOutput<S>, R>>;
};

export function defineTpl<R extends MaybePromise<TplResources>>(
  config: TplOptions<never, R>,
): Tpl<undefined, R> & {
  with(input: { name?: string }): Tpl<undefined, R>;
};
export function defineTpl<
  S extends StandardSchemaV1,
  R extends MaybePromise<TplResources>,
>(config: TplOptions<S, R> & { schema: S }): TplBuilder<S, R>;

export function defineTpl(config: TplOptions<any, any>): any {
  if (!config.schema) {
    return {
      name: config.name,
      options: undefined,
      resources() {
        return config.resources(this.name, this.options);
      },
      onResolve: config.onResolve,
      with(input: { name?: string }) {
        return { ...this, name: input.name ?? this.name };
      },
    };
  }

  async function $with(input: { name?: string; options?: unknown }) {
    const name = input.name ?? config.name;
    const rawInput = input.options ?? {};
    let options = merge(
      {},
      typeof config.defaultOptions === "function"
        ? await config.defaultOptions(rawInput)
        : (config.defaultOptions ?? {}),
      rawInput,
    );
    if (config.onOptions) options = await config.onOptions(options);
    const result = await config.schema["~standard"].validate(options);
    if (result.issues?.length) {
      throw new Error(
        `Invalid options for template "${name}": ${JSON.stringify(
          result.issues,
        )}`,
      );
    }

    return {
      name,
      options: result.value,
      resources() {
        return config.resources(this.options, this.name);
      },
      onResolve: config.onResolve,
    };
  }
  return {
    with: $with,
    withOptions: async (options: DeepPartial<InferInput<any>>) => {
      return await $with({ options });
    },
  };
}
