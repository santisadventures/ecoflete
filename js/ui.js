const EcoFleteUi = (() => {
  const fallbackImage = "assets/images/ecoflete-hero.png";

  function initNavigation() {
    const button = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!button || !nav) return;
    button.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function initFormLinks() {
    document.querySelectorAll("[data-form-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const kind = link.dataset.formLink;
        const url = getFormUrl(kind, link.dataset.listingId);
        EcoFleteApi.track(`${kind}_form_clicked`);
        if (!url) {
          event.preventDefault();
          alert("Falta configurar el enlace del formulario en js/config.js.");
          return;
        }
        link.setAttribute("href", url);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener");
      });
    });
  }

  function getFormUrl(kind, listingId = "") {
    const config = window.ECOFLETE_CONFIG;
    if (kind === "offer") return config.OFFER_FREIGHT_FORM_URL;
    if (kind === "request") return config.REQUEST_FREIGHT_FORM_URL;
    if (kind === "interést" && config.INTEREST_FORM_URL) {
      const separator = config.INTEREST_FORM_URL.includes("?") ? "&" : "?";
      return `${config.INTEREST_FORM_URL}${separator}listingId=${encodeURIComponent(listingId)}`;
    }
    return "";
  }

  function listingCard(listing) {
    const isRequest = listing.type === "request";
    const detailUrl = `detalle.html?id=${encodeURIComponent(listing.id)}`;
    return `
      <article class="listing-card ${isRequest ? "listing-card--request" : ""}">
        <img class="listing-card__image" src="${escapeHtml(listing.image || fallbackImage)}" alt="${escapeHtml(listing.imageAlt || listing.title)}">
        <div class="listing-card__body">
          <span class="listing-card__badge">${isRequest ? "Busca flete" : "Ofrece flete"}</span>
          <p class="listing-card__route">${escapeHtml(listing.origin.city)} -> ${escapeHtml(listing.destination.city)}</p>
          <h3>${escapeHtml(listing.title)}</h3>
          <ul class="listing-card__meta">
            <li><strong>${formatDate(listing.date, listing.dateEnd)}</strong><br>${escapeHtml(listing.dateFlexibility || "Fecha definida")}</li>
            <li><strong>${escapeHtml(listing.category)}</strong><br>${escapeHtml(listing.vehicle || "Vehículo a coordinar")}</li>
            <li><strong>${escapeHtml(listing.capacity || listing.cargo || "A coordinar")}</strong><br>Capacidad / carga</li>
            <li><strong>${escapeHtml(listing.destination.province)}</strong><br>Destino</li>
          </ul>
          <p class="listing-card__description">${escapeHtml(listing.description)}</p>
          <div class="listing-card__footer">
            <span class="listing-card__date">${formatPublished(listing.publishedAt)}</span>
            <a class="button button--secondary" href="${detailUrl}">${isRequest ? "Ver solicitud" : "Ver viaje"}</a>
          </div>
        </div>
      </article>`;
  }

  function skeletonCards(count = 4) {
    return Array.from({ length: count }, () => "<div class=\"skeleton\" aria-hidden=\"true\"></div>").join("");
  }

  function formatDate(date, dateEnd) {
    if (!date) return "Fecha a coordinar";
    const start = shortDate(date);
    return dateEnd ? `${start} - ${shortDate(dateEnd)}` : start;
  }

  function shortDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date).replace(".", "");
  }

  function formatPublished(value) {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00`);
    return `Publicado ${new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)}`;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  initNavigation();
  document.addEventListener("DOMContentLoaded", initFormLinks);

  return { initFormLinks, listingCard, skeletonCards, getFormUrl, formatDate, escapeHtml };
})();
