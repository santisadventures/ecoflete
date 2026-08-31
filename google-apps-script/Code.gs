const CONFIG = {
  OFFERED_SHEET: "FLETES_OFRECIDOS",
  REQUESTS_SHEET: "FLETES_BUSCADOS",
  STATUS_PUBLIC: "PUBLICADO"
};

const PUBLIC_COLUMNS = [
  "ADMIN_ID",
  "PUBLIC_TITLE",
  "PUBLIC_ORIGIN",
  "PUBLIC_ORIGIN_PROVINCE",
  "PUBLIC_ORIGIN_LAT",
  "PUBLIC_ORIGIN_LNG",
  "PUBLIC_DESTINATION",
  "PUBLIC_DESTINATION_PROVINCE",
  "PUBLIC_DESTINATION_LAT",
  "PUBLIC_DESTINATION_LNG",
  "PUBLIC_DATE",
  "PUBLIC_DATE_END",
  "PUBLIC_DATE_FLEXIBILITY",
  "PUBLIC_CATEGORY",
  "PUBLIC_VEHICLE",
  "PUBLIC_CAPACITY",
  "PUBLIC_CARGO",
  "PUBLIC_DESCRIPTION",
  "PUBLIC_IMAGE",
  "PUBLIC_IMAGE_ALT",
  "PUBLIC_PUBLISHED_AT",
  "PUBLIC_FEATURED",
  "PUBLIC_SORT_ORDER"
];

const REQUIRED_PUBLIC_COLUMNS = [
  "ADMIN_ID",
  "PUBLIC_TITLE",
  "PUBLIC_ORIGIN",
  "PUBLIC_DESTINATION",
  "PUBLIC_DATE",
  "PUBLIC_CATEGORY"
];

function doGet() {
  const output = {
    updatedAt: new Date().toISOString(),
    offeredTrips: readSheet(CONFIG.OFFERED_SHEET, "offered"),
    freightRequests: readSheet(CONFIG.REQUESTS_SHEET, "request")
  };

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheet(sheetName, type) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  return values.slice(1)
    .map((row) => toRecord(headers, row))
    .filter((record) => record.ADMIN_STATUS === CONFIG.STATUS_PUBLIC)
    .filter(hasRequiredPublicFields)
    .map((record) => sanitizeRecord(record, type))
    .sort((a, b) => Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999));
}

function toRecord(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index];
    return record;
  }, {});
}

function hasRequiredPublicFields(record) {
  return REQUIRED_PUBLIC_COLUMNS.every((column) => Boolean(record[column]));
}

function sanitizeRecord(record, type) {
  const publicRecord = PUBLIC_COLUMNS.reduce((allowed, column) => {
    allowed[column] = record[column] || "";
    return allowed;
  }, {});

  return {
    id: String(publicRecord.ADMIN_ID),
    type,
    origin: {
      city: String(publicRecord.PUBLIC_ORIGIN),
      province: String(publicRecord.PUBLIC_ORIGIN_PROVINCE),
      lat: toNumberOrNull(publicRecord.PUBLIC_ORIGIN_LAT),
      lng: toNumberOrNull(publicRecord.PUBLIC_ORIGIN_LNG)
    },
    destination: {
      city: String(publicRecord.PUBLIC_DESTINATION),
      province: String(publicRecord.PUBLIC_DESTINATION_PROVINCE),
      lat: toNumberOrNull(publicRecord.PUBLIC_DESTINATION_LAT),
      lng: toNumberOrNull(publicRecord.PUBLIC_DESTINATION_LNG)
    },
    date: asIsoDate(publicRecord.PUBLIC_DATE),
    dateEnd: asIsoDate(publicRecord.PUBLIC_DATE_END),
    dateFlexibility: String(publicRecord.PUBLIC_DATE_FLEXIBILITY || ""),
    category: String(publicRecord.PUBLIC_CATEGORY),
    vehicle: String(publicRecord.PUBLIC_VEHICLE || ""),
    capacity: String(publicRecord.PUBLIC_CAPACITY || ""),
    cargo: String(publicRecord.PUBLIC_CARGO || ""),
    title: String(publicRecord.PUBLIC_TITLE),
    description: String(publicRecord.PUBLIC_DESCRIPTION || ""),
    image: String(publicRecord.PUBLIC_IMAGE || ""),
    imageAlt: String(publicRecord.PUBLIC_IMAGE_ALT || ""),
    publishedAt: asIsoDate(publicRecord.PUBLIC_PUBLISHED_AT),
    featured: String(publicRecord.PUBLIC_FEATURED).toUpperCase() === "TRUE",
    sortOrder: publicRecord.PUBLIC_SORT_ORDER || ""
  };
}

function asIsoDate(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
