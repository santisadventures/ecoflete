const ECOFLETE = {
  VERSION: "1.1",
  SPREADSHEET_ID: "1cwZgo4a1sIy3pE_xVQfy3lzZjCU7qKLHQsLvUu1uyks",
  FORM_TITLE: "EcoFlete — Ofrecer un flete",
  FORM_VISIBLE_TITLE: "Ofrecé un flete en EcoFlete",
  FORM_DESCRIPTION: [
    "Completá los datos de tu viaje y nosotros preparamos la publicación. Cada formulario corresponde a una disponibilidad o viaje.",
    "",
    "Si ya publicaste anteriormente, podés volver a completar este formulario. Tus datos de contacto seguirán asociados a tu perfil y se creará una nueva publicación para este viaje."
  ].join("\n"),
  SHEETS: {
    CARRIERS: "FLETEROS",
    PRODUCERS: "PRODUCTORES",
    PUBLICATIONS: "PUBLICACIONES",
    CONTACT_REQUESTS: "SOLICITUDES_CONTACTO"
  },
  PUBLICATION_TYPES: {
    OFFER: "OFRECE_FLETE",
    REQUEST: "BUSCA_FLETE"
  },
  ADMIN_STATUS: {
    ACTIVE: "ACTIVO",
    PENDING: "PENDIENTE",
    PUBLISHED_LEGACY: "PUBLICADO"
  },
  YES: "SI",
  NO: "NO",
  CURRENCY: "ARS",
  QUESTIONS: {
    NAME: "Nombre y apellido",
    COMPANY: "Nombre de la empresa o transporte",
    WHATSAPP: "WhatsApp",
    EMAIL: "Email",
    BASE_LOCATION: "¿Dónde estás ubicado habitualmente?",
    VEHICLE: "¿Qué vehículo tenés disponible?",
    CARGO_TYPE: "¿Qué tipo de carga podés transportar?",
    ORIGIN: "¿Desde dónde salís?",
    DESTINATION: "¿Hacia dónde viajás?",
    DATE_FROM: "¿Desde qué fecha está disponible este viaje?",
    DATE_UNTIL: "¿Hasta qué fecha querés mantener publicada esta disponibilidad?",
    CAPACITY: "Capacidad disponible aproximada",
    PRICE: "¿Cuánto estimás cobrar por este viaje?",
    PHOTO: "Foto lateral del vehículo",
    DETAILS: "Contanos cualquier detalle importante sobre este viaje o sobre la carga que buscás transportar",
    USUAL_ZONES: "¿Por qué zonas trabajás habitualmente?",
    MATCH_CONTACT: "¿Querés que EcoFlete te contacte cuando aparezcan oportunidades compatibles con tus viajes?",
    AUTHORIZATION: "Autorización para publicar"
  }
};

function doGet() {
  const output = {
    version: ECOFLETE.VERSION,
    updatedAt: new Date().toISOString(),
    offeredTrips: readPublications(ECOFLETE.PUBLICATION_TYPES.OFFER, "offered"),
    freightRequests: readPublications(ECOFLETE.PUBLICATION_TYPES.REQUEST, "request")
  };

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function createFleterosForm() {
  const form = FormApp.create(ECOFLETE.FORM_TITLE)
    .setTitle(ECOFLETE.FORM_VISIBLE_TITLE)
    .setDescription(ECOFLETE.FORM_DESCRIPTION)
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setDestination(FormApp.DestinationType.SPREADSHEET, ECOFLETE.SPREADSHEET_ID);

  const formsFolder = DriveApp.getFolderById("1YWl7Cng-FtOZ9fCm0HgOLXUByYQArnjK");
  const formFile = DriveApp.getFileById(form.getId());
  formFile.moveTo(formsFolder);


  addTusDatosSection_(form);
  addEsteViajeSection_(form);
  addDisponibilidadHabitualSection_(form);

  ScriptApp.newTrigger("onFleteroFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log("Form URL: " + form.getPublishedUrl());
  Logger.log("Edit URL: " + form.getEditUrl());
  return {
    publishedUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl()
  };
}

function onFleteroFormSubmit(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const response = parseFormResponse_(event);
    const spreadsheet = SpreadsheetApp.openById(ECOFLETE.SPREADSHEET_ID);
    ensurePublicationPhotoColumn_(spreadsheet);

    const carriersSheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.CARRIERS);
    const publicationsSheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.PUBLICATIONS);
    const carriers = getSheetTable_(carriersSheet);
    const publications = getSheetTable_(publicationsSheet);

    const phoneKey = normalizeWhatsApp(response[ECOFLETE.QUESTIONS.WHATSAPP]);
    if (!phoneKey) throw new Error("No se pudo normalizar el WhatsApp recibido.");

    const existingCarrier = findRecordByValue_(carriers, "TELEFONO_CLAVE", phoneKey);
    const carrierId = existingCarrier
      ? updateCarrier_(carriersSheet, carriers, existingCarrier, response, phoneKey)
      : createCarrier_(carriersSheet, carriers, response, phoneKey);

    const publicationId = nextId_(publications.records, "PUBLICACION_ID", "EF");
    createOfferPublication_(publicationsSheet, publications, {
      publicationId,
      carrierId,
      phoneKey,
      response,
      submittedAt: event && event.response ? event.response.getTimestamp() : new Date()
    });
  } catch (error) {
    console.error(error.stack || error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function normalizeWhatsApp(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54") && digits.length >= 10) digits = "54" + digits;

  return digits;
}

function readPublications(publicationType, frontendType) {
  const sheet = SpreadsheetApp
    .openById(ECOFLETE.SPREADSHEET_ID)
    .getSheetByName(ECOFLETE.SHEETS.PUBLICATIONS);
  if (!sheet) return [];

  const table = getSheetTable_(sheet);
  const today = startOfDay_(new Date());

  return table.records
    .map((entry) => entry.data)
    .filter((record) => String(record.TIPO_PUBLICACION || "").toUpperCase() === publicationType)
    .filter((record) => isActiveForWeb_(record, today))
    .map((record) => sanitizePublication_(record, frontendType))
    .filter((record) => record.id && record.origin.city && record.destination.city && record.title)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
}

function addTusDatosSection_(form) {
  form.addSectionHeaderItem().setTitle("TUS DATOS");
  form.addTextItem().setTitle(ECOFLETE.QUESTIONS.NAME).setRequired(true);
  form.addTextItem().setTitle(ECOFLETE.QUESTIONS.COMPANY).setRequired(false);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.WHATSAPP)
    .setHelpText("Ejemplo: +54 9 11 1234 5678")
    .setRequired(true);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.EMAIL)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build())
    .setRequired(false);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.BASE_LOCATION)
    .setHelpText("Ejemplo: Chivilcoy, Buenos Aires")
    .setRequired(true);
}

function addEsteViajeSection_(form) {
  form.addPageBreakItem().setTitle("ESTE VIAJE");
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.VEHICLE)
    .setHelpText("Ejemplo: Semi con batea, Chasis y acoplado, Jaula doble piso")
    .setRequired(true);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.CARGO_TYPE)
    .setHelpText("Ejemplo: Granos, fertilizantes y carga general")
    .setValidation(FormApp.createTextValidation().requireTextLengthLessThanOrEqualTo(100).build())
    .setRequired(true);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.ORIGIN)
    .setHelpText("Localidad, provincia. Ejemplo: Pergamino, Buenos Aires")
    .setRequired(true);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.DESTINATION)
    .setHelpText("Localidad, provincia. Ejemplo: Rosario, Santa Fe")
    .setRequired(true);
  form.addDateItem().setTitle(ECOFLETE.QUESTIONS.DATE_FROM).setRequired(true);
  form.addDateItem()
    .setTitle(ECOFLETE.QUESTIONS.DATE_UNTIL)
    .setHelpText("La publicación dejará de aparecer automáticamente en EcoFlete una vez superada esta fecha. Si tenés otro viaje o una nueva disponibilidad, podés volver a completar este formulario.")
    .setRequired(true);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.CAPACITY)
    .setHelpText("Ejemplo: 28 toneladas, 12 pallets, 10 animales")
    .setRequired(true);
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.PRICE)
    .setHelpText("Ingresá el valor total estimado del viaje en pesos argentinos (ARS).")
    .setValidation(FormApp.createTextValidation().requireNumberGreaterThan(0).build())
    .setRequired(true);
  addPhotoUploadItem_(form);
  form.addParagraphTextItem()
    .setTitle(ECOFLETE.QUESTIONS.DETAILS)
    .setHelpText("Ejemplo: Regreso vacío. Puedo desviarme hasta 50 km de la ruta. No transporto hacienda.")
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(300).build())
    .setRequired(false);
}

function addDisponibilidadHabitualSection_(form) {
  form.addPageBreakItem().setTitle("TU DISPONIBILIDAD HABITUAL");
  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.USUAL_ZONES)
    .setHelpText("Ejemplo: Buenos Aires, sur de Santa Fe y este de Córdoba")
    .setValidation(FormApp.createTextValidation().requireTextLengthLessThanOrEqualTo(150).build())
    .setRequired(false);
  form.addMultipleChoiceItem()
    .setTitle(ECOFLETE.QUESTIONS.MATCH_CONTACT)
    .setChoiceValues(["Sí", "No"])
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle(ECOFLETE.QUESTIONS.AUTHORIZATION)
    .setChoiceValues(["Acepto"])
    .setRequired(true);
}

function addPhotoUploadItem_(form) {
  try {
    const item = form.addFileUploadItem()
      .setTitle(ECOFLETE.QUESTIONS.PHOTO)
      .setHelpText("Subí una foto actual y clara del vehículo que vas a utilizar.")
      .setRequired(true);

    if (typeof item.setFileTypes === "function") item.setFileTypes([FormApp.FileType.IMAGE]);
    if (typeof item.setMaxFiles === "function") item.setMaxFiles(1);
  } catch (error) {
    Logger.log("La pregunta de foto debe agregarse manualmente en Google Forms: " + error.message);
  }
}

function parseFormResponse_(event) {
  if (!event || !event.response) throw new Error("onFleteroFormSubmit debe ejecutarse con un evento de Google Forms.");

  return event.response.getItemResponses().reduce((answers, itemResponse) => {
    answers[itemResponse.getItem().getTitle()] = normalizeAnswer_(itemResponse.getResponse());
    return answers;
  }, {});
}

function normalizeAnswer_(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value == null ? "" : value;
}

function getRequiredSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("No existe la pestaña requerida: " + sheetName);
  return sheet;
}

function getSheetTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map(String).filter(Boolean);
  const records = values.slice(1)
    .map((row, rowIndex) => ({
      rowNumber: rowIndex + 2,
      data: headers.reduce((record, header, index) => {
        record[header] = row[index];
        return record;
      }, {})
    }))
    .filter((entry) => Object.values(entry.data).some((value) => value !== "" && value != null));

  return {
    sheet,
    headers,
    columnByName: headers.reduce((map, header, index) => {
      map[header] = index + 1;
      return map;
    }, {}),
    records
  };
}

function findRecordByValue_(table, column, value) {
  return table.records.find((entry) => String(entry.data[column] || "") === String(value));
}

function createCarrier_(sheet, table, response, phoneKey) {
  const carrierId = nextId_(table.records, "FLETERO_ID", "FL");
  const location = splitLocation_(response[ECOFLETE.QUESTIONS.BASE_LOCATION]);
  appendByHeaders_(sheet, table.headers, {
    FLETERO_ID: carrierId,
    TELEFONO_CLAVE: phoneKey,
    NOMBRE: response[ECOFLETE.QUESTIONS.NAME],
    EMPRESA: response[ECOFLETE.QUESTIONS.COMPANY],
    WHATSAPP: response[ECOFLETE.QUESTIONS.WHATSAPP],
    EMAIL: response[ECOFLETE.QUESTIONS.EMAIL],
    LOCALIDAD_BASE: location.city,
    PROVINCIA_BASE: location.province,
    TIPOS_VEHICULO: response[ECOFLETE.QUESTIONS.VEHICLE],
    TIPOS_CARGA: response[ECOFLETE.QUESTIONS.CARGO_TYPE],
    ZONAS_HABITUALES: response[ECOFLETE.QUESTIONS.USUAL_ZONES],
    FECHA_ALTA: new Date(),
    ULTIMA_ACTUALIZACION: new Date(),
    ACTIVO: ECOFLETE.YES
  });
  return carrierId;
}

function updateCarrier_(sheet, table, entry, response) {
  const location = splitLocation_(response[ECOFLETE.QUESTIONS.BASE_LOCATION]);
  updateRowByHeaders_(sheet, table, entry.rowNumber, {
    NOMBRE: response[ECOFLETE.QUESTIONS.NAME],
    EMPRESA: response[ECOFLETE.QUESTIONS.COMPANY],
    WHATSAPP: response[ECOFLETE.QUESTIONS.WHATSAPP],
    EMAIL: response[ECOFLETE.QUESTIONS.EMAIL],
    LOCALIDAD_BASE: location.city,
    PROVINCIA_BASE: location.province,
    TIPOS_VEHICULO: response[ECOFLETE.QUESTIONS.VEHICLE],
    TIPOS_CARGA: response[ECOFLETE.QUESTIONS.CARGO_TYPE],
    ZONAS_HABITUALES: response[ECOFLETE.QUESTIONS.USUAL_ZONES],
    ULTIMA_ACTUALIZACION: new Date()
  });
  return entry.data.FLETERO_ID;
}

function createOfferPublication_(sheet, table, input) {
  const response = input.response;
  const origin = splitLocation_(response[ECOFLETE.QUESTIONS.ORIGIN]);
  const destination = splitLocation_(response[ECOFLETE.QUESTIONS.DESTINATION]);
  const photo = extractDriveFileReference_(response[ECOFLETE.QUESTIONS.PHOTO]);
  const title = [origin.city, destination.city].filter(Boolean).join(" → ");
  const description = response[ECOFLETE.QUESTIONS.DETAILS] || "Disponibilidad publicada por transportista y pendiente de revisión de EcoFlete.";

  appendByHeaders_(sheet, table.headers, {
    PUBLICACION_ID: input.publicationId,
    TIPO_PUBLICACION: ECOFLETE.PUBLICATION_TYPES.OFFER,
    ACTOR_ID: input.carrierId,
    TELEFONO_CLAVE: input.phoneKey,
    FECHA_CARGA: input.submittedAt,
    ORIGEN: origin.city,
    PROVINCIA_ORIGEN: origin.province,
    DESTINO: destination.city,
    PROVINCIA_DESTINO: destination.province,
    FECHA_DESDE: response[ECOFLETE.QUESTIONS.DATE_FROM],
    FECHA_HASTA: response[ECOFLETE.QUESTIONS.DATE_UNTIL],
    CATEGORIA_CARGA: response[ECOFLETE.QUESTIONS.CARGO_TYPE],
    DETALLE_CARGA: response[ECOFLETE.QUESTIONS.DETAILS],
    "CAPACIDAD/CANTIDAD": response[ECOFLETE.QUESTIONS.CAPACITY],
    PRECIO_ESTIMADO: normalizePrice_(response[ECOFLETE.QUESTIONS.PRICE]),
    MONEDA: ECOFLETE.CURRENCY,
    ESTADO_ADMIN: ECOFLETE.ADMIN_STATUS.PENDING,
    VISIBLE_WEB: ECOFLETE.NO,
    TITULO_WEB: title,
    DESCRIPCION_WEB: description,
    FECHA_ULTIMA_EDICION: new Date(),
    FOTO_VEHICULO_URL: photo.url,
    FOTO_VEHICULO_ID: photo.id
  });
}

function appendByHeaders_(sheet, headers, record) {
  sheet.appendRow(headers.map((header) => Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ""));
}

function updateRowByHeaders_(sheet, table, rowNumber, record) {
  Object.keys(record).forEach((header) => {
    const column = table.columnByName[header];
    if (!column) return;
    sheet.getRange(rowNumber, column).setValue(record[header]);
  });
}

function ensurePublicationPhotoColumn_(spreadsheet) {
  const sheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.PUBLICATIONS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  ["TIPO_VEHICULO", "FOTO_VEHICULO_URL", "FOTO_VEHICULO_ID"].forEach((header) => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function nextId_(records, column, prefix) {
  const max = records.reduce((highest, entry) => {
    const match = String(entry.data[column] || "").match(new RegExp("^" + prefix + "-(\\d+)$"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return prefix + "-" + String(max + 1).padStart(4, "0");
}

function splitLocation_(value) {
  const raw = String(value || "").trim();
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], province: parts.slice(1).join(", ") };
  }
  return { city: raw, province: "" };
}

function normalizePrice_(value) {
  if (typeof value === "number") return value;
  const normalized = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : "";
}

function extractDriveFileReference_(value) {
  const raw = String(value || "").trim();
  if (!raw) return { id: "", url: "" };

  const match = raw.match(/[-\w]{25,}/);
  const id = match ? match[0] : "";
  return {
    id,
    url: id ? "https://drive.google.com/uc?export=view&id=" + id : raw
  };
}

function isActiveForWeb_(record, today) {
  const status = String(record.ESTADO_ADMIN || "").toUpperCase();
  const visible = String(record.VISIBLE_WEB || "").toUpperCase();
  const until = startOfDay_(parseDate_(record.FECHA_HASTA));
  const active = status === ECOFLETE.ADMIN_STATUS.ACTIVE || status === ECOFLETE.ADMIN_STATUS.PUBLISHED_LEGACY;
  return active && visible === ECOFLETE.YES && (!until || until >= today);
}

function sanitizePublication_(record, frontendType) {
  const id = String(record.PUBLICACION_ID || "");
  const title = String(record.TITULO_WEB || fallbackTitle_(record));
  const image = String(record.FOTO_VEHICULO_URL || record.PUBLIC_IMAGE || "");
  const price = Number(record.PRECIO_ESTIMADO);

  return {
    id,
    type: frontendType,
    origin: {
      city: String(record.ORIGEN || ""),
      province: String(record.PROVINCIA_ORIGEN || ""),
      lat: null,
      lng: null
    },
    destination: {
      city: String(record.DESTINO || ""),
      province: String(record.PROVINCIA_DESTINO || ""),
      lat: null,
      lng: null
    },
    date: asIsoDate_(record.FECHA_DESDE),
    dateEnd: asIsoDate_(record.FECHA_HASTA),
    dateFlexibility: "",
    category: String(record.CATEGORIA_CARGA || ""),
    vehicle: String(record.TIPO_VEHICULO || record.PUBLIC_VEHICLE || ""),
    capacity: String(record["CAPACIDAD/CANTIDAD"] || ""),
    cargo: String(record.DETALLE_CARGA || ""),
    title,
    description: String(record.DESCRIPCION_WEB || record.DETALLE_CARGA || ""),
    image,
    imageAlt: title ? "Foto del vehículo para " + title : "Foto del vehículo",
    priceEstimate: Number.isFinite(price) ? price : null,
    currency: String(record.MONEDA || ECOFLETE.CURRENCY),
    priceNote: "Estimado por el transportista",
    publishedAt: asIsoDate_(record.FECHA_ULTIMA_EDICION || record.FECHA_CARGA),
    featured: false,
    sortOrder: ""
  };
}

function fallbackTitle_(record) {
  return [record.ORIGEN, record.DESTINO].filter(Boolean).join(" → ");
}

function asIsoDate_(value) {
  const date = parseDate_(value);
  if (!date) return null;
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function parseDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]") return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay_(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
