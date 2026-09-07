const SPREADSHEET_ID = '1cwZgo4a1sIy3pE_xVQfy3lzZjCU7qKLHQsLvUu1uyks';
const SHEET_PUBLICACIONES = 'PUBLICACIONES';

function doGet() {
  try {
    const publicaciones = getPublicacionesActivas_();

    const ofrecidos = publicaciones.filter(
      p => p.tipoPublicacion === 'OFRECE_FLETE'
    );

    const buscados = publicaciones.filter(
      p => p.tipoPublicacion === 'BUSCA_FLETE'
    );

    const data = {
      ok: true,
      service: 'ecoflete-api',
      updatedAt: new Date().toISOString(),
      total: publicaciones.length,
      fletesOfrecidos: ofrecidos,
      fletesBuscados: buscados
    };

    return jsonResponse_(data);

  } catch (error) {
    return jsonResponse_({
      ok: false,
      service: 'ecoflete-api',
      error: String(error)
    });
  }
}


function getPublicacionesActivas_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PUBLICACIONES);

  if (!sheet) {
    throw new Error('No existe la hoja PUBLICACIONES');
  }

  const values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(String);
  const rows = values.slice(1);

  const index = {};
  headers.forEach((header, i) => {
    index[header.trim()] = i;
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return rows
    .filter(row => {
      const estado = String(row[index['ESTADO_ADMIN']] || '')
        .trim()
        .toUpperCase();

      const visible = String(row[index['VISIBLE_WEB']] || '')
        .trim()
        .toUpperCase();

      if (estado !== 'ACTIVO') {
        return false;
      }

      if (visible !== 'SI') {
        return false;
      }

      const fechaHasta = parseFecha_(row[index['FECHA_HASTA']]);

      if (fechaHasta && fechaHasta < hoy) {
        return false;
      }

      return true;
    })

    .map(row => ({
      id: clean_(row[index['PUBLICACION_ID']]),
      tipoPublicacion: clean_(row[index['TIPO_PUBLICACION']]),

      origen: clean_(row[index['ORIGEN']]),
      provinciaOrigen: clean_(row[index['PROVINCIA_ORIGEN']]),

      destino: clean_(row[index['DESTINO']]),
      provinciaDestino: clean_(row[index['PROVINCIA_DESTINO']]),

      fechaDesde: formatFecha_(row[index['FECHA_DESDE']]),
      fechaHasta: formatFecha_(row[index['FECHA_HASTA']]),

      categoriaCarga: clean_(row[index['CATEGORIA_CARGA']]),
      detalleCarga: clean_(row[index['DETALLE_CARGA']]),

      capacidad: clean_(row[index['CAPACIDAD/CANTIDAD']]),

      precioEstimado: row[index['PRECIO_ESTIMADO']] || '',
      moneda: clean_(row[index['MONEDA']]),

      titulo: clean_(row[index['TITULO_WEB']]),
      descripcion: clean_(row[index['DESCRIPCION_WEB']]),

      tipoVehiculo: clean_(row[index['TIPO_VEHICULO']]),
      fotoVehiculoUrl: clean_(row[index['FOTO_VEHICULO_URL']])
    }));
}


function parseFecha_(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  // Formato de Google Sheets: d/m/yyyy o dd/mm/yyyy
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

  if (match) {
    let year = match[3];

    if (year.length === 2) {
      year = '20' + year;
    }

    return {
      day: match[1].padStart(2, '0'),
      month: match[2].padStart(2, '0'),
      year: year
    };
  }

  // También aceptar yyyy-mm-dd
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {
    return {
      day: match[3].padStart(2, '0'),
      month: match[2].padStart(2, '0'),
      year: match[1]
    };
  }

  return null;
}


function formatFecha_(value) {
  const parts = parseFecha_(value);

  if (!parts) {
    return '';
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}


function clean_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}


function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function debugFechas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PUBLICACIONES);

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0];
  const row = values[1];

  console.log('FECHA_DESDE = [' + row[headers.indexOf('FECHA_DESDE')] + ']');
  console.log('FECHA_HASTA = [' + row[headers.indexOf('FECHA_HASTA')] + ']');
}
