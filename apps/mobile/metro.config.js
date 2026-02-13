const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Enable subpath exports for @cookednote/shared
config.resolver.unstable_enablePackageExports = true;

// Watch shared package for live reload
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(monorepoRoot, "packages/shared"),
];

// Resolve node_modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
