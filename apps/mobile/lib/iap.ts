import { Platform } from 'react-native';

export const IAP_PRODUCT_IDS = [
  'com.govirall.creator.monthly',
  'com.govirall.creator.yearly',
  'com.govirall.pro.monthly',
  'com.govirall.pro.yearly',
  'com.govirall.agency.monthly',
];

export const PRODUCT_TO_TIER: Record<string, string> = {
  'com.govirall.creator.monthly': 'creator',
  'com.govirall.creator.yearly': 'creator',
  'com.govirall.pro.monthly': 'pro',
  'com.govirall.pro.yearly': 'pro',
  'com.govirall.agency.monthly': 'agency',
};

export const TIER_TO_PRODUCTS: Record<string, string[]> = {
  creator: ['com.govirall.creator.monthly', 'com.govirall.creator.yearly'],
  pro: ['com.govirall.pro.monthly', 'com.govirall.pro.yearly'],
  agency: ['com.govirall.agency.monthly'],
};

export const isIOS = Platform.OS === 'ios';

export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
