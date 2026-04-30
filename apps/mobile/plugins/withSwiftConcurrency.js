const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: suppresses Swift 6 strict concurrency errors in CocoaPods targets.
 *
 * HISTORY:
 *   v1 – set SWIFT_VERSION=5.9 + SWIFT_STRICT_CONCURRENCY=minimal
 *        → broke expo-modules-core@55 which uses Swift-6-only @MainActor conformance syntax.
 *   v2 – removed SWIFT_VERSION=5.9, kept SWIFT_STRICT_CONCURRENCY=minimal
 *        → SWIFT_STRICT_CONCURRENCY=minimal in Xcode 26 silently forces Swift 5.x compat
 *          mode, which again makes @MainActor in conformance lists "unknown attribute".
 *   v3 (current) – remove SWIFT_STRICT_CONCURRENCY entirely; pass -strict-concurrency=minimal
 *        directly via OTHER_SWIFT_FLAGS, which is not affected by that regression.
 *        expo-modules-core's own podspec declares s.swift_version='6.0', so the pod target
 *        compiles in Swift 6 mode and the conformance-list syntax is valid.
 *
 * WHAT IT DOES:
 *   • Strips any stale SWIFT_VERSION or SWIFT_STRICT_CONCURRENCY settings from previous runs.
 *   • Appends -strict-concurrency=minimal to OTHER_SWIFT_FLAGS for every pod target so
 *     Swift 6 data-race errors are demoted, while the Swift 6 language version is preserved.
 */
module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Idempotency guard: skip if already patched with v3 marker and no stale v1/v2 residue.
      const V3_MARKER = '# withSwiftConcurrency-v3';
      const HAS_STALE =
        podfile.includes("SWIFT_VERSION'] = '5.9'") ||
        podfile.includes("SWIFT_VERSION'] = '6.0'") ||
        podfile.includes("'SWIFT_STRICT_CONCURRENCY'");
      if (podfile.includes(V3_MARKER) && !HAS_STALE) {
        console.warn('[withSwiftConcurrency] Podfile already patched (v3), skipping.');
        return cfg;
      }

      console.warn('[withSwiftConcurrency] Patching Podfile with v3 Swift concurrency fix…');

      const swiftFix = [
        `  ${V3_MARKER}`,
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        '      # Remove stale settings from previous plugin versions.',
        "      config.build_settings.delete('SWIFT_VERSION')",
        "      config.build_settings.delete('SWIFT_STRICT_CONCURRENCY')",
        '      # Pass -strict-concurrency=minimal directly to swiftc.',
        '      # This suppresses Swift 6 data-race errors without forcing a language-version',
        '      # downgrade (unlike SWIFT_STRICT_CONCURRENCY=minimal in Xcode 26).',
        "      existing = (config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)').to_s",
        "      unless existing.include?('-strict-concurrency=minimal')",
        "        config.build_settings['OTHER_SWIFT_FLAGS'] = existing + ' -strict-concurrency=minimal'",
        '      end',
        '    end',
        '  end',
      ].join('\n');

      const postInstallMarker = 'post_install do |installer|';

      if (podfile.includes(postInstallMarker)) {
        // Use a regex to strip any previously-injected installer.pods_project block
        // that immediately follows the post_install opening line.
        podfile = podfile.replace(
          /(post_install do \|installer\|\n)([ \t]*# (?:Fix Swift|Suppress Swift|withSwiftConcurrency)[\s\S]*?  end\n)/,
          '$1',
        );

        // Inject v3 fix at the top of the post_install block.
        podfile = podfile.replace(
          postInstallMarker,
          postInstallMarker + '\n' + swiftFix,
        );
      } else {
        // No existing post_install block — append one.
        podfile += `\npost_install do |installer|\n${swiftFix}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      console.warn('[withSwiftConcurrency] Podfile patched successfully.');
      return cfg;
    },
  ]);
};
