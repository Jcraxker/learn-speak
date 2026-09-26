// Voice layer on expo-audio (Expo Go compatible, SDK 57 maintained).
// TTS priority: Gemini neural voice (natural, Kore ES / Puck EN) -> best
// device voice -> silent. STT: record (auto-stop on silence) -> Gemini.
// Text input always stays as fallback.

import * as Speech from 'expo-speech';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE_BY_LANG = { es: 'Kore', en: 'Puck' };
const VOICE_DB = -30; // trigger: near-mic voice (hackathon music won't reach it)
const SILENCE_DB = -40; // silence floor with hysteresis gap
const MIN_VOICE_MS = 500; // ignore very short bursts, keep single short phrases
const SILENCE_MS = 1800;
const MAX_RECORD_MS = 45000;

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

let currentPlayer = null;
let speechGen = 0; // cancels stale TTS: only latest speak() may play

function releasePlayer() {
  if (currentPlayer) {
    try {
      currentPlayer.remove();
    } catch (e) {
      // noop
    }
    currentPlayer = null;
  }
}

export async function speak(text, lang) {
  const target = lang === 'es' ? 'es' : 'en';
  const my = ++speechGen;
  try {
    await speakNeural(text, target, my);
    console.log('[tts] neural ok', target);
    return;
  } catch (e) {
    if (String(e?.message || e) === 'stale') return; // superseded, stay silent
    console.log('[tts] neural fail:', String(e?.message || e).slice(0, 160));
  }
  try {
    await Speech.stop();
    if (!bestVoice || bestVoice.lang !== target) {
      bestVoice = { lang: target, id: await pickBestVoice(target) };
    }
    await Speech.speak(text, {
      language: target === 'es' ? 'es-ES' : 'en-US',
      voice: bestVoice.id || undefined,
      rate: 0.95,
    });
    console.log('[tts] device voice:', bestVoice.id);
  } catch (e) {
    console.log('[tts] device fail:', String(e?.message || e).slice(0, 160));
  }
}

export async function speakNeural(text, lang, gen) {
  const key = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (!key) throw new Error('no-key');
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
  if (gen !== undefined && gen !== speechGen) throw new Error('stale');
  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('empty-audio');
  const FileSystem = require('expo-file-system/legacy');
  const uri = `${FileSystem.cacheDirectory}tts-${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(uri, wavFromPcmB64(b64), { encoding: 'base64' });
  stopSpeak();
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  currentPlayer = createAudioPlayer(uri);
  currentPlayer.play();
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
  speechGen++; // invalidate in-flight TTS so late audio never plays
  try {
    Speech.stop();
  } catch (e) {
    // noop
  }
  releasePlayer();
}

export async function isSpeaking() {
  try {
    if (currentPlayer) return !!currentPlayer.playing;
  } catch (e) {
    // noop
  }
  try {
    return await Speech.isSpeakingAsync();
  } catch (e) {
    return false;
  }
}

export function isRecorderAvailable() {
  return true; // expo-audio ships inside Expo Go
}

let recorder = null;
let meterTimer = null;

function clearMeter() {
  if (meterTimer) {
    clearInterval(meterTimer);
    meterTimer = null;
  }
}

// Smart record: auto-stops after SILENCE_MS of silence (metering) or
// MAX_RECORD_MS cap. onAutoStop(uri) fires on silence; manual stop via
// stopSmartRecord(). Works in Expo Go.
export async function startSmartRecord({ onAutoStop }) {
  stopSpeak(); // cut professor audio so mic doesn't capture it
  console.log('[mic] requesting permission');
  const perm = await AudioModule.requestRecordingPermissionsAsync();
  console.log('[mic] permission granted:', perm.granted);
  if (!perm.granted) throw new Error('mic-denied');
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  recorder = new AudioModule.AudioRecorder({
    extension: '.m4a',
    sampleRate: 16000, // STT-optimal, smaller upload, faster transcribe
    numberOfChannels: 1,
    bitRate: 32000,
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      audioSource: 'voice_recognition', // NS + AGC tuned for speech
    },
    ios: {
      outputFormat: 'MPEG4AAC',
      audioQuality: 'MAX',
    },
    isMeteringEnabled: true,
  });
  await recorder.prepareToRecordAsync();
  recorder.record();

  let quietMs = 0;
  let voiceMs = 0;
  let heardVoice = false;
  let elapsed = 0;
  meterTimer = setInterval(async () => {
    try {
      const st = recorder.getStatus();
      const db = st?.metering;
      elapsed += 300;
      if (typeof db === 'number') {
        if (db > VOICE_DB) {
          voiceMs += 300;
          quietMs = 0;
          if (voiceMs >= MIN_VOICE_MS) heardVoice = true;
        } else if (db < SILENCE_DB && heardVoice) {
          // hysteresis gap (-40..-30): music hum, hold last state
          quietMs += 300;
          if (quietMs >= SILENCE_MS) {
            const uri = await stopSmartRecord();
            onAutoStop?.(uri);
            return;
          }
        } else if (heardVoice) {
          quietMs = 0; // in-between band: speaking continues
        }
      }
      if (elapsed >= MAX_RECORD_MS) {
        const uri = await stopSmartRecord();
        onAutoStop?.(uri);
      }
    } catch (e) {
      // metering hiccup — ignore, keep recording
    }
  }, 300);
  return true;
}

export async function stopSmartRecord() {
  clearMeter();
  if (!recorder) return null;
  try {
    await recorder.stop();
  } catch (e) {
    // already stopped
  }
  const uri = recorder.uri;
  try {
    recorder.release?.();
  } catch (e) {
    // noop
  }
  recorder = null;
  return uri;
}

export function isSmartRecording() {
  return !!recorder;
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
              { text: 'Repeat exactly what the person says, word for word, in the same language they speak. Do not translate. Do not answer. Do not comment. Output only the transcript, nothing else.' },
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
