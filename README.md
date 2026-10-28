# Pensador

App web instalable (PWA) para tener siempre abiertas unas pocas preguntas y volver a ellas.

- **Hoy:** tus preguntas vivas (máx. 3) con hipótesis, qué la refutaría y evidencia.
- **Estoy en ruido:** un toque desde cualquier pantalla. Aparca lo trivial y vuelve a la pregunta.
- **Preguntas:** viva, en cola o resuelta. Marca las que necesitas consultar.
- **Mapa:** áreas de conocimiento con nivel 0–5 y el hueco principal.
- **Revisión:** consultas pendientes (primero tu predicción, luego el resultado), lo aparcado y copia de seguridad.

Los datos se guardan solo en el navegador del móvil (`localStorage`). Nada sale del dispositivo.
Usa **Revisión → Exportar** para hacer copias.

Enlaces directos: `?ruido` abre «Estoy en ruido»; `#hoy`, `#preguntas`, `#mapa`, `#revision` abren cada pestaña.

Sin build: archivos estáticos. Local: `python -m http.server 8123`.
