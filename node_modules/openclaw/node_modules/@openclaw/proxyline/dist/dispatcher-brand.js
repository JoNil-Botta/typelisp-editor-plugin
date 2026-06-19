export const PROXYLINE_DISPATCHER_BRAND = Symbol.for("@openclaw/proxyline.dispatcher");
export function isProxylineDispatcher(dispatcher) {
    return typeof dispatcher === "object" &&
        dispatcher !== null &&
        dispatcher[PROXYLINE_DISPATCHER_BRAND] === true;
}
