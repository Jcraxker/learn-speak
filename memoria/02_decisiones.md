# Decisiones Técnicas — LearnSpeak

## D1 — React Native + Expo, APK obligatoria (2026-09-26, corregido)
**Decisión:** App 100% móvil con React Native + Expo. Dev en Expo Go con tunnel, entrega final en APK (EAS Build) para el jurado.
**Por qué:** Requisito de la hackathon: full mobile instalable, no vale URL web. Vite queda descartado.
**Costo:** EAS Build tarda 15-30 min en nube. Se lanza en H3.5 sin falta, con cuenta Expo del equipo. Diseño mobile-first estricto (360-480px).

## D2 — Sin servidor, llamada directa a Gemini (2026-09-26)
**Por qué:** Ahorra ~1h vs montar Express. La key vive solo en `.env` local, nunca en git.
**Riesgo:** Key expuesta en cliente. Aceptable en hackathon; después rotar y poner proxy.

## D3 — Modelo gemini-3.5-flash-lite primario (2026-09-26)
**Por qué:** Verificado hoy con `generateContent` (responde OK). `gemini-2.5-flash` devuelve 404 para cuentas nuevas (Google obliga serie 3.x). Fallback: `gemini-3.5-flash`.
**Evidencia:** prueba curl 2026-09-26, `ListModels` + 4 modelos OK.

## D4 — System prompt hace el trabajo pesado (2026-09-26)
Detecta idioma del último mensaje y responde en ese idioma. Máx. 60 palabras + 1 corrección + 1 pregunta. Evita código de detección y RAG.

## D5 — Timer bloqueante + feedback final (2026-09-26)
`setInterval` cada 1s, a 0 bloquea input y pide resumen a Gemini (3 bullets + nota 0-100). Es el criterio visible de "sesión cumplida" para el jurado.

## D6 — Commits en inglés, docs bilingües, sin firmas IA (2026-09-26)
Heredado de Puente. Email `Jcraxker@users.noreply.github.com` (el normal rebota por GH007). Repo público desde creación limpia (sin rastro de MarioEscobar64).
