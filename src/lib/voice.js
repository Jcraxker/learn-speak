// Voice layer on expo-audio (Expo Go compatible, SDK 57 maintained).
// TTS priority: Gemini neural voice (natural, Kore ES / Puck EN) -> best
// device voice -> silent. STT: record (auto-stop on silence) -> Gemini.
// Text input always stays as fallback.

import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';

const TTS_MODEL = 'gemini-3.8-flash-tts';
const VOICE_BY_LANG = { es: 'Kore', en: 'Puck' };
const VOICE_DB = -38; // trigger on voice (accessible on phone mics)
const SILENCE_DB = -48; // silence floor with hysteresis gap
const MIN_VOICE_MS = 400; // ignore very short clicks, trigger on actual words
const SILENCE_MS = 1500; // auto-send after 1.5s silence
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
  await FileSystem.writeAsStringAsync(uri, cleanWavFromB64(b64), { encoding: 'base64' });
  stopSpeak();
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  currentPlayer = createAudioPlayer(uri);
  currentPlayer.play();
}

// Cleans Gemini TTS audio output:
// 1. If Gemini returns a complete WAV (RIFF...WAVE), parses the 'data' chunk,
//    truncates non-audio metadata (like C2PA provenance chunks that caused the loud pop/explosion sound),
//    and adjusts the RIFF header.
// 2. Applies a smooth 15ms linear fade-out to zero on the final audio samples to eliminate clicks.
// 3. If raw PCM is returned, wraps it with a proper 44-byte WAV header.
function cleanWavFromB64(b64) {
  const bin = atob(b64);
  const n = bin.length;
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) raw[i] = bin.charCodeAt(i);

  const isRiff = raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46;
  const isWave = raw[8] === 0x57 && raw[9] === 0x41 && raw[10] === 0x56 && raw[11] === 0x45;

  let outBuf;
  if (isRiff && isWave) {
    let dataOffset = -1;
    for (let i = 12; i < raw.length - 8; i++) {
      if (raw[i] === 0x64 && raw[i + 1] === 0x61 && raw[i + 2] === 0x74 && raw[i + 3] === 0x61) {
        dataOffset = i;
        break;
      }
    }

    if (dataOffset !== -1) {
      const view = new DataView(raw.buffer);
      const dataSize = view.getUint32(dataOffset + 4, true);
      const audioEnd = Math.min(raw.length, dataOffset + 8 + dataSize);
      // Strip trailing metadata chunks (C2PA)
      outBuf = raw.slice(0, audioEnd);

      const outView = new DataView(outBuf.buffer);
      outView.setUint32(4, audioEnd - 8, true);

      // Smooth 15ms linear fade-out on the final 360 samples (16-bit mono 24kHz = 2 bytes/sample)
      const pcmStart = dataOffset + 8;
      const numSamples = Math.floor((audioEnd - pcmStart) / 2);
      const fadeSamples = Math.min(360, numSamples);
      const fadeStart = numSamples - fadeSamples;

      for (let s = 0; s < fadeSamples; s++) {
        const bytePos = pcmStart + (fadeStart + s) * 2;
        const val = outView.getInt16(bytePos, true);
        const factor = 1.0 - s / fadeSamples;
        outView.setInt16(bytePos, Math.round(val * factor), true);
      }
    } else {
      outBuf = raw;
    }
  } else {
    // Raw PCM fallback: wrap with 44-byte WAV header
    outBuf = new Uint8Array(44 + n);
    const view = new DataView(outBuf.buffer);
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
    outBuf.set(raw, 44);
  }

  let str = '';
  const CH = 0x8000;
  for (let i = 0; i < outBuf.length; i += CH) {
    str += String.fromCharCode.apply(null, outBuf.subarray(i, i + CH));
  }
  return btoa(str);
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
// onLevel(0..1) fires every 300ms with normalised mic energy for the VoiceOrb.
export async function startSmartRecord({ onAutoStop, onLevel }) {
  stopSpeak(); // cut professor audio so mic doesn't capture it
  await stopSmartRecord(); // clean up any active session or dangling meter timer
  console.log('[mic] requesting permission');
  const perm = await AudioModule.requestRecordingPermissionsAsync();
  console.log('[mic] permission granted:', perm.granted);
  if (!perm.granted) throw new Error('mic-denied');
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

  const isAndroid = Platform.OS === 'android';

  // Standard Expo Audio options format
  const recordingOptions = {
    extension: '.m4a',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    isMeteringEnabled: true,
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      audioSource: 'mic',
    },
    ios: {
      outputFormat: 'aac ',
      audioQuality: 127,
    },
  };

  // Flattened options for direct native AudioRecorder constructor
  const nativeConstructorOptions = isAndroid
    ? {
        extension: '.m4a',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 32000,
        isMeteringEnabled: true,
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
        audioSource: 'mic',
      }
    : {
        extension: '.m4a',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 32000,
        isMeteringEnabled: true,
        outputFormat: 'aac ',
        audioQuality: 127,
      };

  recorder = new AudioModule.AudioRecorder(nativeConstructorOptions);
  await recorder.prepareToRecordAsync(recordingOptions);
  recorder.record();
  console.log('[mic] recording started successfully');

  let quietMs = 0;
  let voiceMs = 0;
  let heardVoice = false;
  let elapsed = 0;
  let meterCount = 0;

  meterTimer = setInterval(async () => {
    try {
      if (!recorder) return;
      const st = recorder.getStatus();
      meterCount++;

      const db = typeof st?.metering === 'number' ? st.metering : -160;
      elapsed += 300;

      // Debug: log first 3 samples + every 10th
      if (meterCount <= 3 || meterCount % 10 === 0) {
        console.log(`[mic] meter #${meterCount}: ${db}dB (voice=${heardVoice}, voiceMs=${voiceMs}, quietMs=${quietMs})`);
      }

      // Feed normalised level to UI (VoiceOrb breathing: -50dB to -10dB range)
      if (typeof onLevel === 'function') {
        const norm = Math.min(1, Math.max(0, (db + 50) / 40));
        onLevel(norm);
      }

      if (db > VOICE_DB) {
        voiceMs += 300;
        quietMs = 0;
        if (voiceMs >= MIN_VOICE_MS) {
          if (!heardVoice) console.log('[mic] voice threshold reached!');
          heardVoice = true;
        }
      } else if (db < SILENCE_DB && heardVoice) {
        quietMs += 300;
        if (quietMs >= SILENCE_MS) {
          console.log('[mic] auto-stop: silence detected after voice');
          const uri = await stopSmartRecord();
          onAutoStop?.(uri);
          return;
        }
      } else if (heardVoice) {
        quietMs = 0; // speech in progress
      }

      if (elapsed >= MAX_RECORD_MS) {
        console.log('[mic] auto-stop: max duration reached');
        const uri = await stopSmartRecord();
        onAutoStop?.(uri);
      }
    } catch (e) {
      console.log('[mic] metering interval error:', String(e?.message || e).slice(0, 80));
    }
  }, 300);

  return true;
}

export async function stopSmartRecord() {
  clearMeter();
  if (!recorder) return null;
  let uri = null;
  try {
    const status = await recorder.stop();
    console.log('[mic] recorder.stop() status:', JSON.stringify(status));
    uri = recorder.uri || status?.url;
  } catch (e) {
    console.log('[mic] recorder.stop() error:', e?.message || e);
    uri = recorder.uri;
  }
  try {
    recorder.release?.();
  } catch (e) {
    // noop
  }
  recorder = null;
  console.log('[mic] audio file uri:', uri);
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

  if (!uri) throw new Error('no-uri');
  console.log('[stt] reading audio uri:', uri);

  try {
    const info = await FileSystem.getInfoAsync(uri);
    console.log('[stt] audio file info:', JSON.stringify(info));
    if (!info.exists || info.size === 0) {
      throw new Error('empty-recording-file');
    }
  } catch (e) {
    console.log('[stt] file info check error:', e?.message || e);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  console.log('[stt] base64 read successfully, length:', base64.length);

  // Models to try in order of preference (handles 429 quota seamlessly)
  const models = ['gemini-3.8-flash', 'gemini-3.5-transcribe', 'gemini-3.5-flash-lite'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log('[stt] attempting transcribe with:', model);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: 'Repeat exactly what the person says in this audio, word for word, in the same language they speak. Do not translate. Do not answer. Do not comment. Output only the transcript, nothing else. If the audio is silent or unintelligible, output nothing.' },
                  { inlineData: { mimeType: 'audio/m4a', data: base64 } },
                ],
              },
            ],
          }),
        }
      );

      console.log(`[stt] ${model} status:`, res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.log(`[stt] ${model} error:`, errText.slice(0, 160));
        throw new Error(`http-${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim();

      console.log(`[stt] ${model} transcript result: "${text}"`);
      if (text) return text;
    } catch (e) {
      lastError = e;
      console.log(`[stt] ${model} failed, trying next:`, String(e?.message || e).slice(0, 100));
    }
  }

  throw lastError || new Error('empty-transcription');
}
