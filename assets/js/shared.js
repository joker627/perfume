export const WHATSAPP_NUMBER = "573122123153";

export const escapeHtml = value => String(value ?? "").replace(/[&<>"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
})[character]);

export const money = value => new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0
}).format(Number(value) || 0);

export const makeWhatsAppLink = message =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const salePrice = (price, perfume) => Math.round(
  Number(price) * (100 - (Number(perfume.prices?.discount) || 0)) / 100
);

export async function loadCatalog() {
  const response = await fetch("./data/products.json");
  if (!response.ok) throw new Error("No se encontró data/products.json");
  const data = await response.json();
  if (!Array.isArray(data.perfumes)) throw new Error("El catálogo no incluye la lista de perfumes");
  return data;
}

export function makeOrderLink(perfume, size) {
  const amount = salePrice(size.price, perfume);
  const message = [
    "Hola, YC1.1. Quiero consultar este perfume:",
    "",
    `*${perfume.brand} ${perfume.name}*`,
    `Presentación: ${size.ml} ml`,
    `Precio: ${money(amount)}`,
    "",
    "¿Me confirman disponibilidad?"
  ].join("\n");
  return makeWhatsAppLink(message);
}

export function makeComboOrderLink(combo, perfumes) {
  const items = combo.products.map(item => {
    const perfume = perfumes.find(entry => entry.id === item.id);
    return perfume ? `${perfume.brand} ${perfume.name} ${item.ml} ml` : item.id;
  });
  const message = [
    "Hola, YC1.1. Quiero pedir este combo:",
    "",
    `*${combo.name}*`,
    ...items.map(item => `- ${item}`),
    "",
    `*Precio: ${money(combo.price)}*`,
    "",
    "¿Me confirman disponibilidad?"
  ].join("\n");
  return makeWhatsAppLink(message);
}

function perfumeNotes(perfume) {
  return [...(perfume.notes?.top || []), ...(perfume.notes?.heart || [])].slice(0, 4).join(" · ");
}

export function renderPerfumeCard(perfume, { compact = false } = {}) {
  const sizes = perfume.sizes || [];
  const firstSize = sizes[0] || { ml: 0, price: perfume.prices?.final || 0 };
  const image = perfume.images?.main;
  const tint = /^#[\da-f]{6}$/i.test(perfume.ui?.tint || "") ? perfume.ui.tint : "#d6d4c8";
  const badge = perfume.labels?.tag || "";
  return `<article class="product-card${compact ? " home-product" : ""}" data-id="${escapeHtml(perfume.id)}">
    <div class="product-visual" style="--card-tint:${tint}">
      <img class="product-image" src="${escapeHtml(image)}" alt="Ilustración de ${escapeHtml(perfume.brand)} ${escapeHtml(perfume.name)}" loading="lazy" />
      ${badge ? `<span class="product-tag">${escapeHtml(badge)}</span>` : ""}
      <span class="product-number">YC / ${escapeHtml(perfume.sku || perfume.id)}</span>
    </div>
    <div class="product-info">
      <div class="product-kicker">${escapeHtml(perfume.brand)}</div>
      <h3 class="product-name">${escapeHtml(perfume.name)}</h3>
      <p class="product-notes">${escapeHtml(perfumeNotes(perfume) || perfume.description || "Composición YC1.1")}</p>
      <div class="product-buy">
        <span class="product-price">${money(salePrice(firstSize.price, perfume))}</span>
        <div class="size-list" aria-label="Presentaciones disponibles">
          ${sizes.map((size, index) => `<button class="size-option${index === 0 ? " active" : ""}" type="button" data-ml="${Number(size.ml)}" data-price="${Number(size.price)}" aria-pressed="${index === 0}">${Number(size.ml)} ml</button>`).join("")}
        </div>
        <button type="button" class="product-add-cart" aria-label="Agregar ${escapeHtml(perfume.name)} al carrito">
          <img src="assets/svgs/cart.svg" alt="" class="icon" width="15" height="15" />
          <span>AGREGAR</span>
        </button>
      </div>
    </div>
  </article>`;
}

function selectedSizeFromCard(card) {
  const option = card.querySelector(".size-option.active");
  if (!option) return null;
  return { ml: Number(option.dataset.ml), price: Number(option.dataset.price) };
}

export function addPerfumeToCart(perfume, size) {
  if (!perfume || !size) return;
  const image = perfume.images?.main;
  document.dispatchEvent(new CustomEvent("add-to-cart", {
    detail: {
      id: perfume.id,
      name: `${perfume.brand} ${perfume.name}`,
      brand: perfume.brand,
      size: `${size.ml} ml`,
      price: salePrice(size.price, perfume),
      image,
      quantity: 1
    }
  }));
}

export function bindCardInteractions(container, perfumes) {
  container.addEventListener("click", event => {
    const addButton = event.target.closest(".product-add-cart");
    if (addButton) {
      const card = addButton.closest(".product-card");
      const perfume = perfumes.find(item => item.id === card?.dataset.id);
      addPerfumeToCart(perfume, selectedSizeFromCard(card));
      return;
    }

    const option = event.target.closest(".size-option");
    if (!option) return;
    const card = option.closest(".product-card");
    const perfume = perfumes.find(item => item.id === card.dataset.id);
    const size = { ml: Number(option.dataset.ml), price: Number(option.dataset.price) };
    card.querySelectorAll(".size-option").forEach(button => {
      const selected = button === option;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    card.querySelector(".product-price").textContent = money(salePrice(size.price, perfume));
  });
}

export function bindMobileMenu() {
  const menu = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".desktop-nav");
  if (!menu || !nav) return;

  const menuIcon = menu.querySelector(".menu-icon");
  const backdrop = document.querySelector(".menu-backdrop");
  const header = menu.closest(".site-header");
  const setOpen = (open, moveFocus = false) => {
    nav.classList.toggle("open", open);
    header?.classList.toggle("menu-open", open);
    backdrop?.classList.toggle("is-visible", open);
    backdrop?.setAttribute("aria-hidden", String(!open));
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    if (menuIcon) menuIcon.src = `assets/svgs/${open ? "close" : "menu"}.svg`;
    if (moveFocus) (open ? nav.querySelector("a") : menu)?.focus();
  };

  menu.addEventListener("click", () => setOpen(!nav.classList.contains("open"), true));
  backdrop?.addEventListener("click", () => setOpen(false, true));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav.classList.contains("open")) setOpen(false, true);
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
}
