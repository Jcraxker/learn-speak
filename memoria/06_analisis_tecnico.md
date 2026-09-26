# Análisis Técnico — LearnSpeak

## Contrato congelado (no cambiar sin avisar)
- `nivel`: A1 | A2 | B1 | B2 | C1
- `direccion`: en-es | es-en
- `tema`: viajes | musica | tech | futbol
- `mensaje`: { rol: user | ai, texto: string }
- `duracionMin`: 5 | 10 | 15

## Archivos previstos (ninguno existe aún)
- `src/App.jsx` — compone todo, estado `fase: setup | chat | fin`.
- `src/lib/ai.js` — `sendMessage` + `getFeedback` (fetch directo a `v1beta/models/gemini-3.5-flash-lite:generateContent`).
- `src/components/Setup.jsx`, `Chat.jsx`, `SessionBar.jsx`.

## Prompt del tutor (borrador para `ai.js`)
"Eres profesor de [direccion], nivel [nivel], tema [tema]. Detecta el idioma del último mensaje y responde SIEMPRE en ese idioma. Máximo 60 palabras. Si hay error, 1 corrección corta al final. Si no, 1 pregunta para seguir la conversación."

## Criterio de demo ganadora
Chat que responde + timer visible que bloquea a 0 + TTS audible + resumen final. Todo responsive 360-480px.
