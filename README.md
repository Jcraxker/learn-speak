# LearnSpeak (WIP)

Mobile app to practice English/Spanish with a conversational AI tutor. Built for **Shipato OpenIA 2** hackathon (6 hours total, ~4 hours of coding).

App móvil para practicar inglés/español con un tutor de IA conversacional. Construida para la hackathon **Shipato OpenIA 2** (6 horas totales, ~4 horas de código).

> **⚠️ Status / Estado: INITIAL PHASE — documentation only.** This repository currently contains base documentation, license, gitignore and env example. **No app code exists yet.** No features are implemented so far.
>
> **⚠️ Fase INICIAL — solo documentación.** Este repositorio contiene únicamente documentación base, licencia, gitignore y ejemplo de env. **Aún no existe código de la app.** Ninguna funcionalidad está implementada.

## Context / Contexto

Language learners struggle to hold a sustained conversation (5-15 min) on topics they care about, with corrections adapted to their level (A1-C1). Existing apps are either rigid scripts or expensive tutors.

Estudiantes de idiomas no logran mantener una conversación sostenida (5-15 min) sobre temas que les interesan, con correcciones adaptadas a su nivel (A1-C1). Las apps actuales son guiones rígidos o tutores caros.

Goal: a mobile-first session — pick direction (EN→ES / ES→EN), level, topic and duration, then hold the conversation with AI voice/text support.

Meta: una sesión mobile-first — elegir dirección (EN→ES / ES→EN), nivel, tema y duración, y mantener la conversación con la IA con soporte de voz/texto.

## Planned stack / Stack previsto

| Layer / Capa | Technology / Tecnología |
|---|---|
| Mobile | React Native + Expo (plain JS, Expo Go for testing) |
| AI | Google Gemini 2.5 Flash via API key (free tier), Groq as fallback |
| Voice out | `expo-speech` (TTS) |
| Voice in | Text input for MVP, STT only if time allows |
| Session | Local state + 5/10/15 min timer, no backend server |

*Planned stack. Implementation is pending. / Stack previsto. Implementación pendiente.*

## Planned scope / Alcance previsto

* Session setup: direction, level (A1-C1), fixed topics (viajes, música, tech, fútbol), duration (5/10/15 min)
* Chat with AI tutor that replies in the detected user language, max ~60 words + 1 short correction + 1 follow-up question
* Visible MM:SS timer that locks input at 0 and shows a short AI feedback summary
* TTS playback per AI message

*Nothing above is implemented yet. / Nada de lo anterior está implementado aún.*

## Roadmap (4h coding)

* **H0-H0.5:** Setup + Expo Go tunnel check + API key test
* **H0.5-H1.5:** Chat core + AI call (critical path)
* **H1.5-H2.5:** Setup screen + timer + session end
* **H2.5-H3.5:** TTS + styling + feedback summary
* **H3.5-H4:** EAS build + live demo recording

## Team / Equipo

* **Jack Fallas (backend / AI layer):** `lib/ai.js`, prompts, session feedback
* **Frontend 1:** setup screen + session timer
* **Frontend 2:** chat UI + styling + demo build

## Run / Ejecución

```bash
# Not working yet — planned commands / Aún no funciona — comandos previstos
npm install
npx expo start --tunnel
```

Requires `EXPO_PUBLIC_GEMINI_KEY` in `.env` (see `.env.example`). Key stays local, never committed.

Requiere `EXPO_PUBLIC_GEMINI_KEY` en `.env` (ver `.env.example`). La key es local, nunca se commitea.

## License / Licencia

All rights reserved under [LICENSE](./LICENSE) by Jack Fallas. Published for professional portfolio purposes. Redistribution and derivative works are not permitted without the author's authorization.

Todos los derechos reservados bajo la [licencia](./LICENSE) de Jack Fallas. Publicado con fines de portafolio profesional. No se permite redistribución ni trabajos derivados sin autorización del autor.

---

**Author / Autor:** [Jack Fallas](https://github.com/Jcraxker)
