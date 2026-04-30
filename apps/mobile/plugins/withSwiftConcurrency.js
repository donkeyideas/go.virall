const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: sets SWIFT_STRICT_CONCURRENCY = minimal for all CocoaPods targets.
 * Fixes Swift 6 strict concurrency build errors in expo-modules-core on Xcode 16.3+.
 * Injects into the existing post_install block (CocoaPods only allows one).
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
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '    end',
        '  end',
      ].join('\n');

      if (podfile.includes('post_install do |installer|')) {
        // Inject at the top of the existing post_install block
        podfile = podfile.replace(
          'post_install do |installer|',
          'post_install do |installer|\n' + swiftFix
        );
      } else {
        // No existing block — add one
        podfile += '\npost_install do |installer|\n' + swiftFix + '\nend\n';
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
