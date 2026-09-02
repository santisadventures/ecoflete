EcoFlete - resumen de trabajo hasta ahora
========================================

Proyecto:
EcoFlete es un marketplace estático de fletes pensado para GitHub Pages.
La idea central es aprovechar recorridos ya programados para conectar:

1. Productores/personas que necesitan transportar algo.
2. Fleteros/transportistas que ya tienen un viaje o capacidad disponible.

Repositorio:
/Users/santiago/Documents/ecoflete

GitHub:
https://github.com/santisadventures/ecoflete

GitHub Pages:
https://santisadventures.github.io/ecoflete/


Qué se construyó
----------------

Se creó un MVP en HTML, CSS y JavaScript vanilla, sin framework.

Archivos principales:

- index.html
- viajes.html
- cargas.html
- detalle.html
- css/main.css
- css/marketplace.css
- css/responsive.css
- js/config.js
- js/api.js
- js/home.js
- js/marketplace.js
- js/search.js
- js/distance.js
- js/detail.js
- js/ui.js
- data/demo-listings.json
- data/localidades.json
- google-apps-script/Code.gs

También se generó una imagen propia para el hero:
assets/images/ecoflete-hero.png


Lógica del producto
-------------------

Hay dos marketplaces separados:

1. Viajes disponibles
   Para productores/clientes que necesitan transporte.
   Muestra viajes publicados por fleteros con capacidad disponible.

2. Solicitudes de viaje
   Antes estaba nombrado como "Cargas".
   Para fleteros que buscan pedidos compatibles con sus recorridos.
   Internamente el archivo sigue siendo cargas.html y el dataset sigue siendo freightRequests, pero el texto visible se cambió a "Solicitudes de viaje" / "Pedidos de viaje".

La lógica NO debe mezclar ambos mercados.
Cada página tiene filtros independientes.


Actualización de publicaciones
------------------------------

La lógica pensada para producción es:

1. Un usuario completa un Google Form:
   - Ofrecer un flete
   - Buscar/Publicar una solicitud de viaje

2. Esa respuesta cae en un Google Sheet privado.

3. La fila tiene dos grupos de datos:
   - Datos crudos privados: nombre, WhatsApp, email, texto original, comentarios, etc.
   - Campos públicos/admin: ADMIN_ID, ADMIN_STATUS, PUBLIC_TITLE, PUBLIC_ORIGIN, PUBLIC_DESTINATION, PUBLIC_DATE, PUBLIC_CATEGORY, PUBLIC_DESCRIPTION, etc.

4. EcoFlete revisa manualmente cada envío.

5. El operador completa o corrige los campos públicos.

6. La publicación aparece en la web solo si:
   - ADMIN_STATUS = PUBLICADO
   - Tiene campos mínimos completos: ID, título, origen, destino, fecha y categoría.

7. GitHub Pages NO lee el Google Sheet directamente.
   Lee un JSON público generado por Google Apps Script.

8. Apps Script arma un JSON sanitizado con allowlist.
   Nunca debe publicar toda la fila ni datos privados.

9. Cuando se modifica el Sheet, el JSON se actualiza cuando la web vuelve a pedirlo.
   Actualmente es lectura bajo demanda, no generación programada cada X minutos.


Estado del diseño
-----------------

Primera versión:
Inspirada en Steward, más editorial, con tipografía serif y cards blancas.

Después se pidió:
Más minimalista, neutral, clase alta, "lujo silencioso".

Cambios aplicados:

- Paleta más neutra.
- Tipografía sans más grande y sobria.
- Botones redondeados.
- Menos sombras.
- Cards más limpias.
- Se mantuvo la foto del landing.
- "Cargas" pasó a "Solicitudes de viaje" / "Pedidos de viaje".
- En "Oportunidades actuales" se agregó selector:
  - Para productores
  - Para fleteros


Problema actual / pendiente
---------------------------

El usuario quiere que la imagen del camión en el hero ocupe todo el ancho de la página, de lado a lado, pero manteniendo curvas abajo.

Se intentó:

En css/main.css:

.hero {
  margin: 0 calc(50% - 50vw);
  width: 100vw;
  border-radius: 0 0 32px 32px;
}

También se agregó:

html {
  overflow-x: hidden;
}

body {
  overflow-x: hidden;
}

Y en responsive:

.hero {
  border-radius: 0 0 22px 22px;
  margin: 0 calc(50% - 50vw);
}

También se agregaron query params a los CSS:

css/main.css?v=hero-full-2
css/marketplace.css?v=hero-full-2
css/responsive.css?v=hero-full-2

Localmente la medición indicaba que el hero ocupaba el viewport completo, pero visualmente en GitHub Pages el usuario seguía viendo márgenes laterales.

Posible causa:
El diseño usa body/background blanco cálido y el hero puede estar contenido visualmente por padding/márgenes del browser o por caché. También puede que la captura esté mostrando una versión cacheada o que el borde curvo deje ver fondo en los laterales inferiores.

Siguiente paso recomendado:
Revisar el CSS del hero en producción y simplificarlo a algo más directo:

.hero {
  width: 100%;
  margin: 0;
  border-radius: 0 0 32px 32px;
}

Si el objetivo es que la imagen toque literalmente los bordes izquierdo y derecho del viewport, asegurarse de que ningún contenedor padre tenga padding/margin. En este caso el hero está directamente dentro de main, así debería funcionar.

También se puede cambiar el enfoque:

body {
  margin: 0;
}

main {
  overflow: hidden;
}

.hero {
  width: 100%;
  min-height: 680px;
  border-radius: 0 0 32px 32px;
}

.hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


Comandos útiles
---------------

Servidor local:
cd /Users/santiago/Documents/ecoflete
python3 -m http.server 8080

Abrir:
http://localhost:8080

Ver estado Git:
git status --short

Commit y push:
git add .
git commit -m "Mensaje"
git push

Ver deploy de GitHub Pages:
gh run list --repo santisadventures/ecoflete --limit 3

Ver estado Pages:
gh api repos/santisadventures/ecoflete/pages --jq '{html_url,status}'


Últimos commits relevantes
--------------------------

- Initial EcoFlete MVP
- Refine visual design and request wording
- Make landing hero full width
- Force hero image edge to edge


Qué pedirle a ChatGPT para seguir
---------------------------------

Prompt sugerido:

"Estoy trabajando en /Users/santiago/Documents/ecoflete. Es un sitio estático HTML/CSS/JS publicado en GitHub Pages en https://santisadventures.github.io/ecoflete/. Quiero que el hero del landing, que usa assets/images/ecoflete-hero.png, ocupe todo el ancho real del viewport, sin márgenes laterales visibles, manteniendo border-radius solo abajo. Revisá index.html, css/main.css y css/responsive.css. No cambies la lógica del marketplace. Después validá localmente y hacé commit/push."


Notas importantes
-----------------

- No exponer datos privados en frontend.
- No poner teléfonos, emails privados, tokens ni credenciales en GitHub Pages.
- Mantener DEMO_MODE en js/config.js hasta conectar Apps Script real.
- La ruta cargas.html puede mantenerse internamente, aunque el texto visible sea "Solicitudes de viaje".
- La lógica de offeredTrips y freightRequests no debe mezclarse.

