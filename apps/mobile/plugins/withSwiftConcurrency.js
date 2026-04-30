const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin: sets SWIFT_STRICT_CONCURRENCY = minimal for all CocoaPods targets.
 * Fixes Swift 6 strict concurrency build errors in expo-modules-core on Xcode 16.3+.
 */
module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
        podfile += `
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
end
`;
        fs.writeFileSync(podfilePath, podfile);
      }
      return cfg;
    },
  ]);
};
