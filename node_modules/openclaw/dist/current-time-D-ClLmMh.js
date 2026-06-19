import { S as resolveDateTimestampMs } from "./number-coercion-CJQ8TR--.js";
import { a as resolveUserTimezone, i as resolveUserTimeFormat, n as formatUserTime } from "./date-time-CcWivhrg.js";
//#region src/agents/current-time.ts
/**
* Formats cron-style current-time prompt text with local and UTC references.
*/
/** Resolve localized and UTC current-time text for agent prompts. */
function resolveCronStyleNow(cfg, nowMs) {
	const userTimezone = resolveUserTimezone(cfg.agents?.defaults?.userTimezone);
	const userTimeFormat = resolveUserTimeFormat(cfg.agents?.defaults?.timeFormat);
	const timestampMs = resolveDateTimestampMs(nowMs);
	const date = new Date(timestampMs);
	const formattedTime = formatUserTime(date, userTimezone, userTimeFormat) ?? date.toISOString();
	return {
		userTimezone,
		formattedTime,
		timeLine: `Current time: ${formattedTime} (${userTimezone})\nReference UTC: ${date.toISOString().replace("T", " ").slice(0, 16) + " UTC"}`
	};
}
/** Append a current-time block unless the text already contains one. */
function appendCronStyleCurrentTimeLine(text, cfg, nowMs) {
	const base = text.trimEnd();
	if (!base || base.includes("Current time:")) return base;
	const { timeLine } = resolveCronStyleNow(cfg, nowMs);
	return `${base}\n${timeLine}`;
}
//#endregion
export { resolveCronStyleNow as n, appendCronStyleCurrentTimeLine as t };
