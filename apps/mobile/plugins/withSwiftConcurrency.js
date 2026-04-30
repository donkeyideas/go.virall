const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: compiles CocoaPods targets with Swift 5.9 + SE-0434 upcoming-feature
 * flag + minimal concurrency checking so expo-modules-core@55 builds on Xcode 16.4.
 *
 * ROOT CAUSE (expo-modules-core@55.0.23):
 *   The pod uses `extension UIView: @MainActor AnyArgument` and similar syntax from
 *   SE-0434 "Usability of global-actor-isolated types". This syntax is only parsed
 *   correctly when the Swift compiler is in one of:
 *     (a) Swift 6.0 language mode (SE-0434 on by default), OR
 *     (b) Swift 5.9 language mode + -enable-upcoming-feature GlobalActorIsolatedTypesUsability
 *
 *   Swift 6.0 mode enforces strict concurrency and those errors CANNOT be suppressed,
 *   so path (a) fails. Path (b) — Swift 5.9 + the upcoming-feature flag — enables
 *   SE-0434 syntax while SWIFT_STRICT_CONCURRENCY=minimal still suppresses data-race
 *   errors (the concurrency setting only works in Swift 5 language mode).
 *
 * HISTORY:
 *   v1 – SWIFT_VERSION=5.9 + SWIFT_STRICT_CONCURRENCY=minimal
 *        → SE-0434 not active → "unknown attribute 'MainActor'" in conformance lists.
 *   v2 – removed SWIFT_VERSION override; xcconfig SWIFT_VERSION=6.0 takes effect
 *        → Swift 6.0 mode; SWIFT_STRICT_CONCURRENCY ignored → strict-concurrency errors.
 *   v3 – deleted SWIFT_VERSION (CocoaPods stores it in target build settings, not xcconfig)
 *        → falls back to project-level Swift 5.0; SE-0434 fails again.
 *   v4 – SWIFT_VERSION='5' (latest Swift 5.x)
 *        → SE-0434 is still not active in Swift 5 language mode without the flag.
 *   v5 (current) – SWIFT_VERSION=5.9 + SWIFT_STRICT_CONCURRENCY=minimal
 *        + -enable-upcoming-feature GlobalActorIsolatedTypesUsability
 *        → enables SE-0434 parse support in Swift 5.9 mode; concurrency suppressible.
 *
 * WHAT IT DOES:
 *   • Sets SWIFT_VERSION='5.9' on every pod target.
 *   • Sets SWIFT_STRICT_CONCURRENCY='minimal'.
 *   • Adds -enable-upcoming-feature GlobalActorIsolatedTypesUsability to OTHER_SWIFT_FLAGS
 *     so the @MainActor-in-conformance-list syntax is accepted by the parser.
 */
module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const V5_MARKER = '# withSwiftConcurrency-v5';

      const HAS_STALE =
        podfile.includes('withSwiftConcurrency-v1') ||
        podfile.includes('withSwiftConcurrency-v2') ||
        podfile.includes('withSwiftConcurrency-v3') ||
        podfile.includes('withSwiftConcurrency-v4') ||
        podfile.includes("SWIFT_VERSION'] = '6.0'") ||
        podfile.includes("SWIFT_VERSION'] = '5'\"");

      if (podfile.includes(V5_MARKER) && !HAS_STALE) {
        console.warn('[withSwiftConcurrency] Podfile already patched (v5), skipping.');
        return cfg;
      }

      console.warn('[withSwiftConcurrency] Patching Podfile with v5 Swift fix…');

      const swiftFix = [
        `  ${V5_MARKER}`,
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |config|',
        '      # Swift 5.9 language mode: SWIFT_STRICT_CONCURRENCY=minimal works here',
        '      # (unlike Swift 6.0 mode where strict concurrency is always enforced).',
        "      config.build_settings['SWIFT_VERSION'] = '5.9'",
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '      # Enable SE-0434 (@MainActor in conformance lists) as an upcoming feature.',
        '      # Without this flag, the syntax is a parse error in Swift 5.9 mode.',
        "      existing = (config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)').to_s",
        "      unless existing.include?('GlobalActorIsolatedTypesUsability')",
        "        config.build_settings['OTHER_SWIFT_FLAGS'] = existing + ' -enable-upcoming-feature GlobalActorIsolatedTypesUsability'",
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
