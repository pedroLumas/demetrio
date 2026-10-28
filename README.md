# Pensador

App web instalable (PWA) para tener siempre abiertas unas pocas preguntas y volver a ellas.

- **Pensar:** se abre directamente en una de tus preguntas vivas (máx. 3), la que más tiempo lleva sin visitarse.
  Tres pasos guiados: hipótesis, qué la refutaría y evidencia. Un campo a la vez.
- **Ruido:** un toque desde cualquier pantalla. Aparca lo trivial y vuelve a la pregunta.
- **Me falta un dato:** guarda tu predicción antes de consultar y el resultado después.
- **Preguntas:** vivas, en cola y cerradas (con conclusión). Al cerrar una, la siguiente de la cola pasa a viva.
- **Mapa:** áreas de conocimiento con nivel 1–5 en un radar. El hueco de cada área se convierte en pregunta.

Los datos se guardan solo en el navegador del móvil (`localStorage`). Nada sale del dispositivo.
Usa **Preguntas → Copia de seguridad** para exportar.

Enlaces directos: `?ruido` abre «Ruido» (útil para un atajo del móvil); `#pensar`, `#preguntas`, `#mapa`.

Sin build: archivos estáticos. Local: `python -m http.server 8123`.
