# Pensador

App web instalable (PWA) para tener siempre abiertas unas pocas preguntas y volver a ellas.

- **Pensar:** se abre directamente en una de tus preguntas vivas (máx. 8), la que más tiempo lleva sin visitarse.
  Pasos guiados, un campo a la vez. Desliza a los lados para cambiar de pregunta. Hay dos tipos:
  - **Gran pregunta:** hipótesis → qué la refutaría → evidencia. Para volver a ella muchas veces.
  - **Detalle → mapa:** primera explicación → quién lo hizo posible y cuándo → lo que comprobé → qué revela del mundo.
- **Ruido:** un toque desde cualquier pantalla. Aparca lo trivial y vuelve a la pregunta.
- **Me falta un dato:** guarda tu predicción antes de consultar y el resultado después.
- **Preguntas:** todas las vivas a la vez en cuadrícula, la cola agrupada por tema, búsqueda, filtros por tema y por tipo.
  Cada pregunta tiene un tema (Yo, Poder, Roma, Crimen, Dinero, EE. UU., Europa) que se adivina solo y se puede cambiar.
  El color del fondo sigue al tema de la pregunta actual.
- **Ideas para pensar:** más de 110 preguntas sugeridas (`BANK` en `app.js`), de los dos tipos. Se añaden una a una
  o todas las de un filtro a la vez, desde «Ver las N».
- **Mapa:** áreas de conocimiento con nivel 1–5 en un radar. El hueco de cada área se convierte en pregunta.

Los datos se guardan solo en el navegador del móvil (`localStorage`). Nada sale del dispositivo.
Usa **Preguntas → Utilidades → Copia de seguridad** para exportar e importar.

Enlaces directos: `?ruido` abre «Ruido»; `#pensar`, `#preguntas`, `#mapa`.

Sin build: archivos estáticos. Local: `python -m http.server 8123`.

Si la app no se ve actualizada: **Preguntas → Utilidades → Aplicación → Actualizar ahora**, o abre `actualizar.html` en Safari. No borra tus preguntas.
