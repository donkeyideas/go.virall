/**
 * Expo config plugin that sets SWIFT_STRICT_CONCURRENCY = minimal
 * for all pod targets. This fixes Swift 6 strict concurrency errors
 * in expo-modules-core when building with Xcode 16.x.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function fixSwiftConcurrency(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, "utf8");

        const hook = [
          "",
          "    # Fix Swift 6 strict concurrency errors in expo-modules-core",
          "    installer.pods_project.targets.each do |target|",
          "      target.build_configurations.each do |bc|",
          "        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
          "      end",
          "    end",
        ].join("\n");

        if (contents.includes("post_install do |installer|")) {
          contents = contents.replace(
            "post_install do |installer|",
            `post_install do |installer|${hook}`
          );
        } else {
          contents += `\npost_install do |installer|${hook}\nend\n`;
        }

        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
}

module.exports = fixSwiftConcurrency;
