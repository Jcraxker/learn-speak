import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Chat from './src/components/Chat';
import Login from './src/components/Login';
import Paywall from './src/components/Paywall';
import SessionBar from './src/components/SessionBar';
import Setup from './src/components/Setup';
import { C } from './src/theme';
import { getFeedback, sendMessage } from './src/lib/ai';
import { canStartFree, markFreeUsed } from './src/lib/freelimit';
import { useGoogleUser } from './src/lib/googleauth';
import { initMonetization, isMockMode, isPro } from './src/lib/monetization';
import { cleanText } from './src/lib/text';
import { speak, stopSpeak } from './src/lib/voice';

// Flow: login -> setup -> chat (timer) -> fin (feedback). Free: paywall gate, Pro skips it.
export default function App() {
  const [fase, setFase] = useState('login');
  const [config, setConfig] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [pensando, setPensando] = useState(false);
  const [pro, setPro] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [planChecked, setPlanChecked] = useState(false);
  const pendingStart = useRef(null);
  const g = useGoogleUser();

  useEffect(() => {
    (async () => {
      await initMonetization();
      setPro(await isPro());
      setPlanChecked(true);
    })();
  }, []);

  async function startSession(cfg) {
    if (pro) {
      begin(cfg);
      return;
    }
    if (await canStartFree()) {
      await markFreeUsed();
      begin(cfg);
      return;
    }
    pendingStart.current = cfg;
    setPaywall(true);
  }

  async function begin(cfg) {
    setConfig(cfg);
    setMensajes([]);
    setFeedback('');
    setBloqueado(false);
    setFase('chat');
    setPensando(true);
    const saludo = cleanText(await sendMessage([], cfg));
    setMensajes([{ rol: 'ai', texto: saludo }]);
    setPensando(false);
    speak(saludo, cfg.direccion === 'en-es' ? 'en' : 'es');
  }

  async function onPaywallClose(plan, res) {
    setPaywall(false);
    if (plan && res?.ok) {
      setPro(plan === 'pro' ? true : await isPro());
      if (pendingStart.current) begin(pendingStart.current);
      pendingStart.current = null;
    } else if (pro && pendingStart.current) {
      begin(pendingStart.current);
      pendingStart.current = null;
    }
  }

  async function onSend(texto) {
    const nuevos = [...mensajes, { rol: 'user', texto }];
    setMensajes(nuevos);
    setPensando(true);
    const reply = cleanText(await sendMessage(nuevos, config));
    setMensajes([...nuevos, { rol: 'ai', texto: reply }]);
    setPensando(false);
    speak(reply, config.direccion === 'en-es' ? 'en' : 'es');
  }

  async function onTerminar() {
    stopSpeak();
    setBloqueado(true);
    setFase('fin');
    const fb = cleanText(await getFeedback(mensajes, { nivel: config.nivel, direccion: config.direccion }));
    setFeedback(fb);
  }

  function otra() {
    setFase('setup');
    setConfig(null);
    setMensajes([]);
    setFeedback('');
  }

  useEffect(() => {
    if (g.user && fase === 'login') setFase('setup');
  }, [g.user]);

  if (!planChecked) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>LearnSpeak...</Text>
      </SafeAreaView>
    );
  }

  if (fase === 'login') {
    return (
      <SafeAreaView style={styles.full}>
        <StatusBar />
        <Login busy={g.busy} error={g.error} canLogin={!!g.request} onLogin={g.login} onGuest={g.guest} />
      </SafeAreaView>
    );
  }

  if (fase === 'setup') {
    return (
      <SafeAreaView style={styles.full}>
        <StatusBar />
        {!pro && (
          <Pressable style={styles.pro} onPress={() => setPaywall(true)}>
            <Text style={styles.proText}>
              {g.user?.guest ? 'Invitado' : g.user?.name || 'Free'} · 1 sesion/dia{isMockMode() ? ' · demo' : ''} — Ver Pro
            </Text>
          </Pressable>
        )}
        <Setup onStart={startSession} />
        <Paywall visible={paywall} onClose={onPaywallClose} />
      </SafeAreaView>
    );
  }

  if (fase === 'fin') {
    return (
      <SafeAreaView style={styles.full}>
        <StatusBar />
        <View style={styles.fin}>
          <Text style={styles.title}>Sesion terminada</Text>
          <Text style={styles.feedback}>{feedback || 'Generando resumen...'}</Text>
          {!!feedback && (
            <Pressable style={styles.listen} onPress={() => speak(feedback, config.direccion === 'en-es' ? 'en' : 'es')}>
              <Text>Escuchar resumen</Text>
            </Pressable>
          )}
          <Pressable style={styles.go} onPress={otra}>
            <Text style={styles.goText}>Otra sesion</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.full}>
      <StatusBar />
      <SessionBar duracionMin={config.duracionMin} onTerminar={onTerminar} />
      <Chat
        mensajes={mensajes}
        onSend={onSend}
        bloqueado={bloqueado}
        lang={config.direccion === 'en-es' ? 'en' : 'es'}
      />
      {pensando && <Text style={styles.typing}>Profesor escribiendo...</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pro: { padding: 11, alignItems: 'center', backgroundColor: C.soft, borderBottomWidth: 1, borderColor: C.line },
  proText: { fontSize: 13, fontWeight: '700', color: C.ink },
  fin: { flex: 1, padding: 22, gap: 12, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: C.ink },
  feedback: { fontSize: 15, lineHeight: 22, color: C.ink },
  listen: { padding: 10 },
  go: { backgroundColor: C.ink, borderRadius: 12, padding: 16, alignItems: 'center' },
  goText: { color: '#fff', fontWeight: '800' },
  typing: { fontSize: 12, fontStyle: 'italic', color: C.muted, paddingHorizontal: 12, paddingBottom: 8 },
});
