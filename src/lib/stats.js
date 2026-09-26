// Local session stats (no backend): sessions count, minutes, per-day log.
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSIONS = 'learnspeak.stat.sessions';
const MINUTES = 'learnspeak.stat.minutes';
const LOG = 'learnspeak.stat.log'; // [{day:'2026-09-26', min:5}]
const SCORES = 'learnspeak.stat.scores'; // [82, 91]

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
  let scores = [];
  try {
    log = JSON.parse((await AsyncStorage.getItem(LOG)) || '[]');
    scores = JSON.parse((await AsyncStorage.getItem(SCORES)) || '[]');
  } catch (e) {
    log = [];
  }
  const max = Math.max(1, ...log.map((d) => d.min));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return { sessions, minutes, log, max, scores, avg };
}

export function parseScore(feedback) {
  if (!feedback) return null;
  const str = String(feedback);

  // Pattern 1: Explicit score out of 100 (e.g., "Puntaje: 85/100", "85/100", "85 / 100", "85 de 100")
  const m1 = str.match(/(?:puntaje|score|nota|calificaci[oó]n)?[:\s]*(\d{1,3})\s*(?:\/|\s*de\s*|\s*sobre\s*)\s*100/i);
  if (m1) {
    const n = Number(m1[1]);
    if (n >= 0 && n <= 100) return n;
  }

  // Pattern 2: "Puntaje: 85" or "Nota: 85" or "Score: 85"
  const m2 = str.match(/(?:puntaje|score|nota|calificaci[oó]n)[:\s]+(\d{1,3})\b/i);
  if (m2) {
    const n = Number(m2[1]);
    if (n >= 0 && n <= 100) return n;
  }

  // Pattern 3: Simple standalone "85/100"
  const m3 = str.match(/\b(\d{1,3})\s*\/\s*100\b/);
  if (m3) {
    const n = Number(m3[1]);
    if (n >= 0 && n <= 100) return n;
  }

  return null;
}

export async function logScore(n) {
  if (n == null) return;
  try {
    let scores = [];
    try {
      scores = JSON.parse((await AsyncStorage.getItem(SCORES)) || '[]');
    } catch (e) {
      scores = [];
    }
    scores.push(n);
    await AsyncStorage.setItem(SCORES, JSON.stringify(scores.slice(-20)));
  } catch (e) {
    // noop
  }
}
