import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Expo Go (SDK 53+) removed remote push support, so touching
// expo-notifications at module load crashes the bundle. Lazy-load it and bail
// out entirely when running in Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');

let notificationsMod: NotificationsModule | null = null;
let deviceMod: DeviceModule | null = null;
let handlerConfigured = false;

function loadNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  if (notificationsMod) return notificationsMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notificationsMod = require('expo-notifications');
    if (notificationsMod && !handlerConfigured) {
      notificationsMod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerConfigured = true;
    }
    return notificationsMod;
  } catch {
    return null;
  }
}

function loadDevice(): DeviceModule | null {
  if (deviceMod) return deviceMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    deviceMod = require('expo-device');
    return deviceMod;
  } catch {
    return null;
  }
}

export function getNotificationsModule(): NotificationsModule | null {
  return loadNotifications();
}

/**
 * Request permission and return an Expo push token (backed by FCM on Android
 * and APNs on iOS when configured via google-services.json /
 * GoogleService-Info.plist + EAS).
 *
 * Returns null in Expo Go (SDK 53+ removed remote push) or when the native
 * module is unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) {
    console.info('[notifications] Skipped: push requires a dev build (not available in Expo Go).');
    return null;
  }

  const Notifications = loadNotifications();
  const Device = loadDevice();
  if (!Notifications || !Device) {
    console.warn('[notifications] expo-notifications / expo-device not available.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[notifications] Push requires a physical device.');
    return null;
  }

  // Android channel (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#d4a843',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[notifications] Permission not granted.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  try {
    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (e) {
    console.error('[notifications] Failed to get push token:', e);
    return null;
  }
}

/**
 * Upserts the given push token into the push_tokens table keyed by (user_id, token).
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  const Device = loadDevice();
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      device_name: Device?.deviceName ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );
  if (error) {
    console.error('[notifications] Failed to save push token:', error.message);
  }
}

/**
 * Removes the given token (used on sign-out).
 */
export async function clearPushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
}
