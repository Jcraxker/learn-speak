import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, R, T } from '../theme';
import { isSpeaking, speak, stopSpeak, startSmartRecord, stopSmartRecord, transcribeAudio } from '../lib/voice';
import VoiceOrb from './VoiceOrb';

// Props: mensajes [{rol, texto}], onSend(texto), bloqueado, lang ('es'|'en' for TTS)
// Texto siempre disponible; microfono opcional con fallback a teclado.
export default function Chat({ mensajes, onSend, bloqueado, lang, ocupado, voiceMode = true, thinking }) {
  const [texto, setTexto] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [level, setLevel] = useState(0);
  const [seg, setSeg] = useState(0);
  const [sttMsg, setSttMsg] = useState('');
  const list = useRef(null);

  useEffect(() => {
    if (!grabando) {
      setSeg(0);
      setLevel(0);
      return;
    }
    const id = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [grabando]);

  useEffect(() => {
    const id = setInterval(async () => {
      setHablando(await isSpeaking());
    }, 700);
    return () => clearInterval(id);
  }, []);

  const orbState = grabando ? 'listening' : ocupado ? 'thinking' : hablando ? 'speaking' : 'idle';

  function enviar() {
    const t = texto.trim();
    if (!t || bloqueado || ocupado) return;
    setTexto('');
    onSend(t);
  }

  const orbLabel =
    orbState === 'listening' ? 'Toca para enviar · se envía solo al callar'
    : orbState === 'thinking' ? 'Thinking about that…'
    : orbState === 'speaking' ? 'Your tutor is speaking — toca el orbe para callarlo'
    : 'Toca el orbe y habla';
  function buzz(kind) {
    try {
      if (kind === 'ok') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // haptics unsupported — silent
    }
  }

  async function transcribeOnce(uri, retry) {
    try {
      return await transcribeAudio(uri);
    } catch (e) {
      if (retry && String(e?.message || e) === 'empty-transcription') {
        return await transcribeAudio(uri); // 1 auto-retry on network blip
      }
      throw e;
    }
  }

  async function deliver(uri) {
    if (!uri) {
      setSttMsg('');
      return;
    }
    setSttMsg('Transcribiendo...');
    try {
      const t = await transcribeOnce(uri, true);
      setSttMsg('');
      buzz('ok');
      if (t) onSend(t);
    } catch (e) {
      setSttMsg('No te escuche bien, toca el orbe e intenta de nuevo.');
    }
  }

  async function microfono() {
    if (bloqueado) return;
    if (hablando && !grabando) {
      stopSpeak(); // interrumpir al profesor (barge-in)
      buzz('tap');
      return;
    }
    setSttMsg('');
    // Manual stop while recording.
    if (grabando) {
      buzz('tap');
      try {
        const uri = await stopSmartRecord();
        setGrabando(false);
        await deliver(uri);
      } catch (e) {
        setGrabando(false);
        setSttMsg('No te escuche bien, toca el orbe e intenta de nuevo.');
      }
      return;
    }
    try {
      await startSmartRecord({
        onLevel: (db) => setLevel(Math.min(1, Math.max(0, (db + 50) / 40))),
        onAutoStop: async (uri) => {
          setGrabando(false);
          await deliver(uri);
        },
      });
      setGrabando(true);
      buzz('tap');
      setSttMsg('Habla... se envia solo al callar.');
    } catch (e) {
      const m = String(e?.message || e);
      console.log('[mic] start fail:', m.slice(0, 160));
      setSttMsg(m === 'mic-denied' ? 'Permiso de microfono denegado, usa el teclado.' : 'Microfono no disponible, usa el teclado.');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.state}>
        <View style={styles.orb} />
        <Text style={styles.stateT}>
          {bloqueado ? 'Conversation ended' : thinking ? 'Thinking about that…' : grabando ? 'I’m listening' : 'Your tutor is ready'}
        </Text>
      </View>
      <FlatList
        ref={list}
        data={mensajes}
        keyExtractor={(_, i) => String(i)}
        style={styles.list}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.rol === 'user' ? styles.user : styles.ai]}>
            <Text style={styles.bubbleText}>{item.texto}</Text>
            {item.rol === 'ai' && (
              <Pressable onPress={() => speak(item.texto, lang)} style={styles.listen}>
                <Text style={styles.listenText}>Escuchar</Text>
              </Pressable>
            )}
          </View>
        )}
      />
      <Text style={styles.orbHint}>{orbLabel}</Text>
      {!!sttMsg && <Text style={styles.stt}>{grabando ? `● REC ${seg}s — ${sttMsg}` : sttMsg}</Text>}
      <View style={styles.row}>
        {voiceMode && (
          <VoiceOrb state={orbState} seconds={seg} level={level} onPress={microfono} disabled={bloqueado} />
        )}
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder={bloqueado ? 'Sesion terminada' : 'Escribe...'}
          placeholderTextColor={C.muted}
          editable={!bloqueado}
          onSubmitEditing={enviar}
        />
        <Pressable style={[styles.send, ocupado && styles.sendOff]} onPress={() => { stopSpeak(); enviar(); }} disabled={bloqueado || ocupado}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line },
  orb: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.teal },
  stateT: { fontSize: 12, color: C.muted, fontWeight: '600' },
  list: { flex: 1, padding: 12 },
  bubble: { padding: 11, borderRadius: R.md, marginBottom: 8, maxWidth: '85%' },
  bubbleText: { fontSize: T.body, lineHeight: 21, color: C.ink },
  user: { backgroundColor: C.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  ai: { backgroundColor: C.aiBubble, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  listen: { marginTop: 6 },
  listenText: { fontSize: 12, fontWeight: '700', color: C.surface },
  stt: { fontSize: 12, fontStyle: 'italic', color: C.muted, paddingHorizontal: 12 },
  orbHint: { fontSize: 11, color: C.muted, textAlign: 'center', paddingTop: 2 },
  row: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  input: { flex: 1, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9, fontSize: T.body, color: C.ink },
  send: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 18, justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700' },
  mic: { borderWidth: 1.5, borderColor: C.ink, borderRadius: R.pill, paddingHorizontal: 13, justifyContent: 'center' },
  micOn: { backgroundColor: C.accent, borderColor: C.accent },
});
