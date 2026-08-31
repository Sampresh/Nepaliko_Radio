const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * The admin panel and Cloud Functions live in this repo but are separate npm
 * projects with their own node_modules — including their own copy of React.
 * Without blocking them, Metro crawls both and hits duplicate-module collisions.
 * `open-design` is an unrelated project nested in the repo root.
 */
config.resolver.blockList = [
  /\/admin\/node_modules\/.*/,
  /\/admin\/dist\/.*/,
  /\/open-design\/.*/,
];

module.exports = config;
