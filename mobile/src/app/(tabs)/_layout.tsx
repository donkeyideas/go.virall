import { Tabs } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * Cockpit shell. The mockup uses a single floating hamburger menu (top-left)
 * for navigation — NO bottom tab bar. Each screen renders its own
 * <FloatingMenu /> so this layout just hides the default tab bar and lets
 * expo-router keep the (tabs) grouping.
 */
export default function TabsLayout() {
  const { mode } = useTheme();
  const c = cockpit(mode);
  useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: c.bgDeep },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="ideas" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
