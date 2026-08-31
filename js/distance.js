const EcoFleteDistance = (() => {
  const EARTH_RADIUS_KM = 6371;

  function toRadians(value) {
    return value * Math.PI / 180;
  }

  function haversineKm(a, b) {
    if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  }

  async function loadLocalities() {
    const response = await fetch("data/localidades.json");
    if (!response.ok) return [];
    return response.json();
  }

  function findLocality(localities, text) {
    const normalized = normalize(text);
    if (!normalized) return null;
    return localities.find((item) => normalize(item.city) === normalized) || null;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  return { haversineKm, loadLocalities, findLocality, normalize };
})();
