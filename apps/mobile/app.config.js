const config = require('./app.json');

module.exports = ({ config: expoConfig }) => {
  return {
    ...config.expo,
    ...expoConfig,
    name: config.expo.name,
    slug: config.expo.slug,
    version: config.expo.version,
    icon: config.expo.icon,
    scheme: config.expo.scheme,
    splash: config.expo.splash,
    ios: config.expo.ios,
    android: config.expo.android,
    plugins: [
      ...config.expo.plugins,
      './plugins/withSwiftConcurrency',
    ],
    experiments: config.expo.experiments,
    extra: config.expo.extra,
  };
};
