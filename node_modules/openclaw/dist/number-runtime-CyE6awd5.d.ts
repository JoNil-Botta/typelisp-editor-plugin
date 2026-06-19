//#region src/infra/tcp-port.d.ts
declare const MAX_TCP_PORT = 65535;
/** Parse a positive TCP port or return null for absent/invalid input. */
declare function parseTcpPort(raw: unknown): number | null;
//#endregion
export { parseTcpPort as n, MAX_TCP_PORT as t };