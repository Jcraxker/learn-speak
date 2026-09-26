// AI layer — direct Gemini call, no server (hackathon decision D2).
// Primary: gemini-3.5-flash-lite (verified 2026-09-26). Fallback: gemini-3.5-flash.
// gemini-2.5-flash returns 404 for new accounts — do NOT use.
//
// Contract:
// - sendMessage(history, { nivel, direccion, tema }) -> string (tutor reply)
// - getFeedback(history, { nivel, direccion }) -> string (3 bullets + score)
// - history: [{ rol: 'user' | 'ai', texto: string }]

const PRIMARY = 'gemini-3.5-flash-lite';
const FALLBACK = 'gemini-3.5-flash';
const TIMEOUT_MS = 20000;

const BANNED = [
  'delve', 'tapestry', 'realm', 'landscape', 'beacon', 'nuances', 'testament',
  'pivotal', 'intricate', 'crucial', 'dynamic', 'multifaceted', 'robust',
  'leverage', 'underscore', 'harness', 'embark', 'dive into', 'navigate',
  'furthermore', 'consequently', 'nevertheless', 'albeit', 'moreover',
];

function buildSystem(nivel, direccion, tema) {
  const en = direccion === 'en-es';
  const lang = en
    ? 'practica ingles (responde en ingles salvo que el usuario escriba en español)'
    : 'practica español (responde en español salvo que el usuario escriba en ingles)';
  const markers = en
    ? 'Usa marcadores hablados (well, look, you know, I mean, right, so) y posturas (I think, I guess, I mean).'
    : 'Usa muletillas habladas (bueno, o sea, pues, mira, ¿sabes?) con medida.';
  const simple = ['A1', 'A2'].includes(nivel)
    ? 'Frases muy cortas y simples, una idea por oracion. '
    : '';
  return (
    `Eres profesor de idiomas HABLADO en LearnSpeak, no un libro. Nivel ${nivel}, tema ${tema}, ${lang}. ` +
    `Detecta el idioma del ultimo mensaje del usuario y responde SIEMPRE en ese mismo idioma. ` +
    `Maximo 45 palabras, oraciones cortas coordinadas (and, but, so / y, pero, entonces). ` +
    `Voz activa con I/you (yo/tu), pronombres y elipsis, nada de voz pasiva ni conectores formales. ` +
    `${markers} ${simple}` +
    `PROHIBIDO usar estas palabras: ${BANNED.join(', ')}. ` +
    `Si el mensaje del usuario es confuso, pide aclaracion corta ("Sorry, you went to the...?") en vez de inventar. ` +
    `De vez en cuando (no siempre) muestra naturalidad con una micro-reparacion ("the... actually, ..."). ` +
    `Si hay un error del estudiante, agrega 1 correccion corta al final con su frase y la forma natural. ` +
    `Sino, termina con 1 pregunta corta para seguir sobre ${tema}. ` +
    `Sin markdown, sin bullets, sin emojis: texto plano para leer en voz alta.`
  );
}

function toGeminiContents(history, system) {
  const contents = [
    { role: 'user', parts: [{ text: `[INSTRUCCION SISTEMA] ${system}` }] },
    { role: 'model', parts: [{ text: 'Entendido. Empecemos.' }] },
  ];
  for (const m of history) {
    contents.push({
      role: m.rol === 'ai' ? 'model' : 'user',
      parts: [{ text: m.texto }],
    });
  }
  return contents;
}

async function callGemini(model, contents) {
  const key = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (!key) throw new Error('no-key');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: ctrl.signal,
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`http-${res.status}:${err.slice(0, 120)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim();
    if (!text) throw new Error('empty-response');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMessage(history, { nivel, direccion, tema }) {
  const topicEn = { viajes: 'travel', musica: 'music', tech: 'technology', futbol: 'football' }[tema] || tema;
  let h = history && history.length ? history : [{
    rol: 'user',
    texto:
      direccion === 'en-es'
        ? `Hi! I want to practice English talking about ${topicEn}.`
        : `Hola! Quiero practicar español hablando de ${tema}.`,
  }];
  const contents = toGeminiContents(h, buildSystem(nivel, direccion, tema));
  try {
    return await callGemini(PRIMARY, contents);
  } catch (e) {
    if (String(e?.message || e).includes('no-key')) {
      return 'Falta la API key (EXPO_PUBLIC_GEMINI_KEY en .env).';
    }
    try {
      return await callGemini(FALLBACK, contents);
    } catch (e2) {
      return 'Se corto la conexion, repite tu ultima frase.';
    }
  }
}

export async function getFeedback(history, { nivel, direccion }) {
  const summary = history
    .map((m) => `${m.rol}: ${m.texto}`)
    .join('\n')
    .slice(-3000);
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text:
            `Eres evaluador de idiomas. Conversacion de practica (${direccion}, nivel ${nivel}):\n${summary}\n\n` +
            `Devuelve: 3 bullets (1 fortaleza, 1 error recurrente, 1 consejo) + nota 0-100. Maximo 80 palabras.`,
        },
      ],
    },
  ];
  try {
    return await callGemini(PRIMARY, contents);
  } catch (e) {
    try {
      return await callGemini(FALLBACK, contents);
    } catch (e2) {
      return 'Sesion terminada. Buen trabajo manteniendo la conversacion.';
    }
  }
}
