import { describe, expect, it } from "vitest";
import {
  defineTpl,
  defineTplSchema,
  resolveTplResources,
  SecretRes,
  YamlRes,
} from "../../src/index.js";
import { Compose } from "@json-types/compose";

class ComposeRes extends YamlRes<Compose> {}
class EntryComposeRes extends YamlRes<Compose> {}

const composeTpl = defineTpl({
  name: "compose",
  schema: defineTplSchema<{ volumes?: Record<string, string> }>(),
  resources: () => ({
    entry: new EntryComposeRes({ name: "docker-compose.yaml", data: {} }),
  }),
  onResolve: ({ fs, resources, options }) => {
    const composes = fs.remove({ instanceOf: ComposeRes });
    const volume = (name: string) => options.volumes?.[name] ?? name;
    resources.entry.data.volumes = Object.fromEntries(
      composes
        .map((c) => c.data)
        .flatMap((data) => Object.entries(data.volumes ?? {}))
        .map(([name, value]) => [volume(name), value]),
    );
    resources.entry.data.services = Object.fromEntries(
      Object.values(composes)
        .map((c) => c.data)
        .flatMap((data) => Object.entries(data.services ?? {}))
        .map(([name, value]) => [
          name,
          {
            ...value,
            volumes:
              value.volumes?.map((v) => {
                if (typeof v === "string") {
                  const [a, b] = v.split(":");
                  return `${volume(a)}:${b}`;
                } else {
                  return v;
                }
              }) ?? [],
          },
        ]),
    );
    fs.move(resources.entry, ".");
  },
});

describe("compose", () => {
  it("reuse the same app", async () => {
    const app = defineTpl({
      name: "app",
      resources: (name) => {
        const sqlPassword = new SecretRes({});
        return {
          sqlPassword,
          compose: new ComposeRes({
            data: {
              volumes: {
                [`${name}_db_data`]: {},
              },
              services: {
                [`${name}_db`]: {
                  image: "postgres:latest",
                  volumes: [`${name}_db_data`],
                  environment: {
                    get POSTGRES_PASSWORD() {
                      return sqlPassword.toString();
                    },
                  },
                },
                [`${name}_web`]: {
                  image: "nginx:latest",
                  depends_on: [`${name}_db`],
                },
              },
            },
          }),
        };
      },
    });

    const resources = await resolveTplResources(
      {
        templates: [
          composeTpl.withOptions({
            volumes: {
              app2_db_data: "app2_db_data_restored",
            },
          }),
          app.with({ name: "app1" }),
          app.with({ name: "app2" }),
        ],
        resourcePathAllowlist: ["docker-compose.yaml"],
      },
      {
        "resources/app1/sqlPassword.secret": "0D6Zlwi0gXAgqasK",
        "resources/app2/sqlPassword.secret": "MsQbkcEPiJekr3D5",
      },
    );

    expect(resources).toMatchInlineSnapshot(`
      {
        "docker-compose.yaml": "volumes:
        app1_db_data: {}
        app2_db_data_restored: {}
      services:
        app1_db:
          image: postgres:latest
          volumes:
            - app1_db_data:undefined
          environment:
            POSTGRES_PASSWORD: 0D6Zlwi0gXAgqasK
        app1_web:
          image: nginx:latest
          depends_on:
            - app1_db
          volumes: []
        app2_db:
          image: postgres:latest
          volumes:
            - app2_db_data_restored:undefined
          environment:
            POSTGRES_PASSWORD: MsQbkcEPiJekr3D5
        app2_web:
          image: nginx:latest
          depends_on:
            - app2_db
          volumes: []
      ",
        "resources/app1/sqlPassword.secret": "0D6Zlwi0gXAgqasK",
        "resources/app2/sqlPassword.secret": "MsQbkcEPiJekr3D5",
      }
    `);
  });
});
