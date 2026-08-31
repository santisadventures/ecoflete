# EcoFlete Apps Script

Este endpoint publica solo JSON sanitizado para GitHub Pages.

1. Crear un Google Spreadsheet privado llamado `EcoFlete Database`.
2. Crear las hojas `FLETES_OFRECIDOS` y `FLETES_BUSCADOS`.
3. Mantener las respuestas originales del formulario en columnas privadas.
4. Agregar las columnas admin/públicas indicadas en `docs/DATA_MODEL.md`.
5. Pegar `Code.gs` en Apps Script vinculado al spreadsheet.
6. Desplegar como Web App con acceso público de lectura.
7. Copiar la URL del despliegue en `js/config.js` como `API_URL`.

El script nunca serializa filas completas. Construye un allowlist de campos públicos y excluye filas que no esten en `ADMIN_STATUS = PUBLICADO`.
