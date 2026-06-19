import net from "node:net";
//#region src/infra/ports-probe.ts
/** Opens and closes a temporary listener to verify that a port can be bound. */
async function tryListenOnPort(params) {
	const listenOptions = { port: params.port };
	if (params.host) listenOptions.host = params.host;
	if (typeof params.exclusive === "boolean") listenOptions.exclusive = params.exclusive;
	await new Promise((resolve, reject) => {
		const tester = net.createServer().once("error", (err) => reject(err)).once("listening", () => {
			tester.close(() => resolve());
		}).listen(listenOptions);
	});
}
//#endregion
export { tryListenOnPort as t };
