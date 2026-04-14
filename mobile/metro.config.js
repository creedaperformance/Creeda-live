const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the parent repo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
// To prevent issues when two copies of a package are present
config.resolver.disableHierarchicalLookup = true;

// 4. Resolve absolute imports properly from the shared web lib
// If web uses `@/lib/something`, Metro must know `@` means workspaceRoot/src
const { alias } = config.resolver;
config.resolver.alias = {
  ...alias,
  "@": path.resolve(workspaceRoot, "src"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
