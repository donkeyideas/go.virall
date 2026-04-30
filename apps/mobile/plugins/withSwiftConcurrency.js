const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: sets SWIFT_VERSION = 5.9 and SWIFT_STRICT_CONCURRENCY = minimal
 * for all CocoaPods targets.
 *
 * WHY SWIFT_VERSION: In Swift 6.x (Xcode 16.4+), `extension UIView: @MainActor Protocol`
 * syntax is rejected. Setting SWIFT_VERSION = 5.9 reverts pods to Swift 5.9 language
 * rules where this syntax is valid. This is different from SWIFT_STRICT_CONCURRENCY,
 * which only controls concurrency-checking strictness, not the language version.
 *
 * WHY SWIFT_STRICT_CONCURRENCY: Xcode 16.4 defaults to Swift 6 concurrency checking.
 * expo-modules-core@55.x uses Swift 5.x concurrency patterns that fail under
 * strict mode. Setting 'minimal' reverts to Swift 5.9 concurrency behaviour.
 *
 * Injected at the TOP of the post_install block (right after the opening line).
 * NOTE: In RN 0.83, post_install is nested inside the target block, so injecting
 * before the last 'end' in the file would land outside post_install. Always use
 * string replacement on the opening line instead.
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
        '  # Fix Swift 6.x / Xcode 16.4+ build errors in expo-modules-core',
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        "      config.build_settings['SWIFT_VERSION'] = '5.9'",
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '    end',
        '  end',
      ].join('\n');

      const postInstallMarker = 'post_install do |installer|';

      if (podfile.includes(postInstallMarker)) {
        // Inject at the TOP of the existing post_install block.
        // Do NOT use lastIndexOf('\nend') — in RN 0.83, post_install is nested
        // inside the target block, so the last 'end' closes target, not post_install.
        podfile = podfile.replace(
          postInstallMarker,
          postInstallMarker + '\n' + swiftFix,
        );
      } else {
        // No existing block — append one at the end of the file
        podfile += '\npost_install do |installer|\n' + swiftFix + '\nend\n';
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
