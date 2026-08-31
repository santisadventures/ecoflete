# EcoFlete

EcoFlete es un marketplace de clasificados de fletes para aprovechar recorridos que ya están programados.

Tiene dos mercados públicos separados:

- `Viajes disponibles`: fletes ofrecidos por transportistas con capacidad libre.
- `Cargas que buscan flete`: solicitudes de personas o empresas que necesitan transportar algo.

Acciones principales:

- Ver viajes disponibles
- Ver cargas disponibles
- Ofrecer un flete
- Buscar un flete

## Arquitectura

```text
CUSTOMER / FREIGHT PROVIDER
        ↓
    GOOGLE FORM
        ↓
PRIVATE GOOGLE SHEET
        ↓
RAW RESPONSE
        ↓
ECOFLETE MANUAL EDITING
        ↓
PUBLIC STRUCTURED COLUMNS
        ↓
ADMIN_STATUS = PUBLICADO
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
