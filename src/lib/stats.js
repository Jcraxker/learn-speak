// Local session stats (no backend): sessions count, minutes, per-day log.
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSIONS = 'learnspeak.stat.sessions';
const MINUTES = 'learnspeak.stat.minutes';
const LOG = 'learnspeak.stat.log'; // [{day:'2026-09-26', min:5}]

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function num(key) {
  try {
    return Number((await AsyncStorage.getItem(key)) || 0);
  } catch (e) {
    return 0;
  }
}

export async function logSession(min) {
  try {
    const day = today();
    await AsyncStorage.setItem(SESSIONS, String((await num(SESSIONS)) + 1));
    await AsyncStorage.setItem(MINUTES, String((await num(MINUTES)) + min));
    let log = [];
    try {
      log = JSON.parse((await AsyncStorage.getItem(LOG)) || '[]');
    } catch (e) {
      log = [];
    }
    const last = log[log.length - 1];
    if (last && last.day === day) last.min += min;
    else log.push({ day, min });
    await AsyncStorage.setItem(LOG, JSON.stringify(log.slice(-7)));
  } catch (e) {
    // stats never block
  }
}

export async function getStats() {
  const [sessions, minutes] = [await num(SESSIONS), await num(MINUTES)];
  let log = [];
  try {
    log = JSON.parse((await AsyncStorage.getItem(LOG)) || '[]');
  } catch (e) {
    log = [];
  }
  const max = Math.max(1, ...log.map((d) => d.min));
  return { sessions, minutes, log, max };
}
