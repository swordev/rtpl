import { CronRes } from "../../../src/resources/CronRes.js";
import { it, describe, expect } from "vitest";

describe("CronRes.toString", () => {
  it("renders single line", () => {
    const cron = new CronRes({
      data: [
        {
          script: "run.sh",
          day: 1,
          hour: 2,
        },
      ],
    });
    expect(cron.toString()).toBe(`* 02 01 * * run.sh`);
  });

  it("renders script callback", () => {
    const cron = new CronRes({
      data: [
        {
          script: () => "run.sh",
          day: 1,
          hour: 2,
        },
      ],
    });
    expect(cron.toString()).toBe(`* 02 01 * * run.sh`);
  });
});
