# EcoFlete

EcoFlete es un marketplace de clasificados de fletes para aprovechar recorridos que ya están programados.

Versión actual del sitio: `1.1`.

Tiene dos mercados públicos separados:

- `Viajes disponibles`: fletes ofrecidos por transportistas con capacidad libre.
- `Solicitudes de viaje`: solicitudes de personas o empresas que necesitan transportar algo.

Acciones principales:

- Ver viajes disponibles
- Ver pedidos de viaje
- Ofrecer un flete
- Buscar un flete

## Arquitectura

```text
FLETERO / PRODUCTOR
        ↓
    GOOGLE FORM
        ↓
PRIVATE GOOGLE SHEET
        ↓
RAW RESPONSE
        ↓
APPS SCRIPT
        ↓
DEDUPLICACIÓN / CRM
        ↓
PUBLICACIÓN PENDIENTE
        ↓
ECOFLETE MANUAL REVIEW
        ↓
ESTADO_ADMIN = ACTIVO + VISIBLE_WEB = SI
        ↓
GOOGLE APPS SCRIPT
        ↓
SANITIZED JSON
        ↓
GITHUB PAGES
        ↓
ECOFLETE MARKETPLACE
```

Google Forms recolecta información privada. Google Sheets funciona como base privada y panel liviano de administración. EcoFlete modera y normaliza manualmente cada publicación antes de mostrarla.

El frontend solo consume campos públicos sanitizados. No debe incluir teléfonos, emails, enlaces privados, tokens ni credenciales.

## Formulario de fleteros

La versión 1.1 agrega el flujo `Ofrecer un flete`.

Cada envío del formulario representa una nueva publicación, aunque el fletero ya exista. Apps Script normaliza el WhatsApp, busca `TELEFONO_CLAVE` en `FLETEROS`, reutiliza el `FLETERO_ID` si corresponde y siempre crea una nueva fila `EF-XXXX` en `PUBLICACIONES`.

Las publicaciones nuevas quedan con:

- `TIPO_PUBLICACION = OFRECE_FLETE`
- `ESTADO_ADMIN = PENDIENTE`
- `VISIBLE_WEB = NO`
- `MONEDA = ARS`

Después de la revisión manual, el sitio muestra solo publicaciones aprobadas, visibles y no vencidas. El precio estimado se muestra públicamente como estimación del transportista. WhatsApp, email, teléfono clave y notas internas nunca se publican.

El código operativo está en `google-apps-script/Code.gs`; los pasos de instalación están en `google-apps-script/README.md`.

## Desarrollo local

Servir el directorio con cualquier servidor estático:

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080`.

## Configuración

Editar `js/config.js`:

- `API_URL`: URL pública del Web App de Apps Script.
- `OFFER_FREIGHT_FORM_URL`: formulario para ofrecer un flete.
- `REQUEST_FREIGHT_FORM_URL`: formulario para buscar un flete.
- `INTEREST_FORM_URL`: formulario para solicitar contacto.
- `DEMO_MODE`: `true` usa `data/demo-listings.json`; `false` usa Apps Script.

## Roadmap

V1 valida publicaciones, búsquedas y solicitudes de contacto. V2 puede sumar expiración automática, WhatsApp, búsquedas guardadas, mapas y matching. V3 puede incorporar cuentas, reservas, pagos y optimización logística.
