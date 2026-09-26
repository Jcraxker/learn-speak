# LearnSpeak (WIP)

Mobile app to practice English/Spanish with a conversational AI tutor. Built for **Shipato OpenIA 2** hackathon (6 hours total, ~4 hours of coding).

App móvil para practicar inglés/español con un tutor de IA conversacional. Construida para la hackathon **Shipato OpenIA 2** (6 horas totales, ~4 horas de código).

> **Status / Estado: WORKING MVP in Expo Go + preview APK building.** Session flow (setup → chat → feedback), AI tutor, timer, TTS + mic, RevenueCat paywall (demo mode without store keys).
>
> **MVP funcional en Expo Go + APK preview en construcción.** Flujo de sesión (setup → chat → feedback), tutor IA, timer, TTS + mic, paywall RevenueCat (modo demo sin keys de tienda).

## Context / Contexto

Language learners struggle to hold a sustained conversation (5-15 min) on topics they care about, with corrections adapted to their level (A1-C1). Existing apps are either rigid scripts or expensive tutors.

Estudiantes de idiomas no logran mantener una conversación sostenida (5-15 min) sobre temas que les interesan, con correcciones adaptadas a su nivel (A1-C1). Las apps actuales son guiones rígidos o tutores caros.

Goal: a mobile-first session — pick direction (EN→ES / ES→EN), level, topic and duration, then hold the conversation with AI voice/text support.

Meta: una sesión mobile-first — elegir dirección (EN→ES / ES→EN), nivel, tema y duración, y mantener la conversación con la IA con soporte de voz/texto.

## Planned stack / Stack previsto

| Layer / Capa | Technology / Tecnología |
|---|---|
| Mobile | React Native + Expo (plain JS, Expo Go for testing) |
| AI | Google Gemini 3.5-flash-lite via API key (free tier), 3.5-flash fallback |
| Voice out | `expo-speech` (TTS per AI message) |
| Voice in | Mic with auto-stop on silence → Gemini transcription, keyboard fallback |
| Session | Local state + 5/10/15 min timer + AI greeting + AI feedback, no backend server |
| Monetization | RevenueCat: Pro monthly subscription + 60-min consumable, 1 free session/day |

*Stack implemented and running in Expo Go. / Stack implementado y corriendo en Expo Go.*

## Planned scope / Alcance previsto

* Session setup: direction, level (A1-C1), fixed topics (viajes, música, tech, fútbol), duration (5/10/15 min)
* AI greeting on session start + chat with tutor that replies in the detected user language, max ~60 words + 1 short correction + 1 follow-up question
* Visible MM:SS timer that locks input at 0 and shows an AI feedback summary (3 bullets + score)
* TTS playback per AI message + mic with silence auto-stop and transcription
* Monetization: 1 free session/day, Pro subscription and minutes pack via RevenueCat

## Roadmap (4h coding)

* **H0-H0.5:** Setup + Expo Go tunnel check + API key test
* **H0.5-H1.5:** Chat core + AI call (critical path)
* **H1.5-H2.5:** Setup screen + timer + session end
* **H2.5-H3.5:** TTS + styling + feedback summary
* **H3.5-H4:** EAS build + live demo recording

## Equipo (3)
- Jack Fallas (backend / AI layer: `lib/ai.js`, prompts, feedback)
- Henry Lima (frontend 1: setup + timer)
- Oliver Merida (frontend 2: chat UI + TTS + build/demo)

## Run / Ejecución

```bash
npm install
npx expo start --lan   # open exp://<laptop-ip>:8081 in Expo Go (same WiFi)
```

Requires `EXPO_PUBLIC_GEMINI_KEY` in `.env` (see `.env.example`). Key stays local, never committed.

Requiere `EXPO_PUBLIC_GEMINI_KEY` en `.env` (ver `.env.example`). La key es local, nunca se commitea.

## License / Licencia

All rights reserved under [LICENSE](./LICENSE) by Jack Fallas. Published for professional portfolio purposes. Redistribution and derivative works are not permitted without the author's authorization.

Todos los derechos reservados bajo la [licencia](./LICENSE) de Jack Fallas. Publicado con fines de portafolio profesional. No se permite redistribución ni trabajos derivados sin autorización del autor.

---

**Author / Autor:** LearnSpeak Team — Jack Fallas, Henry Lima, Oliver Merida ([Jcraxker](https://github.com/Jcraxker))
