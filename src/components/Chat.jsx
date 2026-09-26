import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, R, T } from '../theme';
import { isRecorderAvailable, speak, stopSpeak, startSmartRecord, stopSmartRecord, transcribeAudio } from '../lib/voice';

// Props: mensajes [{rol, texto}], onSend(texto), bloqueado, lang ('es'|'en' for TTS)
// Texto siempre disponible; microfono opcional con fallback a teclado.
export default function Chat({ mensajes, onSend, bloqueado, lang }) {
  const [texto, setTexto] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [sttMsg, setSttMsg] = useState('');
  const list = useRef(null);

  function enviar() {
    const t = texto.trim();
    if (!t || bloqueado) return;
    setTexto('');
    onSend(t);
  }

  async function microfono() {
    if (bloqueado) return;
    setSttMsg('');
    // Manual stop while recording.
    if (grabando) {
      try {
        const uri = await stopSmartRecord();
        setGrabando(false);
        if (uri) {
          setSttMsg('Transcribiendo...');
          const t = await transcribeAudio(uri);
          setSttMsg('');
          if (t) onSend(t);
        } else {
          setSttMsg('');
        }
      } catch (e) {
        setGrabando(false);
        setSttMsg('No se pudo transcribir, usa el teclado.');
      }
      return;
    }
    try {
      await startSmartRecord({
        onLevel: () => {},
        onAutoStop: async (uri) => {
          setGrabando(false);
          if (!uri) {
            setSttMsg('');
            return;
          }
          setSttMsg('Transcribiendo...');
          try {
            const t = await transcribeAudio(uri);
            setSttMsg('');
            if (t) onSend(t);
          } catch (e) {
            setSttMsg('No se pudo transcribir, usa el teclado.');
          }
        },
      });
      setGrabando(true);
      setSttMsg('Habla... se envia solo al callar.');
    } catch (e) {
      const m = String(e?.message || e);
      setSttMsg(m === 'mic-denied' ? 'Permiso de microfono denegado, usa el teclado.' : 'Microfono no disponible, usa el teclado.');
    }
  }

  return (
    <View style={styles.wrap}>
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
      {!!sttMsg && <Text style={styles.stt}>{sttMsg}</Text>}
      <View style={styles.row}>
        {isRecorderAvailable() && (
          <Pressable style={[styles.mic, grabando && styles.micOn]} onPress={microfono} disabled={bloqueado}>
            <Text>{grabando ? '■' : 'Mic'}</Text>
          </Pressable>
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
        <Pressable style={styles.send} onPress={() => { stopSpeak(); enviar(); }} disabled={bloqueado}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  list: { flex: 1, padding: 12 },
  bubble: { padding: 11, borderRadius: R.md, marginBottom: 8, maxWidth: '85%' },
  bubbleText: { fontSize: T.body, lineHeight: 21, color: C.ink },
  user: { backgroundColor: C.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  ai: { backgroundColor: C.aiBubble, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  listen: { marginTop: 6 },
  listenText: { fontSize: 12, fontWeight: '700', color: C.surface },
  stt: { fontSize: 12, fontStyle: 'italic', color: C.muted, paddingHorizontal: 12 },
  row: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  input: { flex: 1, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9, fontSize: T.body, color: C.ink },
  send: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 18, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
  mic: { borderWidth: 1.5, borderColor: C.ink, borderRadius: R.pill, paddingHorizontal: 13, justifyContent: 'center' },
  micOn: { backgroundColor: C.accent, borderColor: C.accent },
});
