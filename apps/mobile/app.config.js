const appJson = require('./app.json');

module.exports = ({ config }) => {
  const expo = appJson.expo;
  return {
    ...config,
    ...expo,
    ios: {
      ...expo.ios,
    },
    android: {
      ...expo.android,
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      './plugins/withAndroidGradleMemory',
      './plugins/withSwiftConcurrency',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '85107608-44ab-474c-b20a-95461271cced',
      },
    },
  };
};
