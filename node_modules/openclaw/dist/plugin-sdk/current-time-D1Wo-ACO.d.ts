import { n as TimeFormatPreference } from "./date-time-C_aF3jiN.js";

//#region src/agents/current-time.d.ts
type CronStyleNow = {
  userTimezone: string;
  formattedTime: string;
  timeLine: string;
};
type TimeConfigLike = {
  agents?: {
    defaults?: {
      userTimezone?: string;
      timeFormat?: TimeFormatPreference;
    };
  };
};
/** Resolve localized and UTC current-time text for agent prompts. */
declare function resolveCronStyleNow(cfg: TimeConfigLike, nowMs: number): CronStyleNow;
/** Append a current-time block unless the text already contains one. */
declare function appendCronStyleCurrentTimeLine(text: string, cfg: TimeConfigLike, nowMs: number): string;
//#endregion
export { appendCronStyleCurrentTimeLine as n, resolveCronStyleNow as r, CronStyleNow as t };