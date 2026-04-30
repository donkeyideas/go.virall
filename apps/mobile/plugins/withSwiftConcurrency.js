const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: compiles CocoaPods targets with Swift 5 language mode + minimal
 * concurrency checking so expo-modules-core@55 builds cleanly on Xcode 16.4.
 *
 * ROOT CAUSE (expo-modules-core@55.0.23):
 *   • podspec declares s.swift_version='6.0'
 *   • Source uses `extension UIView: @MainActor AnyArgument` (SE-0434 syntax)
 *     which requires Swift 5.10+ or Swift 6.0.
 *   • Has Swift 6 strict-concurrency violations that cannot be suppressed in
 *     Swift 6.0 language mode (SWIFT_STRICT_CONCURRENCY is ignored there).
 *
 * HISTORY:
 *   v1 – SWIFT_VERSION=5.9 + SWIFT_STRICT_CONCURRENCY=minimal
 *        → "unknown attribute 'MainActor'": SE-0434 is a Swift 5.10 feature,
 *          not available in strict Swift-5.9 language mode.
 *   v2 – removed SWIFT_VERSION override, kept SWIFT_STRICT_CONCURRENCY=minimal
 *        → xcconfig's SWIFT_VERSION=6.0 takes effect; SWIFT_STRICT_CONCURRENCY
 *          is ignored in Swift 6.0 mode → strict-concurrency errors persist.
 *   v3 – deleted SWIFT_VERSION + OTHER_SWIFT_FLAGS=-strict-concurrency=minimal
 *        → if CocoaPods stores SWIFT_VERSION in target build settings (not xcconfig),
 *          deleting it causes fallback to project-level Swift 5.0 → SE-0434 fails again.
 *          The OTHER_SWIFT_FLAGS flag also has no effect in Swift 6 language mode.
 *   v4 (current) – explicitly set SWIFT_VERSION='5' for every pod target.
 *        In Xcode 16.4 'SWIFT_VERSION=5' selects the latest Swift 5.x language
 *        mode (= Swift 5.10), which includes SE-0434 and allows
 *        SWIFT_STRICT_CONCURRENCY=minimal to suppress data-race errors.
 *
 * WHAT IT DOES:
 *   • Sets SWIFT_VERSION='5' on every pod target (overrides podspec's '6.0').
 *   • Sets SWIFT_STRICT_CONCURRENCY='minimal' (effective in Swift 5 mode).
 *   • Cleans up OTHER_SWIFT_FLAGS injected by v3.
 */
module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const V4_MARKER = '# withSwiftConcurrency-v4';

      // Stale residue from any previous version of this plugin.
      const HAS_STALE =
        podfile.includes('withSwiftConcurrency-v1') ||
        podfile.includes('withSwiftConcurrency-v2') ||
        podfile.includes('withSwiftConcurrency-v3') ||
        podfile.includes("SWIFT_VERSION'] = '5.9'") ||
        podfile.includes("SWIFT_VERSION'] = '6.0'") ||
        podfile.includes('-strict-concurrency=minimal');

      if (podfile.includes(V4_MARKER) && !HAS_STALE) {
        console.warn('[withSwiftConcurrency] Podfile already patched (v4), skipping.');
        return cfg;
      }

      console.warn('[withSwiftConcurrency] Patching Podfile with v4 Swift fix…');

      const swiftFix = [
        `  ${V4_MARKER}`,
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        '      # Swift 5 language mode (= Swift 5.10 in Xcode 16) supports SE-0434',
        '      # (@MainActor in conformance lists) while still honouring',
        '      # SWIFT_STRICT_CONCURRENCY to suppress data-race errors.',
        "      config.build_settings['SWIFT_VERSION'] = '5'",
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '      # Remove -strict-concurrency=minimal from OTHER_SWIFT_FLAGS if injected by v3.',
        "      if config.build_settings['OTHER_SWIFT_FLAGS']",
        "        config.build_settings['OTHER_SWIFT_FLAGS'] = config.build_settings['OTHER_SWIFT_FLAGS'].to_s.gsub(' -strict-concurrency=minimal', '')",
        '      end',
        '    end',
        '  end',
      ].join('\n');

      const postInstallMarker = 'post_install do |installer|';

      if (podfile.includes(postInstallMarker)) {
        // Strip any previously-injected withSwiftConcurrency block (any version).
        podfile = podfile.replace(
          /(post_install do \|installer\|\n)([ \t]*# (?:Fix Swift|Suppress Swift|withSwiftConcurrency)[\s\S]*?  end\n)/,
          '$1',
        );

        // Inject v4 fix at the top of the post_install block.
        podfile = podfile.replace(
          postInstallMarker,
          postInstallMarker + '\n' + swiftFix,
        );
      } else {
        podfile += `\npost_install do |installer|\n${swiftFix}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      console.warn('[withSwiftConcurrency] Podfile patched successfully.');
      return cfg;
    },
  ]);
};
