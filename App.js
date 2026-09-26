import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Chat from './src/components/Chat';
import Login from './src/components/Login';
import Paywall from './src/components/Paywall';
import Profile from './src/components/Profile';
import Progress from './src/components/Progress';
import SessionBar from './src/components/SessionBar';
import Setup from './src/components/Setup';
import Tabs, { Home } from './src/components/Tabs';
import { C, T } from './src/theme';
import { getFeedback, sendMessage } from './src/lib/ai';
import { canStartFree, markFreeUsed } from './src/lib/freelimit';
import { useGoogleUser } from './src/lib/googleauth';
import { initMonetization, isMockMode, isPro } from './src/lib/monetization';
import { logScore, logSession, parseScore } from './src/lib/stats';
import { cleanText } from './src/lib/text';
import { speak, stopSpeak } from './src/lib/voice';

// Flow: login -> tabs(home|practice|progress|profile) -> live -> score.
// Design adapted from Oliver & Henry UI/UX (Figma Make).
export default function App() {
  const [fase, setFase] = useState('login');
  const [tab, setTab] = useState('home');
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

  useEffect(() => {
    if (g.user && fase === 'login') {
      setFase('tabs');
      setTab('home');
    }
  }, [g.user]);

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
    setFase('live');
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
    if (pensando || bloqueado) return;
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
    setFase('score');
    const fb = cleanText(await getFeedback(mensajes, { nivel: config.nivel, direccion: config.direccion }));
    setFeedback(fb);
    await logSession(config.duracionMin);
    await logScore(parseScore(fb));
  }

  function logout() {
    stopSpeak();
    g.logout();
    setFase('login');
    setTab('home');
    setConfig(null);
    setMensajes([]);
    setFeedback('');
  }

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

  if (fase === 'tabs') {
    return (
      <SafeAreaView style={styles.full}>
        <StatusBar />
        <View style={styles.body}>
          {tab === 'home' && (
            <Home user={g.user} pro={pro} goPractice={() => setTab('practice')} openPaywall={() => setPaywall(true)} />
          )}
          {tab === 'practice' && <Setup onStart={startSession} />}
          {tab === 'progress' && <Progress pro={pro} openPaywall={() => setPaywall(true)} />}
          {tab === 'profile' && (
            <Profile user={g.user} pro={pro} nivel={config?.nivel} openPaywall={() => setPaywall(true)} onLogout={logout} />
          )}
        </View>
        <Tabs tab={tab} setTab={setTab} />
        <Paywall visible={paywall} onClose={onPaywallClose} />
      </SafeAreaView>
    );
  }

  if (fase === 'score') {
    const nota = parseScore(feedback);
    return (
      <SafeAreaView style={styles.full}>
        <StatusBar />
        <ScrollView contentContainerStyle={styles.score}>
          <Text style={styles.eyebrow}>SESSION COMPLETE</Text>
          <Text style={styles.h1}>Great{'\n'}conversation.</Text>
          <View style={styles.hero}>
            <View style={styles.ring}>
              <Text style={styles.ringN}>{nota ?? '–'}</Text>
              <Text style={styles.ringS}>/ 100</Text>
            </View>
            <View style={styles.heroT}>
              <Text style={styles.eyebrow2}>CONVERSATION SCORE</Text>
              <Text style={styles.heroH}>{nota != null && nota >= 70 ? 'Great conversation' : 'Good practice'}</Text>
            </View>
          </View>
          <Text style={styles.feedback}>{feedback || 'Generando resumen...'}</Text>
          {!!feedback && (
            <Pressable style={styles.listen} onPress={() => speak(feedback, config.direccion === 'en-es' ? 'en' : 'es')}>
              <Text style={styles.listenT}>Escuchar resumen</Text>
            </Pressable>
          )}
          <Pressable style={styles.go} onPress={() => { setTab('practice'); setFase('tabs'); }}>
            <Text style={styles.goT}>Practice again →</Text>
          </Pressable>
          <Pressable style={styles.home} onPress={() => { setTab('home'); setFase('tabs'); }}>
            <Text style={styles.homeT}>Back to home</Text>
          </Pressable>
        </ScrollView>
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
        ocupado={pensando}
        thinking={pensando}
        voiceMode={config.voice !== false}
        lang={config.direccion === 'en-es' ? 'en' : 'es'}
      />
      {pensando && <Text style={styles.typing}>Thinking about that…</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  eyebrow: { fontSize: T.eyebrow, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  h1: { fontSize: 30, fontWeight: '800', color: C.navy, lineHeight: 32 },
  score: { padding: 20, gap: 12, backgroundColor: C.paper, flexGrow: 1 },
  hero: { flexDirection: 'row', gap: 16, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 19, padding: 18 },
  ring: { width: 91, height: 91, borderRadius: 46, backgroundColor: C.tealPale, borderWidth: 7, borderColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  ringN: { fontSize: 24, fontWeight: '800', color: C.navy },
  ringS: { fontSize: 9, color: C.muted },
  heroT: { flex: 1 },
  eyebrow2: { fontSize: 9, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  heroH: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  feedback: { fontSize: 14, lineHeight: 21, color: C.ink },
  listen: { padding: 10, alignItems: 'center' },
  listenT: { color: C.blue, fontWeight: '700' },
  go: { backgroundColor: C.navy, borderRadius: 15, padding: 16, alignItems: 'center', marginTop: 8 },
  goT: { color: '#fff', fontWeight: '800' },
  home: { padding: 12, alignItems: 'center' },
  homeT: { color: C.blue, fontWeight: '600', fontSize: 12 },
  typing: { fontSize: 12, fontStyle: 'italic', color: C.muted, paddingHorizontal: 12, paddingBottom: 8 },
});
