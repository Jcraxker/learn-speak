// AI layer — direct Gemini call, no server (hackathon decision D2).
// Primary: gemini-3.5-flash-lite (verified 2026-09-26). Fallback: gemini-3.5-flash.
// gemini-2.5-flash returns 404 for new accounts — do NOT use.
//
// Contract:
// - sendMessage(history, { nivel, direccion, tema }) -> string (tutor reply)
// - getFeedback(history, { nivel, direccion }) -> string (3 bullets + score)
// - history: [{ rol: 'user' | 'ai', texto: string }]

const PRIMARY = 'gemini-3.5-flash-lite';
const FALLBACK = 'gemini-3.8-flash';
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

export async function getFeedback(history, { nivel, direccion, tema }) {
  const userMessages = (history || []).filter((m) => m.rol === 'user');
  const userWordCount = userMessages.reduce(
    (sum, m) => sum + (m.texto || '').trim().split(/\s+/).filter(Boolean).length,
    0
  );

  if (userMessages.length === 0 || userWordCount === 0) {
    return (
      'Puntaje: 0/100\n\n' +
      'Fortaleza: Iniciaste tu sesión de práctica.\n' +
      'A mejorar: No se registraron intervenciones durante la conversación.\n' +
      'Consejo: Toca el orbe azul y conversa sobre el tema seleccionado para que podamos evaluar tu pronunciación, vocabulario y fluidez.'
    );
  }

  const topicName = { viajes: 'viajes (travel)', musica: 'música (music)', tech: 'tecnología (technology)', futbol: 'fútbol (soccer)' }[tema] || tema || 'conversación general';
  const targetLang = direccion === 'en-es' ? 'Inglés' : 'Español';
  const summary = history
    .map((m) => `${m.rol === 'user' ? 'Estudiante' : 'Tutor'}: ${m.texto}`)
    .join('\n')
    .slice(-3500);

  const prompt = [
    'Eres un evaluador lingüístico experto y pedagógico para LearnSpeak.',
    'Evalúa de forma rigurosa y constructiva el desempeño del "Estudiante" en la siguiente conversación.',
    '',
    `Parámetros de la sesión:`,
    `- Idioma objetivo a evaluar: ${targetLang}`,
    `- Nivel CEFR esperado: ${nivel || 'A2'}`,
    `- Tema acordado: ${topicName}`,
    `- Intervenciones del estudiante: ${userMessages.length} turnos (${userWordCount} palabras totales)`,
    '',
    'Transcripción:',
    summary,
    '',
    'Criterios de puntuación (0 a 100):',
    '- 90-100: Excelente desempeño para el nivel. Respuestas fluidas, vocabulario relevante al tema, gramática muy acertada.',
    '- 70-89: Buen desempeño. Mantiene la conversación sobre el tema con oraciones comprensibles y errores menores propios del nivel.',
    '- 50-69: Desempeño regular. Respuestas muy cortas, vocabulario limitado o errores frecuentes que dificultan la fluidez.',
    '- 20-49: Muy baja participación, respuestas con monosílabos evasivos ("yes", "ok", "no"), habla en el idioma equivocado o fuera de tema.',
    '- 0-19: Casi nula participación comunicativa.',
    '',
    'Reglas estrictas de formato:',
    '1. La primera línea DEBE ser exactamente: "Puntaje: X/100" (donde X es tu calificación numérica calculada).',
    '2. Deja una línea en blanco.',
    '3. Incluye 3 puntos claros y específicos:',
    'Fortaleza: [Qué hizo bien el estudiante citando algún ejemplo de la conversación]',
    'A mejorar: [1 error puntual gramatical o de vocabulario que cometió y cómo decirlo correctamente]',
    'Consejo: [1 tip práctico para su próxima conversación sobre este tema]',
    '4. Máximo 100 palabras en total, tono motivador y en español.'
  ].join('\n');

  const contents = [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  try {
    return await callGemini(PRIMARY, contents);
  } catch (e) {
    try {
      return await callGemini(FALLBACK, contents);
    } catch (e2) {
      // Fallback coherent score estimate if network fails
      const fallbackScore = Math.min(85, Math.max(30, 20 + userMessages.length * 15 + Math.min(30, userWordCount * 2)));
      return (
        `Puntaje: ${fallbackScore}/100\n\n` +
        `Fortaleza: Buen esfuerzo participando con ${userMessages.length} respuestas sobre ${topicName}.\n` +
        `A mejorar: Continúa practicando oraciones más complejas y variadas.\n` +
        `Consejo: Habla con regularidad para afianzar tu vocabulario de nivel ${nivel}.`
      );
    }
  }
}
