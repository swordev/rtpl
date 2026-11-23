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

describe("CronRes schedules", () => {
  it("formats ranges and steps and skips disabled jobs", () => {
    const out = new CronRes({
      data: [
        { minute: 0, hour: [1, 5], day: { each: 2 }, script: "a" },
        { enabled: false, script: "b" },
        () => ({ script: () => "c" }),
      ],
    }).toString();
    expect(out).toBe("00 1-5 */2 * * a\n* * * * * c");
  });

  it("rejects invalid steps", () => {
    for (const each of [0, -1, 1.5]) {
      const cron = new CronRes({ data: [{ minute: { each }, script: "x" }] });
      expect(() => cron.toString()).toThrow(/Invalid cron step/);
    }
  });
});
