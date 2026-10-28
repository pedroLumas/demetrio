# Pensador

App web instalable (PWA) para tener siempre abiertas unas pocas preguntas y volver a ellas.

- **Pensar:** se abre directamente en una de tus preguntas vivas (máx. 8), la que más tiempo lleva sin visitarse.
  Pasos guiados, un campo a la vez. Hay dos tipos de pregunta:
  - **Gran pregunta:** hipótesis → qué la refutaría → evidencia. Para volver a ella muchas veces.
  - **Detalle → mapa:** primera explicación → quién lo hizo posible y cuándo → lo que comprobé → qué revela del mundo.
- **Ideas para pensar:** preguntas sugeridas (`BANK` en `app.js`) que se añaden con un toque.
- **Ruido:** un toque desde cualquier pantalla. Aparca lo trivial y vuelve a la pregunta.
- **Me falta un dato:** guarda tu predicción antes de consultar y el resultado después.
- **Preguntas:** vivas, en cola y cerradas (con conclusión). Al cerrar una, la siguiente de la cola pasa a viva.
- **Mapa:** áreas de conocimiento con nivel 1–5 en un radar. El hueco de cada área se convierte en pregunta.

Los datos se guardan solo en el navegador del móvil (`localStorage`). Nada sale del dispositivo.
Usa **Preguntas → Copia de seguridad** para exportar.

Enlaces directos: `?ruido` abre «Ruido» (útil para un atajo del móvil); `#pensar`, `#preguntas`, `#mapa`.

Sin build: archivos estáticos. Local: `python -m http.server 8123`.
