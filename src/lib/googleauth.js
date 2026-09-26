import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

// Google login (OAuth client ID solo en .env local, nunca en git).
// Expo Go: proxy de Expo. APK: cliente Android nativo (package + SHA-1
// registrados en Cloud Console). Siempre hay modo invitado de respaldo.
const ANDROID_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export function useGoogleUser() {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_ID,
    expoClientId: ANDROID_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error' || response?.type === 'dismiss') {
        setBusy(false);
      }
      return;
    }
    (async () => {
      try {
        const token = response.authentication?.accessToken;
        if (!token) throw new Error('no-token');
        const r = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(`http-${r.status}`);
        const me = await r.json();
        setUser({ name: me.name, email: me.email, photo: me.picture });
      } catch (e) {
        setError('No se pudo leer tu perfil, entra como invitado.');
      } finally {
        setBusy(false);
      }
    })();
  }, [response]);

  async function login() {
    setError('');
    if (!ANDROID_ID) {
      setError('Falta configurar el login (ID no cargado).');
      return;
    }
    setBusy(true);
    try {
      await promptAsync();
    } catch (e) {
      setBusy(false);
      setError('No se pudo abrir el login de Google.');
    }
  }

  function guest() {
    setUser({ name: 'Invitado', email: '', photo: null, guest: true });
  }

  function logout() {
    setUser(null);
  }

  return { user, busy, error, request, login, guest, logout };
}

export function isExpoGo() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}
