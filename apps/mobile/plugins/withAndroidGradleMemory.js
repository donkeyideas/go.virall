const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin: increases JVM heap + Metaspace for Android Gradle builds.
 *
 * WHY: EAS Build workers run with the default Gradle JVM settings (2 GiB heap,
 * 512 MiB Metaspace). Expo SDK 55 + react-native-reanimated + react-native-screens
 * exceed the Metaspace limit during lintVitalAnalyze tasks, causing:
 *   java.lang.OutOfMemoryError: Metaspace
 * Raising to 4 GiB heap / 1 GiB Metaspace resolves this.
 */
module.exports = function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;

    // Remove any existing jvmargs entry so we don't duplicate it
    const filtered = props.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'),
    );

    filtered.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError',
    });

    cfg.modResults = filtered;
    return cfg;
  });
};
