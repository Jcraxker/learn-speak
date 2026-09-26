// Voice layer: TTS out (expo-speech) + STT in (expo-av record -> Gemini).
// TTS works everywhere including Expo Go. STT needs mic permission;
// on any failure the text input stays as fallback, STT never blocks.

import * as Speech from 'expo-speech';

let Av = null;
try {
  // eslint-disable-next-line global-require
  Av = require('expo-av');
} catch (e) {
  Av = null;
}

export function speak(text, lang) {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: lang === 'es' ? 'es-ES' : 'en-US',
      rate: 0.95,
    });
  } catch (e) {
    // TTS unavailable on device — silent, text stays visible.
  }
}

export function stopSpeak() {
  try {
    Speech.stop();
  } catch (e) {
    // noop
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
