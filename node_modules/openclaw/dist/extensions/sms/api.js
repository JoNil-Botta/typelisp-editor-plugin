import { t as createPluginRuntimeStore } from "../../runtime-store-uAKGMqTs.js";
//#region extensions/sms/src/runtime.ts
const { setRuntime: setSmsRuntime, getRuntime: getSmsRuntime } = createPluginRuntimeStore({
	pluginId: "sms",
	errorMessage: "SMS runtime not initialized - plugin not registered"
});
//#endregion
export { getSmsRuntime, setSmsRuntime };
