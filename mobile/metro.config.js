const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Supabase realtime-js CJS module resolution issue with Metro
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
