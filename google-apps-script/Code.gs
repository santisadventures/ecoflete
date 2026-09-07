const ECOFLETE_FOTOS = {
  ROOT_FOLDER_ID: "1t6gw4Mx-AR1kn1hPMIE3MX9tBUrk6HVL",
  CARGAS_FOLDER_ID: "14upRT6R31vAn7YMUQYQJsj2CFtWz65WQ",
  VEHICULOS_FOLDER_ID: "1_9a_DrRckpZaSRDjry1AMKDAtaUTv2_t"
};

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
    AUTHORIZATION: "Autorización para publicar",
    REQUEST_ORIGIN: "¿Desde dónde necesitás el flete?",
    REQUEST_DESTINATION: "¿Hasta dónde necesitás el flete?",
    REQUEST_DATE: "Fecha estimada del traslado",
    REQUEST_FLEXIBILITY: "Días de flexibilidad",
    REQUEST_CARGO: "¿Qué necesitás transportar?",
    REQUEST_VEHICLE: "¿Qué tipo de transporte necesitás?",
    REQUEST_AMOUNT: "Peso / volumen / cantidad",
    REQUEST_BUDGET: "Presupuesto estimado para el traslado",
    REQUEST_DETAILS: "Comentarios adicionales",
    REQUEST_PHOTO: "Foto del producto o carga a transportar"
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


function createProductoresForm() {
  const form = FormApp.create("EcoFlete — Buscar un flete")
    .setTitle("Buscá un flete en EcoFlete")
    .setDescription(
      "Contanos qué necesitás transportar y nosotros preparamos la publicación. " +
      "Tus datos de contacto no se publican automáticamente."
    )
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setDestination(FormApp.DestinationType.SPREADSHEET, ECOFLETE.SPREADSHEET_ID);

  const formsFolder = DriveApp.getFolderById("1YWl7Cng-FtOZ9fCm0HgOLXUByYQArnjK");
  DriveApp.getFileById(form.getId()).moveTo(formsFolder);

  form.addSectionHeaderItem().setTitle("TUS DATOS");

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.NAME)
    .setRequired(true);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.WHATSAPP)
    .setHelpText("Ejemplo: +54 9 11 1234 5678")
    .setRequired(true);

  form.addSectionHeaderItem().setTitle("DATOS DEL TRASLADO");

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_ORIGIN)
    .setHelpText("Localidad, provincia. Ejemplo: Balcarce, Buenos Aires")
    .setRequired(true);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_DESTINATION)
    .setHelpText("Localidad, provincia. Ejemplo: La Plata, Buenos Aires")
    .setRequired(true);

  form.addDateItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_DATE)
    .setRequired(true);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_FLEXIBILITY)
    .setHelpText("Ingresá solamente la cantidad de días. Ejemplo: 2")
    .setValidation(
      FormApp.createTextValidation()
        .requireNumberGreaterThanOrEqualTo(0)
        .build()
    )
    .setRequired(true);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_CARGO)
    .setHelpText("Ejemplo: Tractor agrícola")
    .setValidation(
      FormApp.createTextValidation()
        .requireTextLengthLessThanOrEqualTo(100)
        .build()
    )
    .setRequired(true);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_VEHICLE)
    .setHelpText("Opcional. Ejemplo: Carretón")
    .setRequired(false);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_AMOUNT)
    .setHelpText("Ejemplo: 4 toneladas, 12 pallets, 20 animales")
    .setRequired(true);

  form.addTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_BUDGET)
    .setHelpText("Ingresá el presupuesto total estimado en pesos argentinos (ARS).")
    .setValidation(
      FormApp.createTextValidation()
        .requireNumberGreaterThan(0)
        .build()
    )
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle(ECOFLETE.QUESTIONS.REQUEST_DETAILS)
    .setHelpText("Opcional. Agregá cualquier dato que pueda ayudar al transportista.")
    .setValidation(
      FormApp.createParagraphTextValidation()
        .requireTextLengthLessThanOrEqualTo(500)
        .build()
    )
    .setRequired(false);

  ScriptApp.newTrigger("onProductorFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log("Form productores URL: " + form.getPublishedUrl());
  Logger.log("Editar productores: " + form.getEditUrl());

  return {
    publishedUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl()
  };
}

function onProductorFormSubmit(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const response = parseFormResponse_(event);
    const spreadsheet = SpreadsheetApp.openById(ECOFLETE.SPREADSHEET_ID);

    ensureProducerColumns_(spreadsheet);
    ensureRequestPublicationColumns_(spreadsheet);

    const producersSheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.PRODUCERS);
    const publicationsSheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.PUBLICATIONS);

    const producers = getSheetTable_(producersSheet);
    const publications = getSheetTable_(publicationsSheet);

    const phoneKey = normalizeWhatsApp(response[ECOFLETE.QUESTIONS.WHATSAPP]);
    if (!phoneKey) throw new Error("No se pudo normalizar el WhatsApp recibido.");

    const existingProducer = findRecordByValue_(producers, "TELEFONO_CLAVE", phoneKey);

    const producerId = existingProducer
      ? updateProducer_(producersSheet, producers, existingProducer, response)
      : createProducer_(producersSheet, producers, response, phoneKey);

    const publicationId = nextId_(
      publications.records,
      "PUBLICACION_ID",
      "EF"
    );

    createRequestPublication_(publicationsSheet, publications, {
      publicationId,
      producerId,
      phoneKey,
      response,
      submittedAt: event && event.response
        ? event.response.getTimestamp()
        : new Date()
    });

  } catch (error) {
    console.error(error.stack || error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function ensureProducerColumns_(spreadsheet) {
  const sheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.PRODUCERS);

  ensureColumns_(sheet, [
    "PRODUCTOR_ID",
    "TELEFONO_CLAVE",
    "NOMBRE",
    "WHATSAPP",
    "FECHA_ALTA",
    "ULTIMA_ACTUALIZACION",
    "ACTIVO"
  ]);
}

function ensureRequestPublicationColumns_(spreadsheet) {
  const sheet = getRequiredSheet_(spreadsheet, ECOFLETE.SHEETS.PUBLICATIONS);

  ensureColumns_(sheet, [
    "TIPO_VEHICULO",
    "FLEXIBILIDAD_FECHA",
    "FOTO_CARGA_URL",
    "FOTO_CARGA_ID"
  ]);
}

function ensureColumns_(sheet, requiredHeaders) {
  let lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(String);

  requiredHeaders.forEach((header) => {
    if (!headers.includes(header)) {
      lastColumn += 1;
      sheet.getRange(1, lastColumn).setValue(header);
      headers.push(header);
    }
  });
}

function createProducer_(sheet, table, response, phoneKey) {
  const producerId = nextId_(
    table.records,
    "PRODUCTOR_ID",
    "PR"
  );

  appendByHeaders_(sheet, table.headers, {
    PRODUCTOR_ID: producerId,
    TELEFONO_CLAVE: phoneKey,
    NOMBRE: response[ECOFLETE.QUESTIONS.NAME],
    WHATSAPP: response[ECOFLETE.QUESTIONS.WHATSAPP],
    FECHA_ALTA: new Date(),
    ULTIMA_ACTUALIZACION: new Date(),
    ACTIVO: ECOFLETE.YES
  });

  return producerId;
}

function updateProducer_(sheet, table, entry, response) {
  updateRowByHeaders_(sheet, table, entry.rowNumber, {
    NOMBRE: response[ECOFLETE.QUESTIONS.NAME],
    WHATSAPP: response[ECOFLETE.QUESTIONS.WHATSAPP],
    ULTIMA_ACTUALIZACION: new Date(),
    ACTIVO: ECOFLETE.YES
  });

  return entry.data.PRODUCTOR_ID;
}

function createRequestPublication_(sheet, table, input) {
  const response = input.response;

  const origin = splitLocation_(
    response[ECOFLETE.QUESTIONS.REQUEST_ORIGIN]
  );

  const destination = splitLocation_(
    response[ECOFLETE.QUESTIONS.REQUEST_DESTINATION]
  );

  const photo = extractDriveFileReference_(
    response[ECOFLETE.QUESTIONS.REQUEST_PHOTO]
  );

  const cargo = response[ECOFLETE.QUESTIONS.REQUEST_CARGO];
  const comments = response[ECOFLETE.QUESTIONS.REQUEST_DETAILS];

  const title = cargo
    ? "Traslado de " + cargo
    : "Solicitud de flete";

  const description =
    comments ||
    ("Se busca transporte para " + cargo + ".");

  appendByHeaders_(sheet, table.headers, {
    PUBLICACION_ID: input.publicationId,
    TIPO_PUBLICACION: ECOFLETE.PUBLICATION_TYPES.REQUEST,
    ACTOR_ID: input.producerId,
    TELEFONO_CLAVE: input.phoneKey,
    FECHA_CARGA: input.submittedAt,

    ORIGEN: origin.city,
    PROVINCIA_ORIGEN: origin.province,

    DESTINO: destination.city,
    PROVINCIA_DESTINO: destination.province,

    FECHA_DESDE: response[ECOFLETE.QUESTIONS.REQUEST_DATE],
    FECHA_HASTA: response[ECOFLETE.QUESTIONS.REQUEST_DATE],

    FLEXIBILIDAD_FECHA:
      response[ECOFLETE.QUESTIONS.REQUEST_FLEXIBILITY],

    CATEGORIA_CARGA:
      cargo,

    DETALLE_CARGA:
      cargo,

    TIPO_VEHICULO:
      response[ECOFLETE.QUESTIONS.REQUEST_VEHICLE],

    "CAPACIDAD/CANTIDAD":
      response[ECOFLETE.QUESTIONS.REQUEST_AMOUNT],

    PRECIO_ESTIMADO:
      normalizePrice_(
        response[ECOFLETE.QUESTIONS.REQUEST_BUDGET]
      ),

    MONEDA: ECOFLETE.CURRENCY,

    ESTADO_ADMIN:
      ECOFLETE.ADMIN_STATUS.PENDING,

    VISIBLE_WEB:
      ECOFLETE.NO,

    TITULO_WEB:
      title,

    DESCRIPCION_WEB:
      description,

    FOTO_CARGA_URL:
      photo.url,

    FOTO_CARGA_ID:
      photo.id,

    FECHA_ULTIMA_EDICION:
      new Date()
  });
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
  [
    "TIPO_VEHICULO",
    "FOTO_VEHICULO_URL",
    "FOTO_VEHICULO_ID",
    "FOTO_CARGA_URL",
    "FOTO_CARGA_ID"
  ].forEach((header) => {
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
    dateFlexibility: record.FLEXIBILIDAD_FECHA !== ""
      ? "+/- " + record.FLEXIBILIDAD_FECHA + " días"
      : "",
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
    priceNote: frontendType === "request" ? "Presupuesto estimado" : "Estimado por el transportista",
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

function listarFormsProductores() {
  const files = DriveApp.getFilesByName("EcoFlete — Buscar un flete");

  Logger.log("=== FORMS DE PRODUCTORES ===");

  while (files.hasNext()) {
    const file = files.next();

    Logger.log(
      "ID: " + file.getId() +
      " | Creado: " + file.getDateCreated() +
      " | URL: https://docs.google.com/forms/d/" + file.getId() + "/edit"
    );
  }
}

function verUrlPublicaProductores() {
  const form = FormApp.openById("1oATL63TiE9GquZt0XrcrBLftZwL46KGYyLgLCu5Xa-o");
  Logger.log("URL PUBLICA: " + form.getPublishedUrl());
}


/**
 * Crea una única vez la estructura de carpetas para las fotos
 * subidas desde los formularios propios de EcoFlete.
 *
 * EcoFlete - Fotos/
 *   cargas/
 *   vehiculos/
 */
function crearCarpetasFotosEcoFlete() {
  const ROOT_NAME = "EcoFlete - Fotos";
  const CARGAS_NAME = "cargas";
  const VEHICULOS_NAME = "vehiculos";

  const rootFolders = DriveApp.getFoldersByName(ROOT_NAME);

  const root = rootFolders.hasNext()
    ? rootFolders.next()
    : DriveApp.createFolder(ROOT_NAME);

  const cargasFolders = root.getFoldersByName(CARGAS_NAME);
  const cargas = cargasFolders.hasNext()
    ? cargasFolders.next()
    : root.createFolder(CARGAS_NAME);

  const vehiculosFolders = root.getFoldersByName(VEHICULOS_NAME);
  const vehiculos = vehiculosFolders.hasNext()
    ? vehiculosFolders.next()
    : root.createFolder(VEHICULOS_NAME);

  Logger.log("ROOT_FOLDER_ID=" + root.getId());
  Logger.log("CARGAS_FOLDER_ID=" + cargas.getId());
  Logger.log("VEHICULOS_FOLDER_ID=" + vehiculos.getId());
}


/**
 * Receptor del formulario propio /buscar-flete/
 */
function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.action === "buscar_flete") {
      const result = procesarSolicitudBuscarFlete_(payload);

      return jsonResponse_({
        ok: true,
        publicationId: result.publicationId,
        producerId: result.producerId
      });
    }

    if (payload.action === "ofrecer_flete") {
      const result = procesarSolicitudOfrecerFlete_(payload);

      return jsonResponse_({
        ok: true,
        publicationId: result.publicationId,
        carrierId: result.carrierId
      });
    }

    return jsonResponse_({
      ok: false,
      error: "Acción no reconocida."
    });

  } catch (error) {
    console.error(error.stack || error);

    return jsonResponse_({
      ok: false,
      error: String(error.message || error)
    });
  }
}



function procesarSolicitudOfrecerFlete_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    validarSolicitudOfrecerFlete_(payload);

    const spreadsheet = SpreadsheetApp.openById(ECOFLETE.SPREADSHEET_ID);

    const carriersSheet = getRequiredSheet_(
      spreadsheet,
      ECOFLETE.SHEETS.CARRIERS
    );

    const publicationsSheet = getRequiredSheet_(
      spreadsheet,
      ECOFLETE.SHEETS.PUBLICATIONS
    );

    const carriers = getSheetTable_(carriersSheet);
    const publications = getSheetTable_(publicationsSheet);

    const phoneKey = normalizeWhatsApp(payload.whatsapp);

    if (!phoneKey) {
      throw new Error("No se pudo normalizar el WhatsApp recibido.");
    }

    const foto = guardarFotoVehiculo_(payload.foto);

    const response = {};

    response[ECOFLETE.QUESTIONS.NAME] = payload.nombre || "";
    response[ECOFLETE.QUESTIONS.COMPANY] = payload.empresa || "";
    response[ECOFLETE.QUESTIONS.WHATSAPP] = payload.whatsapp || "";
    response[ECOFLETE.QUESTIONS.EMAIL] = payload.email || "";
    response[ECOFLETE.QUESTIONS.BASE_LOCATION] = payload.localidadBase || "";
    response[ECOFLETE.QUESTIONS.VEHICLE] = payload.vehiculo || "";
    response[ECOFLETE.QUESTIONS.CARGO_TYPE] = payload.carga || "";
    response[ECOFLETE.QUESTIONS.ORIGIN] = payload.origen || "";
    response[ECOFLETE.QUESTIONS.DESTINATION] = payload.destino || "";
    response[ECOFLETE.QUESTIONS.DATE_FROM] = payload.desde || "";
    response[ECOFLETE.QUESTIONS.DATE_UNTIL] = payload.hasta || "";
    response[ECOFLETE.QUESTIONS.CAPACITY] = payload.capacidad || "";
    response[ECOFLETE.QUESTIONS.PRICE] = payload.precio || "";
    response[ECOFLETE.QUESTIONS.DETAILS] = payload.comentarios || "";
    response[ECOFLETE.QUESTIONS.USUAL_ZONES] = payload.zonas || "";

    response[ECOFLETE.QUESTIONS.PHOTO] =
      "https://drive.google.com/file/d/" + foto.id + "/view";

    const existingCarrier = findRecordByValue_(
      carriers,
      "TELEFONO_CLAVE",
      phoneKey
    );

    const carrierId = existingCarrier
      ? updateCarrier_(
          carriersSheet,
          carriers,
          existingCarrier,
          response,
          phoneKey
        )
      : createCarrier_(
          carriersSheet,
          carriers,
          response,
          phoneKey
        );

    const publicationId = nextId_(
      publications.records,
      "PUBLICACION_ID",
      "EF"
    );

    createOfferPublication_(
      publicationsSheet,
      publications,
      {
        publicationId,
        carrierId,
        phoneKey,
        response,
        submittedAt: new Date()
      }
    );

    return {
      publicationId,
      carrierId
    };

  } finally {
    lock.releaseLock();
  }
}


function validarSolicitudOfrecerFlete_(payload) {
  const required = {
    nombre: "Nombre y apellido",
    whatsapp: "WhatsApp",
    localidadBase: "Localidad base",
    vehiculo: "Tipo de vehículo",
    carga: "Tipo de carga",
    origen: "Origen",
    destino: "Destino",
    desde: "Fecha desde",
    hasta: "Fecha hasta",
    capacidad: "Capacidad",
    precio: "Precio estimado",
    foto: "Foto del vehículo"
  };

  Object.keys(required).forEach((key) => {
    if (!payload[key]) {
      throw new Error("Falta completar: " + required[key]);
    }
  });
}


function guardarFotoVehiculo_(foto) {
  if (!foto || !foto.base64) {
    throw new Error("No se recibió la foto del vehículo.");
  }

  if (!String(foto.type || "").startsWith("image/")) {
    throw new Error("El archivo del vehículo debe ser una imagen.");
  }

  const base64 = String(foto.base64).replace(
    /^data:[^;]+;base64,/,
    ""
  );

  const bytes = Utilities.base64Decode(base64);

  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error("La foto no puede superar los 10 MB.");
  }

  const root = DriveApp.getFolderById(
    ECOFLETE_FOTOS.ROOT_FOLDER_ID
  );

  const folders = root.getFoldersByName("vehiculos");

  const folder = folders.hasNext()
    ? folders.next()
    : root.createFolder("vehiculos");

  const safeName = String(foto.name || "vehiculo.jpg")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const name =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss"
    ) +
    "-" +
    safeName;

  const blob = Utilities.newBlob(
    bytes,
    foto.type || "image/jpeg",
    name
  );

  const file = folder.createFile(blob);

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return {
    id: file.getId(),
    url:
      "https://drive.google.com/uc?export=view&id=" +
      file.getId()
  };
}


function procesarSolicitudBuscarFlete_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    validarSolicitudBuscarFlete_(payload);

    const spreadsheet = SpreadsheetApp.openById(ECOFLETE.SPREADSHEET_ID);

    ensureProducerColumns_(spreadsheet);
    ensureRequestPublicationColumns_(spreadsheet);

    const producersSheet = getRequiredSheet_(
      spreadsheet,
      ECOFLETE.SHEETS.PRODUCERS
    );

    const publicationsSheet = getRequiredSheet_(
      spreadsheet,
      ECOFLETE.SHEETS.PUBLICATIONS
    );

    const producers = getSheetTable_(producersSheet);
    const publications = getSheetTable_(publicationsSheet);

    const phoneKey = normalizeWhatsApp(payload.whatsapp);

    if (!phoneKey) {
      throw new Error("No se pudo normalizar el WhatsApp recibido.");
    }

    const response = {};

    response[ECOFLETE.QUESTIONS.NAME] = payload.nombre || "";
    response[ECOFLETE.QUESTIONS.WHATSAPP] = payload.whatsapp || "";

    response[ECOFLETE.QUESTIONS.REQUEST_ORIGIN] =
      payload.origen || "";

    response[ECOFLETE.QUESTIONS.REQUEST_DESTINATION] =
      payload.destino || "";

    response[ECOFLETE.QUESTIONS.REQUEST_DATE] =
      payload.fecha || "";

    response[ECOFLETE.QUESTIONS.REQUEST_FLEXIBILITY] =
      payload.flexibilidad || "";

    response[ECOFLETE.QUESTIONS.REQUEST_CARGO] =
      payload.carga || "";

    response[ECOFLETE.QUESTIONS.REQUEST_VEHICLE] =
      payload.tipoTransporte || "";

    response[ECOFLETE.QUESTIONS.REQUEST_AMOUNT] =
      payload.cantidad || "";

    response[ECOFLETE.QUESTIONS.REQUEST_BUDGET] =
      payload.presupuesto || "";

    response[ECOFLETE.QUESTIONS.REQUEST_DETAILS] =
      payload.comentarios || "";

    const foto = guardarFotoCarga_(payload.foto);

    response[ECOFLETE.QUESTIONS.REQUEST_PHOTO] = foto.url;

    const existingProducer = findRecordByValue_(
      producers,
      "TELEFONO_CLAVE",
      phoneKey
    );

    const producerId = existingProducer
      ? updateProducer_(
          producersSheet,
          producers,
          existingProducer,
          response
        )
      : createProducer_(
          producersSheet,
          producers,
          response,
          phoneKey
        );

    const publicationId = nextId_(
      publications.records,
      "PUBLICACION_ID",
      "EF"
    );

    createRequestPublication_(
      publicationsSheet,
      publications,
      {
        publicationId,
        producerId,
        phoneKey,
        response,
        submittedAt: new Date()
      }
    );

    // Garantizamos que se use exactamente el archivo recién subido.
    const updatedPublications = getSheetTable_(publicationsSheet);

    const newPublication = findRecordByValue_(
      updatedPublications,
      "PUBLICACION_ID",
      publicationId
    );

    if (newPublication) {
      updateRowByHeaders_(
        publicationsSheet,
        updatedPublications,
        newPublication.rowNumber,
        {
          FOTO_CARGA_URL: foto.url,
          FOTO_CARGA_ID: foto.id
        }
      );
    }

    return {
      publicationId,
      producerId
    };

  } finally {
    lock.releaseLock();
  }
}


function validarSolicitudBuscarFlete_(payload) {
  const required = [
    ["nombre", "Nombre y apellido"],
    ["whatsapp", "WhatsApp"],
    ["origen", "Origen"],
    ["destino", "Destino"],
    ["fecha", "Fecha estimada"],
    ["carga", "Carga"],
    ["cantidad", "Peso / volumen / cantidad"],
    ["foto", "Foto de la carga"]
  ];

  required.forEach(([key, label]) => {
    if (!String(payload[key] || "").trim()) {
      throw new Error("Falta el campo obligatorio: " + label);
    }
  });
}


function guardarFotoCarga_(foto) {
  if (!foto || !foto.base64) {
    throw new Error("No se recibió la foto de la carga.");
  }

  const mimeType = String(foto.type || "image/jpeg");

  if (!mimeType.startsWith("image/")) {
    throw new Error("El archivo recibido no es una imagen válida.");
  }

  const rawBase64 = String(foto.base64)
    .replace(/^data:[^;]+;base64,/, "");

  const bytes = Utilities.base64Decode(rawBase64);

  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error("La imagen supera el máximo de 10 MB.");
  }

  const folder = DriveApp.getFolderById(
    ECOFLETE_FOTOS.CARGAS_FOLDER_ID
  );

  const safeName = String(foto.name || "carga.jpg")
    .replace(/[^\w.\-]+/g, "_");

  const filename =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss"
    ) +
    "-" +
    safeName;

  const blob = Utilities.newBlob(
    bytes,
    mimeType,
    filename
  );

  const file = folder.createFile(blob);

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return {
    id: file.getId(),
    url: "https://drive.google.com/uc?export=view&id=" + file.getId()
  };
}


function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function crearCarpetasFotosEcoFleteV2() {
  const root = DriveApp.createFolder("EcoFlete - Fotos");
  const cargas = root.createFolder("cargas");
  const vehiculos = root.createFolder("vehiculos");

  Logger.log("ROOT_FOLDER_ID=" + root.getId());
  Logger.log("CARGAS_FOLDER_ID=" + cargas.getId());
  Logger.log("VEHICULOS_FOLDER_ID=" + vehiculos.getId());
}


function crearCarpetaVehiculosEcoFleteV2() {
  const root = DriveApp.getFolderById(
    "1t6gw4Mx-AR1kn1hPMIE3MX9tBUrk6HVL"
  );

  const vehiculos = root.createFolder("vehiculos");

  Logger.log("VEHICULOS_FOLDER_ID=" + vehiculos.getId());
}


function verificarCarpetaVehiculosEcoFlete() {
  const id = ECOFLETE_FOTOS.VEHICULOS_FOLDER_ID;

  Logger.log("ID CONFIGURADO=[" + id + "]");
  Logger.log("LARGO ID=" + id.length);

  const folder = DriveApp.getFolderById(id);

  Logger.log("CARPETA OK=" + folder.getName());
  Logger.log("CARPETA ID=" + folder.getId());
}
