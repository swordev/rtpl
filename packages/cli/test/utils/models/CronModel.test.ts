import { CronModel } from "../../../src/models/CronModel";

describe("CronModel.toString", () => {
  it("renders single line", () => {
    const cron = new CronModel({
      spec: [
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
    const cron = new CronModel({
      spec: [
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
