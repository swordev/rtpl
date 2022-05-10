import { Callable, resolve } from "../utils/object";
import { AbstractModel, TypeEnum } from "./AbstractModel";

export type Schedule = number | [number, number] | { each: number };

export type CronSpec = Callable<{
  minute?: Schedule;
  hour?: Schedule;
  day?: Schedule;
  month?: Schedule;
  weekDay?: Schedule;
  /**
   * @default true
   */
  enabled?: boolean;
  script: Callable<string>;
}>[];

export function formatSchedule(schedule: Schedule | undefined) {
  if (typeof schedule === "number") {
    return schedule.toString().padStart(2, "0");
  } else if (Array.isArray(schedule)) {
    const [start, end] = schedule;
    return `${start}-${end}`;
  } else if (schedule && typeof schedule.each === "number") {
    return `*/${schedule.each}`;
  } else {
    return "*";
  }
}

export class CronModel extends AbstractModel<CronSpec> {
  protected static _tplModelType = TypeEnum.Cron;
  toString() {
    return (this.spec ?? [])
      .map(resolve)
      .filter((v) => v.enabled ?? true)
      .map((v) =>
        [
          ...[v.minute, v.hour, v.day, v.month, v.weekDay].map(formatSchedule),
          resolve(v.script),
        ].join(" ")
      )
      .join("\n");
  }
}
