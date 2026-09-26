# Contexto del Proyecto — LearnSpeak

## Qué es
App móvil para practicar inglés/español con un tutor de IA conversacional. Proyecto de hackathon **Shipato OpenIA 2** (6 horas totales, ~4 horas de código). Equipo de 3 personas.

## Problema
Estudiantes de idiomas no logran mantener una conversación sostenida (5-15 min) sobre temas que les interesan, con correcciones adaptadas a su nivel. Las opciones actuales son guiones rígidos o tutores caros.

## Solución (MVP recortado)
Sesión mobile-first:
1. Elige dirección (EN→ES / ES→EN), nivel (A1-C1), tema fijo (viajes, música, tech, fútbol) y duración (5/10/15 min).
2. Conversa con la IA por texto (voz-salida con TTS si alcanza el tiempo).
3. La IA responde en el idioma que detecta del último mensaje, máx. ~60 palabras + 1 corrección corta + 1 pregunta para seguir.
4. Al agotarse el timer se bloquea el input y se muestra un resumen con nota.

## Usuarios
Sin login para el MVP. Un solo perfil por sesión (nivel + dirección + tema). Sin persistencia entre sesiones en el MVP.

## Alcance explícito (lo que NO entra en 4h)
- Sin búsqueda web en vivo ni RAG (se simula con system prompt).
- Sin login, sin base de datos, sin historial persistente.
- Sin STT complejo (entrada por texto; STT solo si sobra tiempo).
- Sin backend servidor (la llamada a Gemini va directo desde `lib/ai.js`).

**Estado:** Nada de lo anterior está implementado aún. Solo documentación base.
