const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: sets SWIFT_VERSION = 5.9 and SWIFT_STRICT_CONCURRENCY = minimal
 * for all CocoaPods targets.
 *
 * WHY SWIFT_VERSION: @MainActor was introduced in Swift 5.5. If pods are compiled
 * in an older Swift language mode (e.g. 5.0), the compiler reports "unknown attribute
 * 'MainActor'". Explicitly setting 5.9 fixes this without enabling Swift 6 mode.
 *
 * WHY SWIFT_STRICT_CONCURRENCY: Xcode 26 defaults to Swift 6 strict concurrency.
 * expo-modules-core@55.x uses Swift 5.x concurrency patterns that fail under
 * strict mode. Setting 'minimal' reverts to Swift 5.9 concurrency behaviour.
 *
 * Injected at the END of the post_install block so our settings override anything
 * set earlier (e.g. by react_native_post_install).
 */
module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
        return cfg; // already patched
      }

      const swiftFix = [
        '  # Fix Swift 6 / Xcode 26 build errors in expo-modules-core',
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        "      config.build_settings['SWIFT_VERSION'] = '5.9'",
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '    end',
        '  end',
      ].join('\n');

      const postInstallMarker = 'post_install do |installer|';

      if (podfile.includes(postInstallMarker)) {
        // Inject BEFORE the last `\nend` in the file (closes the post_install block).
        // post_install is always the last block in an Expo-generated Podfile.
        const lastEnd = podfile.lastIndexOf('\nend');
        if (lastEnd >= 0) {
          podfile =
            podfile.slice(0, lastEnd) +
            '\n' + swiftFix +
            podfile.slice(lastEnd);
        } else {
          // Fallback: inject right after the post_install opening line
          podfile = podfile.replace(
            postInstallMarker,
            postInstallMarker + '\n' + swiftFix,
          );
        }
      } else {
        // No existing block — append one
        podfile += '\npost_install do |installer|\n' + swiftFix + '\nend\n';
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
