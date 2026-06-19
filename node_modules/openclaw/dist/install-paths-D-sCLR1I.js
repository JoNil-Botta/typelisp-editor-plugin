import { a as safeDirName, i as resolveSafeInstallDir, n as unscopedPackageName, o as safePathSegmentHashed } from "./install-safe-path-C0w7ALW6.js";
import { d as resolveConfigDir, p as resolveUserPath } from "./utils-CCC-BEJH.js";
import path from "node:path";
//#region src/plugins/install-paths.ts
/** Encodes arbitrary input as a safe plugin install filename. */
function safePluginInstallFileName(input) {
	return safeDirName(input);
}
/** Encodes a plugin id for use as an install directory name. */
function encodePluginInstallDirName(pluginId) {
	const trimmed = pluginId.trim();
	if (!trimmed.includes("/")) return safeDirName(trimmed);
	return `@${safePathSegmentHashed(trimmed)}`;
}
/** Validates a plugin id for install path safety. */
function validatePluginId(pluginId) {
	const trimmed = pluginId.trim();
	if (!trimmed) return "invalid plugin name: missing";
	if (trimmed.includes("\\")) return "invalid plugin name: path separators not allowed";
	const segments = trimmed.split("/");
	if (segments.some((segment) => !segment)) return "invalid plugin name: malformed scope";
	if (segments.some((segment) => segment === "." || segment === "..")) return "invalid plugin name: reserved path segment";
	if (segments.length === 1) {
		if (trimmed.startsWith("@")) return "invalid plugin name: scoped ids must use @scope/name format";
		return null;
	}
	if (segments.length !== 2) return "invalid plugin name: path separators not allowed";
	if (!segments[0]?.startsWith("@") || segments[0].length < 2) return "invalid plugin name: scoped ids must use @scope/name format";
	return null;
}
/** Checks whether an installed plugin id matches the expected id, including old npm keying. */
function matchesExpectedPluginId(params) {
	if (!params.expectedPluginId) return true;
	if (params.expectedPluginId === params.pluginId) return true;
	return !params.manifestPluginId && params.pluginId === params.npmPluginId && params.expectedPluginId === unscopedPackageName(params.npmPluginId);
}
/** Resolves the default directory for path-installed plugin extensions. */
function resolveDefaultPluginExtensionsDir(env = process.env, homedir) {
	return path.join(resolveConfigDir(env, homedir), "extensions");
}
/** Resolves the default directory for managed npm plugin installs. */
function resolveDefaultPluginNpmDir(env = process.env, homedir) {
	return path.join(resolveConfigDir(env, homedir), "npm");
}
/** Encodes an npm package name into a managed npm project directory name. */
function encodePluginNpmProjectDirName(packageName) {
	const trimmed = packageName.trim();
	if (!trimmed) throw new Error("invalid npm package name: missing");
	return safePathSegmentHashed(trimmed);
}
/** Resolves the directory containing managed npm plugin projects. */
function resolvePluginNpmProjectsDir(npmDir) {
	const npmBase = npmDir ? resolveUserPath(npmDir) : resolveDefaultPluginNpmDir();
	return path.join(npmBase, "projects");
}
/** Resolves the managed npm project directory for a package name. */
function resolvePluginNpmProjectDir(params) {
	return path.join(resolvePluginNpmProjectsDir(params.npmDir), encodePluginNpmProjectDirName(params.packageName));
}
/** Resolves the installed node_modules package directory for a managed npm plugin. */
function resolvePluginNpmPackageDir(params) {
	return path.join(resolvePluginNpmProjectDir(params), "node_modules", ...params.packageName.split("/"));
}
/** Resolves the default directory for git-installed plugins. */
function resolveDefaultPluginGitDir(env = process.env, homedir) {
	return path.join(resolveConfigDir(env, homedir), "git");
}
/** Resolves the safe install directory for one plugin id. */
function resolvePluginInstallDir(pluginId, extensionsDir) {
	const extensionsBase = extensionsDir ? resolveUserPath(extensionsDir) : resolveDefaultPluginExtensionsDir();
	const pluginIdError = validatePluginId(pluginId);
	if (pluginIdError) throw new Error(pluginIdError);
	const targetDirResult = resolveSafeInstallDir({
		baseDir: extensionsBase,
		id: pluginId,
		invalidNameMessage: "invalid plugin name: path traversal detected",
		nameEncoder: encodePluginInstallDirName
	});
	if (!targetDirResult.ok) throw new Error(targetDirResult.error);
	return targetDirResult.path;
}
//#endregion
export { resolveDefaultPluginNpmDir as a, resolvePluginNpmProjectDir as c, validatePluginId as d, resolveDefaultPluginGitDir as i, resolvePluginNpmProjectsDir as l, matchesExpectedPluginId as n, resolvePluginInstallDir as o, resolveDefaultPluginExtensionsDir as r, resolvePluginNpmPackageDir as s, encodePluginInstallDirName as t, safePluginInstallFileName as u };
