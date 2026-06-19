import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { domainToASCII } from "node:url";
import { readProxyEnv, resolveAmbientProxyForUrl, } from "./env.js";
import { formatConnectAuthority } from "./connect.js";
import { ProxylineError, resolveProxyTlsCa } from "./shared.js";
const MAX_CONNECT_RESPONSE_HEADER_BYTES = 16 * 1024;
const INVALID_PROXY_TARGET_HOST_DELIMITER_PATTERN = /[/:?#@\\]/;
const INVALID_PROXY_TARGET_HOST_CONTROL_PATTERN = /[\u0000-\u0020\u007f]/;
const nodeAgentDefaultPorts = new WeakMap();
export const CALLER_AGENT_TLS_OPTION_KEYS = [
    "ca",
    "cert",
    "ciphers",
    "clientCertEngine",
    "crl",
    "dhparam",
    "ecdhCurve",
    "honorCipherOrder",
    "key",
    "maxVersion",
    "minVersion",
    "passphrase",
    "pfx",
    "rejectUnauthorized",
    "secureOptions",
    "secureProtocol",
    "sessionIdContext",
];
function copyNodeHttpOptions(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {};
    }
    return { ...value };
}
function readAgentOptions(agent) {
    if (agent === undefined || agent === false) {
        return undefined;
    }
    return agent.options;
}
function preserveCallerAgentOptions(options) {
    const agentOptions = readAgentOptions(options.agent);
    if (agentOptions === undefined) {
        return;
    }
    for (const key of CALLER_AGENT_TLS_OPTION_KEYS) {
        const value = agentOptions[key];
        if (value !== undefined && options[key] === undefined) {
            options[key] = value;
        }
    }
}
function unbracketHostname(hostname) {
    return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}
function inferDestinationHostname(url, options) {
    if (typeof options.hostname === "string") {
        return unbracketHostname(options.hostname);
    }
    if (url !== undefined) {
        return unbracketHostname(url instanceof URL ? url.hostname : new URL(url).hostname);
    }
    if (typeof options.host === "string") {
        return unbracketHostname(splitHostPort(options.host).host);
    }
    return undefined;
}
function preserveDestinationTlsIdentity(url, options) {
    if (options.servername !== undefined) {
        return;
    }
    const hostname = inferDestinationHostname(url, options);
    if (!hostname) {
        return;
    }
    if (net.isIP(hostname) === 0) {
        options.servername = hostname;
    }
}
export function bindNodeHttpMethod(originalMethod, createAgent) {
    return ((...args) => {
        let url;
        let options;
        let callback;
        const firstArg = args[0];
        if (typeof firstArg === "string" || firstArg instanceof URL) {
            url = firstArg;
            if (typeof args[1] === "function") {
                options = {};
                callback = args[1];
            }
            else {
                options = copyNodeHttpOptions(args[1]);
                callback = args[2];
            }
        }
        else {
            options = copyNodeHttpOptions(firstArg);
            callback = args[1];
        }
        preserveCallerAgentOptions(options);
        preserveDestinationTlsIdentity(url, options);
        const agent = createAgent(options);
        options.agent = agent;
        delete options.createConnection;
        if (url !== undefined) {
            const request = originalMethod(url, options, callback);
            request.once("close", () => {
                agent.destroy();
            });
            return request;
        }
        const request = originalMethod(options, callback);
        request.once("close", () => {
            agent.destroy();
        });
        return request;
    });
}
function proxyHost(proxy) {
    return (proxy.hostname || proxy.host).replace(/^\[|\]$/g, "");
}
function proxyPort(proxy) {
    if (proxy.port) {
        return Number(proxy.port);
    }
    return proxy.protocol === "https:" ? 443 : 80;
}
function proxyAuthorization(proxy) {
    if (!proxy.username && !proxy.password) {
        return undefined;
    }
    const username = decodeURIComponent(proxy.username);
    const password = decodeURIComponent(proxy.password);
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
function proxyConnectOptions(proxy, proxyTls) {
    const host = proxyHost(proxy);
    const base = {
        host,
        port: proxyPort(proxy),
    };
    if (proxy.protocol !== "https:") {
        return base;
    }
    const ca = resolveProxyTlsCa(proxyTls);
    return {
        ...base,
        ALPNProtocols: ["http/1.1"],
        ...(net.isIP(host) === 0 ? { servername: host } : {}),
        ...(ca !== undefined ? { ca } : {}),
    };
}
function assertSupportedNodeProxyProtocol(proxy) {
    if (proxy.protocol !== "http:" && proxy.protocol !== "https:") {
        throw new ProxylineError("UNSUPPORTED_PROXY_PROTOCOL", `Node HTTP agents support http:// and https:// proxy endpoints: ${proxy.protocol}`);
    }
}
function requestProtocol(req, options, stackProtocol) {
    const isWebSocket = isWebSocketRequest(req);
    if (isSecureEndpoint(options, stackProtocol)) {
        return isWebSocket ? "wss:" : "https:";
    }
    return isWebSocket ? "ws:" : "http:";
}
function normalizedPort(value) {
    if (typeof value !== "number" && typeof value !== "string") {
        return undefined;
    }
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : undefined;
}
function normalizedPositiveInteger(value) {
    if (typeof value !== "number" && typeof value !== "string") {
        return undefined;
    }
    const integer = Number(value);
    return Number.isInteger(integer) && integer > 0 ? integer : undefined;
}
function requestAuthority(options) {
    const rawHost = options.hostname ?? options.host ?? "localhost";
    const parsed = splitHostPort(String(rawHost));
    const host = normalizeProxyTargetHost(parsed.host || "localhost");
    const port = parsed.port ?? normalizedPort(options.port);
    const authorityHost = net.isIPv6(host) ? `[${host}]` : host;
    return port === undefined ? authorityHost : `${authorityHost}:${port}`;
}
function requestDestinationUrl(req, options, stackProtocol) {
    const path = req.path.startsWith("/") ? req.path : `/${req.path}`;
    return `${requestProtocol(req, options, stackProtocol)}//${requestAuthority(options)}${path}`;
}
function proxyForwardRequestPath(req, options) {
    if (/^(?:https?|wss?):\/\//i.test(req.path)) {
        return new URL(req.path).href;
    }
    return requestDestinationUrl(req, options, undefined);
}
function setProxyRequestHeaders(req, proxy, keepAlive) {
    const authorization = proxyAuthorization(proxy);
    if (authorization !== undefined) {
        req.setHeader("Proxy-Authorization", authorization);
    }
    if (!req.hasHeader("Proxy-Connection")) {
        req.setHeader("Proxy-Connection", keepAlive ? "Keep-Alive" : "close");
    }
}
function setForwardProxyRequestPath(req, options) {
    req._header = null;
    req.path = proxyForwardRequestPath(req, options);
}
function connectToProxy(proxy, proxyTls) {
    const options = proxyConnectOptions(proxy, proxyTls);
    return proxy.protocol === "https:"
        ? tls.connect(options)
        : net.connect(options);
}
function isWebSocketRequest(req) {
    return String(req.getHeader("upgrade") ?? "").toLowerCase() === "websocket";
}
function isSecureEndpoint(options, stackProtocol) {
    return (stackProtocol === "https" ||
        options.secureEndpoint === true ||
        options.protocol === "https:" ||
        options.protocol === "wss:" ||
        options.defaultPort === 443);
}
function shouldTunnelRequest(req, options, stackProtocol) {
    return isSecureEndpoint(options, stackProtocol) || isWebSocketRequest(req);
}
function requestSurface(req, options, stackProtocol) {
    if (isWebSocketRequest(req)) {
        return "websocket";
    }
    return isSecureEndpoint(options, stackProtocol) ? "node-https" : "node-http";
}
function splitHostPort(value) {
    const bracketed = value.match(/^\[([^\]]+)\](?::(\d+))?$/);
    if (bracketed) {
        return {
            host: bracketed[1] ?? "",
            ...(bracketed[2] !== undefined ? { port: Number(bracketed[2]) } : {}),
        };
    }
    const lastColon = value.lastIndexOf(":");
    const hasSingleColon = lastColon !== -1 && value.indexOf(":") === lastColon;
    if (hasSingleColon) {
        const possiblePort = value.slice(lastColon + 1);
        if (/^\d+$/.test(possiblePort)) {
            return { host: value.slice(0, lastColon), port: Number(possiblePort) };
        }
    }
    return { host: value };
}
function normalizeProxyTargetHost(host) {
    const unbracketedHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
    if (net.isIP(unbracketedHost) !== 0) {
        return unbracketedHost;
    }
    if (INVALID_PROXY_TARGET_HOST_DELIMITER_PATTERN.test(host)) {
        throw new ProxylineError("INVALID_CONNECT_TARGET", "CONNECT target host contains unsafe delimiters.");
    }
    if (INVALID_PROXY_TARGET_HOST_CONTROL_PATTERN.test(host)) {
        throw new ProxylineError("INVALID_CONNECT_TARGET", "CONNECT target host contains unsafe characters.");
    }
    const asciiHost = domainToASCII(host);
    if (!asciiHost) {
        throw new ProxylineError("INVALID_CONNECT_TARGET", "CONNECT target host is not a valid host name.");
    }
    return asciiHost;
}
function connectTarget(options) {
    const rawHost = options.hostname ?? options.host;
    if (typeof rawHost !== "string") {
        throw new ProxylineError("INVALID_CONNECT_TARGET", "CONNECT target is missing host.");
    }
    const parsed = splitHostPort(rawHost);
    const port = parsed.port ?? Number(options.port);
    if (!parsed.host || !Number.isInteger(port)) {
        throw new ProxylineError("INVALID_CONNECT_TARGET", "CONNECT target is missing host or port.");
    }
    const host = normalizeProxyTargetHost(parsed.host);
    formatConnectAuthority(host, port);
    return { host, port };
}
function destinationTlsConnectOptions(options, socket) {
    const target = connectTarget(options);
    const tlsOptions = { ...options, socket };
    tlsOptions.host = target.host;
    delete tlsOptions.path;
    delete tlsOptions.port;
    delete tlsOptions.secureEndpoint;
    delete tlsOptions.agent;
    return tlsOptions;
}
class ProxylineHttpForwardAgent extends http.Agent {
    options;
    #keepAlive;
    #proxy;
    #proxyTls;
    constructor(proxy, options, proxyTls) {
        super(options);
        this.options = options;
        this.#keepAlive = options.keepAlive === true;
        this.#proxy = proxy;
        this.#proxyTls = proxyTls;
    }
    addRequest(req, options) {
        setForwardProxyRequestPath(req, options);
        setProxyRequestHeaders(req, this.#proxy, this.#keepAlive);
        http.Agent.prototype.addRequest.call(this, req, options);
    }
    createConnection(_options, callback) {
        const socket = connectToProxy(this.#proxy, this.#proxyTls);
        if (callback !== undefined) {
            const onError = (error) => {
                callback(error, socket);
            };
            const onConnected = () => {
                socket.off("error", onError);
                callback(null, socket);
            };
            socket.once(this.#proxy.protocol === "https:" ? "secureConnect" : "connect", onConnected);
            socket.once("error", onError);
        }
        return socket;
    }
}
class ProxylineConnectAgent extends http.Agent {
    options;
    #keepAlive;
    #pendingConnectSockets = new Set();
    #pendingRequests = new WeakMap();
    #pendingRequestQueue = [];
    #proxy;
    #proxyTls;
    constructor(proxy, options, proxyTls) {
        super(options);
        this.options = options;
        this.#keepAlive = options.keepAlive === true;
        this.#proxy = proxy;
        this.#proxyTls = proxyTls;
    }
    addRequest(req, options) {
        this.#pendingRequests.set(options, req);
        this.#pendingRequestQueue.push(req);
        req.once("socket", () => this.#removePendingRequest(req));
        req.once("close", () => this.#removePendingRequest(req));
        try {
            http.Agent.prototype.addRequest.call(this, req, options);
        }
        catch (error) {
            this.#pendingRequests.delete(options);
            this.#removePendingRequest(req);
            throw error;
        }
    }
    #removePendingRequest(req) {
        const index = this.#pendingRequestQueue.indexOf(req);
        if (index !== -1) {
            this.#pendingRequestQueue.splice(index, 1);
        }
    }
    createConnection(options, callback) {
        const mappedRequest = this.#pendingRequests.get(options);
        const request = mappedRequest ?? this.#pendingRequestQueue.shift();
        this.#pendingRequests.delete(options);
        if (mappedRequest !== undefined) {
            this.#removePendingRequest(mappedRequest);
        }
        if (callback === undefined) {
            throw new ProxylineError("INVALID_CONNECT_CALLBACK", "CONNECT agents require an async socket callback.");
        }
        const proxySocket = connectToProxy(this.#proxy, this.#proxyTls);
        this.#pendingConnectSockets.add(proxySocket);
        let pendingTimeout;
        let settled = false;
        let responseBuffer = Buffer.alloc(0);
        let originalRequestSetTimeout;
        let hookedRequestSetTimeout;
        let tlsSocket;
        const startPendingTimeout = (timeoutMs) => {
            if (pendingTimeout !== undefined) {
                clearTimeout(pendingTimeout);
            }
            pendingTimeout = setTimeout(() => {
                request?.emit("timeout");
                if (!settled) {
                    fail(new ProxylineError("CONNECT_FAILED", "proxy CONNECT timed out"));
                }
            }, timeoutMs);
            pendingTimeout.unref?.();
        };
        const clearPendingTimeout = () => {
            if (pendingTimeout !== undefined) {
                clearTimeout(pendingTimeout);
                pendingTimeout = undefined;
            }
        };
        const restoreRequestTimeoutHook = () => {
            if (request !== undefined &&
                originalRequestSetTimeout !== undefined &&
                request.setTimeout === hookedRequestSetTimeout) {
                request.setTimeout = originalRequestSetTimeout;
            }
            originalRequestSetTimeout = undefined;
            hookedRequestSetTimeout = undefined;
        };
        const cleanupProxyHandshakeListeners = () => {
            proxySocket.off("data", onData);
            proxySocket.off("error", onError);
            proxySocket.off("end", onClosed);
            proxySocket.off("close", onClosed);
            proxySocket.off("connect", onConnected);
            proxySocket.off("secureConnect", onConnected);
        };
        const cleanup = () => {
            clearPendingTimeout();
            this.#pendingConnectSockets.delete(proxySocket);
            if (tlsSocket !== undefined) {
                this.#pendingConnectSockets.delete(tlsSocket);
            }
            restoreRequestTimeoutHook();
            cleanupProxyHandshakeListeners();
            request?.off("abort", onRequestClosed);
            request?.off("close", onRequestClosed);
            request?.off("error", onRequestClosed);
            request?.off("timeout", onRequestTimedOut);
        };
        const finish = (error, socket) => {
            if (settled) {
                if (error === null) {
                    socket.destroy();
                }
                return;
            }
            settled = true;
            cleanup();
            callback(error, socket);
        };
        const fail = (error) => {
            proxySocket.destroy();
            finish(error, proxySocket);
        };
        const onConnected = () => {
            let target;
            try {
                target = connectTarget(options);
            }
            catch (error) {
                fail(error instanceof Error ? error : new Error(String(error)));
                return;
            }
            const { host, port } = target;
            const authority = formatConnectAuthority(host, port);
            const headers = [
                `CONNECT ${authority} HTTP/1.1`,
                `Host: ${authority}`,
                `Proxy-Connection: ${this.#keepAlive ? "Keep-Alive" : "close"}`,
            ];
            const authorization = proxyAuthorization(this.#proxy);
            if (authorization !== undefined) {
                headers.push(`Proxy-Authorization: ${authorization}`);
            }
            proxySocket.write([...headers, "", ""].join("\r\n"));
        };
        const onData = (chunk) => {
            responseBuffer = Buffer.concat([responseBuffer, chunk]);
            const headerEnd = responseBuffer.indexOf("\r\n\r\n");
            if (headerEnd === -1) {
                if (responseBuffer.length > MAX_CONNECT_RESPONSE_HEADER_BYTES) {
                    fail(new ProxylineError("CONNECT_FAILED", "proxy CONNECT response headers were too large"));
                }
                return;
            }
            const bodyOffset = headerEnd + 4;
            if (bodyOffset > MAX_CONNECT_RESPONSE_HEADER_BYTES) {
                fail(new ProxylineError("CONNECT_FAILED", "proxy CONNECT response headers were too large"));
                return;
            }
            const statusLine = responseBuffer.subarray(0, bodyOffset).toString("latin1").split("\r\n", 1)[0] ?? "";
            if (!/^HTTP\/1\.[01] 2\d\d\b/.test(statusLine)) {
                fail(new ProxylineError("CONNECT_FAILED", statusLine || "proxy returned an invalid CONNECT response"));
                return;
            }
            const tunneledBytes = responseBuffer.subarray(bodyOffset);
            cleanupProxyHandshakeListeners();
            if (tunneledBytes.length > 0) {
                proxySocket.unshift(tunneledBytes);
            }
            if (!isSecureEndpoint(options)) {
                finish(null, proxySocket);
                return;
            }
            const currentTlsSocket = tls.connect(destinationTlsConnectOptions(options, proxySocket));
            tlsSocket = currentTlsSocket;
            this.#pendingConnectSockets.add(currentTlsSocket);
            const onTlsError = (error) => {
                currentTlsSocket.off("close", onTlsClosed);
                finish(error, currentTlsSocket);
            };
            const onTlsSecureConnect = () => {
                currentTlsSocket.off("error", onTlsError);
                currentTlsSocket.off("close", onTlsClosed);
                finish(null, currentTlsSocket);
            };
            const onTlsClosed = () => {
                finish(new ProxylineError("CONNECT_FAILED", "destination TLS socket closed before secureConnect"), currentTlsSocket);
            };
            currentTlsSocket.once("secureConnect", onTlsSecureConnect);
            currentTlsSocket.once("error", onTlsError);
            currentTlsSocket.once("close", onTlsClosed);
        };
        const onError = (error) => {
            fail(error);
        };
        const onClosed = () => {
            fail(new ProxylineError("CONNECT_FAILED", "proxy socket closed before CONNECT completed"));
        };
        const onRequestClosed = () => {
            if (!settled) {
                fail(new ProxylineError("CONNECT_FAILED", "request closed before proxy CONNECT completed"));
            }
        };
        const onRequestTimedOut = () => {
            if (!settled) {
                fail(new ProxylineError("CONNECT_FAILED", "proxy CONNECT timed out"));
            }
        };
        if (request !== undefined) {
            originalRequestSetTimeout = request.setTimeout;
            hookedRequestSetTimeout = function hookedSetTimeout(timeout, callback) {
                const result = originalRequestSetTimeout?.call(this, timeout, callback) ?? this;
                const timeoutMs = normalizedPositiveInteger(timeout);
                if (timeoutMs !== undefined) {
                    startPendingTimeout(timeoutMs);
                }
                else {
                    clearPendingTimeout();
                }
                return result;
            };
            request.setTimeout = hookedRequestSetTimeout;
        }
        const requestTimeout = request?.timeout;
        const timeoutMs = normalizedPositiveInteger(options.timeout ?? requestTimeout);
        if (timeoutMs !== undefined) {
            startPendingTimeout(timeoutMs);
        }
        request?.once("abort", onRequestClosed);
        request?.once("close", onRequestClosed);
        request?.once("error", onRequestClosed);
        request?.once("timeout", onRequestTimedOut);
        proxySocket.once(this.#proxy.protocol === "https:" ? "secureConnect" : "connect", onConnected);
        proxySocket.on("data", onData);
        proxySocket.once("error", onError);
        proxySocket.once("end", onClosed);
        proxySocket.once("close", onClosed);
        return undefined;
    }
    destroy() {
        for (const socket of this.#pendingConnectSockets) {
            socket.destroy();
        }
        this.#pendingConnectSockets.clear();
        super.destroy();
    }
}
export class ProxylineNodeProxyAgent extends http.Agent {
    options;
    #agents = new Map();
    #defaultProtocol;
    #getProxyForUrl;
    #httpAgent;
    #httpsAgent;
    #proxyTls;
    constructor(options) {
        const { defaultProtocol = "http", getProxyForUrl, proxyTls, ...agentOptions } = options;
        super(agentOptions);
        if (nodeAgentDefaultPorts.get(this) === 80) {
            nodeAgentDefaultPorts.delete(this);
        }
        this.options = agentOptions;
        this.#defaultProtocol = defaultProtocol;
        this.#getProxyForUrl = getProxyForUrl;
        this.#proxyTls = proxyTls;
        this.#httpAgent = new http.Agent(agentOptions);
        this.#httpsAgent = new https.Agent(agentOptions);
    }
    get defaultPort() {
        const stackProtocol = this.#callStackProtocol();
        return nodeAgentDefaultPorts.get(this) ??
            ((stackProtocol ?? this.#defaultProtocol) === "https" ? 443 : 80);
    }
    set defaultPort(value) {
        nodeAgentDefaultPorts.set(this, value);
    }
    get protocol() {
        return `${this.#callStackProtocol() ?? this.#defaultProtocol}:`;
    }
    set protocol(_value) {
        // Node's http.Agent constructor assigns this, but this wrapper is dual-use.
    }
    getProxyForUrl(url, request) {
        return this.#getProxyForUrl(url, undefined, request);
    }
    #callStackProtocol() {
        const originalStackTraceLimit = Error.stackTraceLimit;
        const errorConstructor = Error;
        const originalPrepareStackTrace = errorConstructor.prepareStackTrace;
        if (typeof originalStackTraceLimit !== "number" || originalStackTraceLimit < 20) {
            // Node reads agent.protocol/defaultPort before addRequest, so this is the only caller signal.
            Error.stackTraceLimit = 20;
        }
        let stack;
        try {
            delete errorConstructor.prepareStackTrace;
            stack = new Error().stack;
        }
        finally {
            if (originalPrepareStackTrace === undefined) {
                delete errorConstructor.prepareStackTrace;
            }
            else {
                errorConstructor.prepareStackTrace = originalPrepareStackTrace;
            }
            Error.stackTraceLimit = originalStackTraceLimit;
        }
        if (typeof stack !== "string") {
            return undefined;
        }
        for (const line of stack.split("\n")) {
            if (line.includes("node:https:")) {
                return "https";
            }
            if (line.includes("node:http:")) {
                return "http";
            }
        }
        return undefined;
    }
    addRequest(req, options) {
        const stackProtocol = this.#callStackProtocol();
        const agentOptions = stackProtocol === "https" && options.secureEndpoint !== true
            ? { ...options, secureEndpoint: true }
            : options;
        const url = requestDestinationUrl(req, agentOptions, stackProtocol);
        const surface = requestSurface(req, agentOptions, stackProtocol);
        const proxy = this.#getProxyForUrl(url, surface, req);
        if (!proxy) {
            (isSecureEndpoint(agentOptions, stackProtocol) ? this.#httpsAgent : this.#httpAgent)
                .addRequest(req, agentOptions);
            return;
        }
        const proxyUrl = new URL(proxy);
        assertSupportedNodeProxyProtocol(proxyUrl);
        const tunnel = shouldTunnelRequest(req, agentOptions, stackProtocol);
        const key = `${tunnel ? "connect" : "forward"}:${proxyUrl.href}`;
        let agent = this.#agents.get(key);
        if (agent === undefined) {
            const newAgent = tunnel
                ? new ProxylineConnectAgent(proxyUrl, this.options, this.#proxyTls)
                : new ProxylineHttpForwardAgent(proxyUrl, this.options, this.#proxyTls);
            agent = newAgent;
            this.#agents.set(key, agent);
        }
        agent.addRequest(req, agentOptions);
    }
    destroy() {
        for (const agent of this.#agents.values()) {
            agent.destroy();
        }
        this.#agents.clear();
        this.#httpAgent.destroy();
        this.#httpsAgent.destroy();
        super.destroy();
    }
}
export function createNodeProxyAgent(resolver, proxyCa, defaultProtocol = "http") {
    return new ProxylineNodeProxyAgent({
        defaultProtocol,
        getProxyForUrl: resolver.getProxyForUrl,
        ...(proxyCa !== undefined ? { proxyTls: { ca: proxyCa } } : {}),
    });
}
export function createDirectNodeAgent() {
    return new ProxylineNodeProxyAgent({
        getProxyForUrl: () => "",
    });
}
function ambientProbeUrl(protocol) {
    return `${protocol}://proxyline.invalid/`;
}
export function hasAmbientNodeProxyConfigured(options = {}) {
    const env = options.env ?? readProxyEnv();
    const protocol = options.protocol ?? "https";
    return resolveAmbientProxyForUrl(ambientProbeUrl(protocol), env) !== undefined;
}
export function createAmbientNodeProxyAgent(options = {}) {
    const env = options.env ?? readProxyEnv();
    const protocol = options.protocol ?? "https";
    if (resolveAmbientProxyForUrl(ambientProbeUrl(protocol), env) === undefined) {
        return undefined;
    }
    return new ProxylineNodeProxyAgent({
        defaultProtocol: protocol,
        getProxyForUrl: (url) => resolveAmbientProxyForUrl(url, env) ?? "",
        ...(options.proxyTls !== undefined ? { proxyTls: options.proxyTls } : {}),
    });
}
