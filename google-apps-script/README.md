# EcoFlete Apps Script

Versión 1.1 conecta el formulario de fleteros con la Base Maestra MVP y publica únicamente JSON sanitizado para GitHub Pages.

## Base usada

Spreadsheet privado: `EcoFlete — Base Maestra MVP`

Pestañas esperadas:

- `FLETEROS`
- `PRODUCTORES`
- `PUBLICACIONES`
- `SOLICITUDES_CONTACTO`
- `LISTAS`

No hacer pública la Base Maestra completa. El sitio solo debe consumir el Web App de Apps Script.

## Crear el formulario

1. Abrir o crear un proyecto de Apps Script con acceso a la Base Maestra.
2. Pegar el contenido de `Code.gs`.
3. Ejecutar `createFleterosForm`.
4. Autorizar los permisos solicitados por Google.
5. Revisar que el formulario creado se llame `EcoFlete — Ofrecer un flete`.
6. Confirmar que tenga una pregunta obligatoria `Foto del vehículo` de carga de imagen.
7. Copiar la URL publicada que queda en el log y pegarla en `js/config.js` como `OFFER_FREIGHT_FORM_URL`.

Si Google Forms no permite crear automáticamente la pregunta de carga de archivos en la cuenta usada, el script se detiene con un error explícito. En ese caso, agregá manualmente una pregunta obligatoria de carga de archivo llamada `Foto del vehículo`, limitada a imágenes y a un archivo.

## Procesamiento

Cada envío del Form ejecuta `onFleteroFormSubmit`.

Flujo:

```text
Google Form
-> respuestas crudas vinculadas a la Sheet
-> Apps Script
-> normalización de WhatsApp
-> deduplicación en FLETEROS
-> nueva fila en PUBLICACIONES
-> ESTADO_ADMIN = PENDIENTE
-> revisión manual
-> ESTADO_ADMIN = ACTIVO y VISIBLE_WEB = SI
-> Web App JSON sanitizado
-> GitHub Pages
```

Reglas principales:

- `TELEFONO_CLAVE` es el WhatsApp normalizado.
- Un fletero existente reutiliza su `FLETERO_ID`.
- Cada envío crea siempre una nueva `PUBLICACION_ID`.
- Las publicaciones nuevas quedan en `PENDIENTE` y `VISIBLE_WEB = NO`.
- El frontend nunca recibe WhatsApp, email, teléfono clave ni notas administrativas.
- El precio se guarda como `PRECIO_ESTIMADO` en `ARS`.
- La foto se guarda como referencia de Drive en `FOTO_VEHICULO_URL` y `FOTO_VEHICULO_ID`.

## Publicación web

Desplegar `Code.gs` como Web App y configurar:

- `API_URL`: URL del Web App.
- `DEMO_MODE`: `false` para usar datos reales.

El endpoint filtra en servidor:

- `TIPO_PUBLICACION = OFRECE_FLETE` o `BUSCA_FLETE`
- `ESTADO_ADMIN = ACTIVO`
- `VISIBLE_WEB = SI`
- `FECHA_HASTA` vigente

El frontend también conserva el criterio de no mostrar datos personales.
