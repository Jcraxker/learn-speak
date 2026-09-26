// Free-tier gate: 1 sesion gratis por dia (persistente).
// Pro (RevenueCat) omite el limite. Mock/demo deja pasar tras paywall.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'learnspeak.freeDay';
const KEY_COUNT = 'learnspeak.freeCount';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function canStartFree() {
  try {
    const day = await AsyncStorage.getItem(KEY);
    if (day !== today()) return true;
    const count = Number((await AsyncStorage.getItem(KEY_COUNT)) || 0);
    return count < 1;
  } catch (e) {
    return true;
  }
}

export async function markFreeUsed() {
  try {
    await AsyncStorage.setItem(KEY, today());
    await AsyncStorage.setItem(KEY_COUNT, '1');
  } catch (e) {
    // storage lleno/bloqueado — no bloquea la sesion
  }
}
