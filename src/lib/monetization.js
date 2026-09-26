// Monetization layer — RevenueCat with Expo Go safe fallback.
//
// Contract (matches RevenueCat dashboard + Play Console to be created):
// - Entitlement: "pro"
// - Offering: "default"
// - Subscription: learnspeak_pro_monthly (Pro mensual, sesiones ilimitadas)
// - Consumable: learnspeak_minutes_60 (pack 60 min extra, una compra = 60 min)
// - Free tier: 1 sesion/dia (contador local; AsyncStorage cuando haya tiempo)
//
// IMPORTANT: react-native-purchases has native code, Expo Go can't load it.
// This module lazy-requires it inside try/catch. In Expo Go (or without keys)
// it runs in MOCK mode so the app never crashes. Real purchases work in the
// dev build / APK (EAS preview) with valid keys in .env.

const ENTITLEMENT_PRO = 'pro';

let Purchases = null;
let nativeAvailable = false;
try {
  // eslint-disable-next-line global-require
  Purchases = require('react-native-purchases').default;
  nativeAvailable = true;
} catch (e) {
  nativeAvailable = false;
}

let configured = false;
let mockPro = false;
let mockMinutes = 0;

export function isNativePurchasesAvailable() {
  return nativeAvailable;
}

export function isMockMode() {
  if (!nativeAvailable) return true;
  const androidKey = process.env.EXPO_PUBLIC_RC_ANDROID;
  const iosKey = process.env.EXPO_PUBLIC_RC_IOS;
  if (!androidKey && !iosKey) return true;
  return false;
}

export async function initMonetization() {
  if (configured) return { mode: isMockMode() ? 'mock' : 'live' };
  if (!nativeAvailable) return { mode: 'mock', reason: 'expo-go' };
  const { Platform } = require('react-native');
  const apiKey =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_RC_ANDROID
      : process.env.EXPO_PUBLIC_RC_IOS;
  if (!apiKey) return { mode: 'mock', reason: 'no-key' };
  const { LOG_LEVEL } = require('react-native-purchases');
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  await Purchases.configure({ apiKey });
  configured = true;
  return { mode: 'live' };
}

export async function isPro() {
  if (isMockMode()) return mockPro;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_PRO];
  } catch (e) {
    return false;
  }
}

export async function getOfferings() {
  if (isMockMode()) {
    return {
      mode: 'mock',
      packages: [
        { id: 'monthly', productId: 'learnspeak_pro_monthly', kind: 'subscription', title: 'Pro mensual', price: '$2.99/mes' },
        { id: 'minutes', productId: 'learnspeak_minutes_60', kind: 'consumable', title: 'Pack 60 min', price: '$0.99' },
      ],
    };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return { mode: 'live', packages: [] };
    return {
      mode: 'live',
      packages: (current.availablePackages || []).map((p) => ({
        id: p.identifier,
        productId: p.product.identifier,
        kind: p.packageType,
        title: p.product.title,
        price: p.product.priceString,
        ref: p,
      })),
    };
  } catch (e) {
    return { mode: 'live', packages: [], error: String(e?.message || e) };
  }
}

export async function buyPackage(pkg) {
  if (isMockMode()) {
    // Mock checkout so the jury can demo the flow inside Expo Go.
    if (pkg.kind === 'subscription') mockPro = true;
    if (pkg.kind === 'consumable') mockMinutes += 60;
    return { ok: true, mock: true, minutes: mockMinutes, pro: mockPro };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.ref);
    return { ok: true, pro: !!customerInfo.entitlements.active[ENTITLEMENT_PRO] };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function restore() {
  if (isMockMode()) return { ok: true, mock: true, pro: mockPro };
  try {
    const info = await Purchases.restorePurchases();
    return { ok: true, pro: !!info.entitlements.active[ENTITLEMENT_PRO] };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export function getMockBalance() {
  return { pro: mockPro, minutes: mockMinutes };
}
