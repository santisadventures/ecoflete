# Modelo de datos

EcoFlete separa información privada y contenido público.

Las respuestas crudas de Google Forms quedan intactas en la primera parte de cada fila: nombre, WhatsApp, email, origen escrito por el usuario, destino, comentarios e imagen original si existe.

EcoFlete completa manualmente las columnas públicas en la misma fila:

- `ADMIN_ID`
- `ADMIN_STATUS`
- `PUBLIC_TITLE`
- `PUBLIC_ORIGIN`
- `PUBLIC_ORIGIN_PROVINCE`
- `PUBLIC_ORIGIN_LAT`
- `PUBLIC_ORIGIN_LNG`
- `PUBLIC_DESTINATION`
- `PUBLIC_DESTINATION_PROVINCE`
- `PUBLIC_DESTINATION_LAT`
- `PUBLIC_DESTINATION_LNG`
- `PUBLIC_DATE`
- `PUBLIC_DATE_END`
- `PUBLIC_DATE_FLEXIBILITY`
- `PUBLIC_CATEGORY`
- `PUBLIC_VEHICLE`
- `PUBLIC_CAPACITY`
- `PUBLIC_CARGO`
- `PUBLIC_DESCRIPTION`
- `PUBLIC_IMAGE`
- `PUBLIC_IMAGE_ALT`
- `PUBLIC_PUBLISHED_AT`
- `PUBLIC_EXPIRES_AT`
- `PUBLIC_FEATURED`
- `PUBLIC_SORT_ORDER`

Estados permitidos:

- `PENDIENTE`
- `PUBLICADO`
- `PAUSADO`
- `FINALIZADO`
- `RECHAZADO`

El sitio solo muestra filas con `ADMIN_STATUS = PUBLICADO` y campos públicos minimos completos.
