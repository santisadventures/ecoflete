const EcoFleteSearch = (() => {
  function filterListings(listings, filters, localities = []) {
    const originPoint = EcoFleteDistance.findLocality(localities, filters.origin);
    const destinationPoint = EcoFleteDistance.findLocality(localities, filters.destination);
    const radius = filters.radius === "flexible" ? Infinity : Number(filters.radius || 0);

    return listings.filter((listing) => {
      return matchesLocation(listing.origin, filters.origin, originPoint, radius)
        && matchesLocation(listing.destination, filters.destination, destinationPoint, radius)
        && matchesText(listing.category, filters.category)
        && matchesText(listing.vehicle, filters.vehicle)
        && matchesProvince(listing, filters.province)
        && matchesDate(listing, filters.date);
    });
  }

  function sortListings(listings, sort) {
    const copy = [...listings];
    if (sort === "date") {
      return copy.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }
    return copy.sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  }

  function matchesLocation(place, query, queryPoint, radius) {
    if (!query) return true;
    const placeText = `${place?.city || ""} ${place?.province || ""}`;
    if (EcoFleteDistance.normalize(placeText).includes(EcoFleteDistance.normalize(query))) return true;
    if (!queryPoint || radius === 0) return false;
    const distance = EcoFleteDistance.haversineKm(place, queryPoint);
    return distance !== null && distance <= radius;
  }

  function matchesText(value, query) {
    if (!query) return true;
    return EcoFleteDistance.normalize(value).includes(EcoFleteDistance.normalize(query));
  }

  function matchesProvince(listing, query) {
    if (!query) return true;
    return matchesText(listing.origin?.province, query) || matchesText(listing.destination?.province, query);
  }

  function matchesDate(listing, query) {
    if (!query) return true;
    if (!listing.dateEnd) return listing.date === query;
    return query >= listing.date && query <= listing.dateEnd;
  }

  return { filterListings, sortListings };
})();
