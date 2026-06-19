import { p as readStringValue } from "./string-coerce-mnp54Vah.js";
//#region src/commands/gateway-presence.ts
/** Extracts the gateway's self presence entry from status/presence payloads. */
function parseLegacyGatewaySelfText(text) {
	const match = text.match(/^Gateway:\s*([^ (·]+)(?:\s*\(([^)]+)\))?/i);
	if (!match) return {};
	return {
		host: readStringValue(match[1]),
		ip: readStringValue(match[2])
	};
}
/** Picks host, ip, version, and platform from the gateway self presence record. */
function pickGatewaySelfPresence(presence) {
	if (!Array.isArray(presence)) return null;
	const entries = presence;
	const self = entries.find((e) => e.mode === "gateway" && e.reason === "self") ?? entries.find((e) => typeof e.text === "string" && e.text.startsWith("Gateway:")) ?? null;
	if (!self) return null;
	const legacy = typeof self.text === "string" ? parseLegacyGatewaySelfText(self.text) : {};
	const result = {
		host: readStringValue(self.host) ?? legacy.host,
		ip: readStringValue(self.ip) ?? legacy.ip,
		version: readStringValue(self.version),
		platform: readStringValue(self.platform)
	};
	const deviceId = readStringValue(self.deviceId);
	if (deviceId) result.deviceId = deviceId;
	const instanceId = readStringValue(self.instanceId);
	if (instanceId) result.instanceId = instanceId;
	return result;
}
//#endregion
export { pickGatewaySelfPresence as t };
