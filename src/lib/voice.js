// Voice layer: TTS out + STT in.
// TTS priority: Gemini neural voice (24kHz, natural) -> device voice (best
// available) -> silent. Neural playback via expo-av, works in Expo Go.
// STT: expo-av record (auto-stop on silence) -> Gemini transcription.
// Text input always stays as fallback.

import * as Speech from 'expo-speech';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE_BY_LANG = { es: 'Kore', en: 'Puck' };

let Av = null;
try {
  // eslint-disable-next-line global-require
  Av = require('expo-av');
} catch (e) {
  Av = null;
}

let bestVoice = null;

async function pickBestVoice(lang) {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const prefix = lang === 'es' ? 'es' : 'en';
    const pool = voices.filter((v) => (v.language || '').toLowerCase().startsWith(prefix));
    if (!pool.length) return null;
    const scored = pool.map((v) => ({
      v,
      score:
        (v.network ? 2 : 0) +
        (/enhanced|premium|neural|natural/i.test(`${v.name} ${v.quality}`) ? 2 : 0) +
        (/google/i.test(v.name || '') ? 1 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].v.identifier;
  } catch (e) {
    return null;
  }
}

export async function speak(text, lang) {
  // 1) Neural voice (Gemini TTS). Falls through on any error.
  try {
    await speakNeural(text, lang);
    return;
  } catch (e) {
    // continue to device voice
  }
  // 2) Best device voice.
  try {
    await Speech.stop();
    if (!bestVoice || bestVoice.lang !== lang) {
      bestVoice = { lang, id: await pickBestVoice(lang) };
    }
    await Speech.speak(text, {
      language: lang === 'es' ? 'es-ES' : 'en-US',
      voice: bestVoice.id || undefined,
      rate: 0.95,
    });
  } catch (e) {
    // TTS unavailable on device — silent, text stays visible.
  }
}

let currentSound = null;

export async function speakNeural(text, lang) {
  const key = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (!key) throw new Error('no-key');
  if (!Av) throw new Error('recorder-unavailable');
  const { Audio } = Av;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text.slice(0, 900) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOICE_BY_LANG[lang] || 'Kore' },
            },
          },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`http-${res.status}`);
  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('empty-audio');
  const FileSystem = require('expo-file-system/legacy');
  const uri = `${FileSystem.cacheDirectory}tts-${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(uri, wavFromPcmB64(b64), { encoding: 'base64' });
  await stopSpeak();
  if (currentSound) {
    try {
      await currentSound.unloadAsync();
    } catch (e) {
      // noop
    }
    currentSound = null;
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  currentSound = sound;
}

// Gemini returns raw 16-bit mono PCM @24kHz base64. Wrap in WAV header.
function wavFromPcmB64(b64) {
  const bin = atob(b64);
  const n = bin.length;
  const buf = new Uint8Array(44 + n);
  const view = new DataView(buf.buffer);
  const wstr = (o, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  wstr(0, 'RIFF');
  view.setUint32(4, 36 + n, true);
  wstr(8, 'WAVE');
  wstr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  wstr(36, 'data');
  view.setUint32(40, n, true);
  for (let i = 0; i < n; i++) buf[44 + i] = bin.charCodeAt(i);
  let out = '';
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) {
    out += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
  }
  return btoa(out);
}

export function stopSpeak() {
  try {
    Speech.stop();
  } catch (e) {
    // noop
  }
  if (currentSound) {
    currentSound.unloadAsync().catch(() => {});
    currentSound = null;
  }
}

export function isRecorderAvailable() {
  return !!Av;
}

let recording = null;
let meterTimer = null;

// Smart record: starts mic and auto-stops after ~1.8s of silence (metering).
// Pure JS + expo-av, works in Expo Go. Callbacks keep Chat UI live.
// onLevel(db) -> live meter (-160..0). onAutoStop(uri) -> silence detected.
export async function startSmartRecord({ onLevel, onAutoStop }) {
  if (!Av) throw new Error('recorder-unavailable');
  const { Audio } = Av;
  stopSpeak(); // cut professor audio so mic doesn't capture it
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error('mic-denied');
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  await recording.startAsync();

  let quietMs = 0;
  let heardVoice = false;
  meterTimer = setInterval(async () => {
    try {
      const st = await recording.getStatusAsync();
      if (!st.canRecord) return;
      const db = st.metering ?? -160;
      onLevel?.(db);
      if (db > -38) {
        heardVoice = true;
        quietMs = 0;
      } else if (heardVoice) {
        quietMs += 300;
        if (quietMs >= 1800) {
          const uri = await stopSmartRecord();
          onAutoStop?.(uri);
        }
      }
    } catch (e) {
      // metering hiccup — ignore, keep recording
    }
  }, 300);
  return true;
}

export async function stopSmartRecord() {
  if (meterTimer) {
    clearInterval(meterTimer);
    meterTimer = null;
  }
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
  } catch (e) {
    // already stopped
  }
  const uri = recording.getURI();
  recording = null;
  return uri;
}

export function isSmartRecording() {
  return !!recording;
}

export async function toggleRecord() {
  if (!Av) throw new Error('recorder-unavailable');
  const { Audio } = Av;
  if (recording) {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;
    return { done: true, uri };
  }
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error('mic-denied');
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  return { done: false, recording: true };
}

// Sends recorded audio to Gemini for transcription. Returns text or throws.
export async function transcribeAudio(uri) {
  const FileSystem = require('expo-file-system/legacy');
  const key = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (!key) throw new Error('no-key');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'Transcribe este audio exactamente, sin comentarios. Solo el texto.' },
              { inline_data: { mime_type: 'audio/m4a', data: base64 } },
            ],
          },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`http-${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('empty-transcription');
  return text;
}
