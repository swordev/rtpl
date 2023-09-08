import { Callable, resolve } from "../utils/object";
import { AbstractRes, ResType } from "./AbstractRes";

export type Schedule = number | [number, number] | { each: number };

export type CronData = Callable<{
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

export class CronRes extends AbstractRes<CronData> {
  protected static _tplResType = ResType.Cron;
  override toString() {
    return (this.data ?? [])
      .map(resolve)
      .filter((v) => v.enabled ?? true)
      .map((v) =>
        [
          ...[v.minute, v.hour, v.day, v.month, v.weekDay].map(formatSchedule),
          resolve(v.script),
        ].join(" "),
      )
      .join("\n");
  }
}
