const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: sets SWIFT_STRICT_CONCURRENCY = minimal for all CocoaPods targets.
 *
 * WHY NOT SWIFT_VERSION: expo-modules-core@55.x uses `extension UIView: @MainActor Protocol`
 * syntax which is Swift 6.0-only. Setting SWIFT_VERSION = 5.9 causes "unknown attribute
 * 'MainActor'" errors because that conformance-list actor syntax did not exist in Swift 5.x.
 * We must let Xcode 26 use its default Swift 6 language version.
 *
 * WHY SWIFT_STRICT_CONCURRENCY: Xcode 26 defaults to Swift 6 strict concurrency checking.
 * Many third-party pods use Swift 5.x concurrency patterns that fail under strict mode.
 * Setting 'minimal' suppresses data-race checking while still allowing Swift 6 syntax.
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

      // If already patched AND the old bad SWIFT_VERSION line isn't present, skip.
      // If the stale SWIFT_VERSION = 5.9 patch is there, fall through so the
      // replacement below overwrites the entire post_install injection.
      if (podfile.includes('SWIFT_STRICT_CONCURRENCY') && !podfile.includes("SWIFT_VERSION'] = '5.9'")) {
        return cfg; // already correctly patched
      }

      const swiftFix = [
        '  # Suppress Swift 6 strict concurrency for third-party pods (Xcode 26 / Swift 6)',
        '  # Do NOT set SWIFT_VERSION here — expo-modules-core@55 needs Swift 6.0 syntax.',
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '    end',
        '  end',
      ].join('\n');

      const postInstallMarker = 'post_install do |installer|';

      if (podfile.includes(postInstallMarker)) {
        // Strip any stale patch block (either old or new) that follows the marker,
        // so we always end up with exactly one clean injection.
        podfile = podfile.replace(
          postInstallMarker + '\n' + swiftFix,
          postInstallMarker,
        );
        // Also strip the old bad patch (which included SWIFT_VERSION = 5.9).
        const oldBadFix = [
          '  # Fix Swift 6.x / Xcode 16.4+ build errors in expo-modules-core',
          '  installer.pods_project.targets.each do |target|',
          '    target.build_configurations.each do |config|',
          "      config.build_settings['SWIFT_VERSION'] = '5.9'",
          "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
          '    end',
          '  end',
        ].join('\n');
        podfile = podfile.replace(
          postInstallMarker + '\n' + oldBadFix,
          postInstallMarker,
        );

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
