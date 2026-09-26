import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isRecorderAvailable, speak, stopSpeak, toggleRecord, transcribeAudio } from '../lib/voice';

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
    try {
      const r = await toggleRecord();
      if (r.recording) {
        setGrabando(true);
        return;
      }
      setGrabando(false);
      setSttMsg('Transcribiendo...');
      const t = await transcribeAudio(r.uri);
      setSttMsg('');
      if (t) onSend(t);
    } catch (e) {
      setGrabando(false);
      const m = String(e?.message || e);
      setSttMsg(m === 'mic-denied' ? 'Permiso de microfono denegado, usa el teclado.' : 'No se pudo transcribir, usa el teclado.');
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
            <Text>{item.texto}</Text>
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
  wrap: { flex: 1 },
  list: { flex: 1, padding: 12 },
  bubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  user: { backgroundColor: '#c2c1ff', alignSelf: 'flex-end' },
  ai: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  listen: { marginTop: 6 },
  listenText: { fontSize: 12, fontWeight: '600', opacity: 0.6 },
  stt: { fontSize: 12, fontStyle: 'italic', opacity: 0.6, paddingHorizontal: 12 },
  row: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  send: { backgroundColor: '#131317', borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
  mic: { borderWidth: 1, borderColor: '#131317', borderRadius: 20, paddingHorizontal: 12, justifyContent: 'center' },
  micOn: { backgroundColor: '#f5b2e0' },
});
