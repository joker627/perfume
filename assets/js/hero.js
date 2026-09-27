import {
  escapeHtml,
  makeComboOrderLink,
  money,
  salePrice
} from "./shared.js";
import {
  crossfadeHeroImage,
  normalizeImagePath,
  renderHeroDetail
} from "./hero-detail.js";

const slider = document.querySelector("#combo-slider");
let heroCombos = [];
let catalogPerfumes = [];
let heroConfig = {};
function renderCombo(index, productIndex = 0) {
  const combo = heroCombos[index];
  const products = catalogPerfumes;
  const listedProducts = combo.products.map(item => ({
    item,
    perfume: products.find(perfume => perfume.id === item.id)
  })).filter(entry => entry.perfume);
  const activeProduct = listedProducts[productIndex] || listedProducts[0];
  const regularTotal = listedProducts.reduce((total, { item, perfume }) => {
    const size = perfume.sizes.find(option => Number(option.ml) === Number(item.ml));
    return total + (size ? salePrice(size.price, perfume) : 0);
  }, 0);
  const color = /^#[\da-f]{6}$/i.test(combo.color || "") ? combo.color : "#a8c4d8";

  slider.style.setProperty("--combo-color", color);
  slider.querySelector("#combo-step").textContent = `${String(index + 1).padStart(2, "0")} / ${String(heroCombos.length).padStart(2, "0")}`;
  slider.querySelector("#combo-tag").textContent = combo.tag || "PRECIO ESPECIAL";
  slider.querySelector("#combo-name").textContent = combo.name;
  slider.querySelector("#combo-products").textContent = listedProducts.map(({ item, perfume }) => `${perfume.name} ${item.ml} ml`).join(" + ");
  slider.querySelector("#combo-price").textContent = money(combo.price);
  slider.querySelector("#combo-was-price").textContent = regularTotal > combo.price ? money(regularTotal) : "";
  slider.querySelector("#combo-was-price").hidden = regularTotal <= combo.price;
  const savings = regularTotal - Number(combo.price);
  slider.querySelector("#combo-savings").textContent = savings > 0 ? `AHORRA ${money(savings)}` : "";
  slider.querySelector("#combo-savings").hidden = savings <= 0;
  const orderLink = slider.querySelector("#combo-order");
  orderLink.href = makeComboOrderLink(combo, products);
  orderLink.setAttribute("aria-label", `Pedir el combo ${combo.name} por WhatsApp`);
  slider.querySelector("#combo-artwork").innerHTML = listedProducts.map(({ item, perfume }, imageIndex) =>
    `<div class="combo-bottle${imageIndex === productIndex ? " active" : ""}"><img src="${escapeHtml(normalizeImagePath(perfume.images?.main) || "assets/images/products/dior-sauvage.webp")}" alt="" /><span>${Number(item.ml)} ML</span></div>`
  ).join("");

  if (activeProduct?.perfume) {
    heroConfig = { ...heroConfig, spotlights: listedProducts.map(({ perfume }) => perfume.id) };
    renderHeroDetail(activeProduct.perfume, catalogPerfumes, heroConfig);
    if (activeProduct.perfume.images?.main) {
      crossfadeHeroImage(
        activeProduct.perfume.images.main,
        `${activeProduct.perfume.brand} ${activeProduct.perfume.name} — combo ${combo.name}`
      );
    }
  }

  slider.querySelectorAll(".combo-dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
    dot.setAttribute("aria-current", String(dotIndex === index));
  });
}

function setupComboSlider(data) {
  const productIds = new Set(data.perfumes.map(perfume => perfume.id));
  const combos = (data.combos || []).filter(combo =>
    combo.active !== false && Array.isArray(combo.products) &&
    combo.products.length > 0 && combo.products.every(item => productIds.has(item.id))
  );
  if (!combos.length) return;

  heroCombos = combos;
  slider.querySelector("#combo-dots").innerHTML = combos.map((combo, index) =>
    `<button class="combo-dot${index === 0 ? " active" : ""}" type="button" aria-label="Ver combo ${index + 1}: ${escapeHtml(combo.name)}" aria-current="${index === 0}"></button>`
  ).join("");
  slider.hidden = false;

  let current = 0;
  let activeProduct = 0;
  let timer = null;
  let pointerInside = false;
  let focusInside = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const imageDuration = 3600;

  const pause = () => {
    window.clearTimeout(timer);
    timer = null;
  };
  const advance = () => {
    const productCount = heroCombos[current].products.length;
    if (activeProduct + 1 < productCount) {
      activeProduct += 1;
    } else {
      current = (current + 1) % heroCombos.length;
      activeProduct = 0;
    }
    renderCombo(current, activeProduct);
    timer = window.setTimeout(advance, imageDuration);
  };
  const resume = () => {
    if (timer || pointerInside || focusInside || document.hidden || reducedMotion.matches) return;
    timer = window.setTimeout(advance, imageDuration);
  };
  const show = index => {
    pause();
    current = (index + combos.length) % combos.length;
    activeProduct = 0;
    renderCombo(current, activeProduct);
    resume();
  };

  slider.querySelector(".combo-prev").addEventListener("click", () => show(current - 1));
  slider.querySelector(".combo-next").addEventListener("click", () => show(current + 1));

  let dragStart = null;
  slider.addEventListener("pointerdown", event => {
    if (event.target.closest("a, button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pause();
    dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    slider.classList.add("is-dragging");
    slider.setPointerCapture?.(event.pointerId);
    if (event.pointerType === "mouse") event.preventDefault();
  });

  slider.addEventListener("pointerup", event => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    dragStart = null;
    slider.classList.remove("is-dragging");

    if (Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      show(current + (deltaX < 0 ? 1 : -1));
    }
    resume();
  });

  const cancelDrag = () => {
    dragStart = null;
    slider.classList.remove("is-dragging");
    resume();
  };
  slider.addEventListener("pointercancel", cancelDrag);
  slider.addEventListener("lostpointercapture", cancelDrag);

  slider.addEventListener("pointerenter", () => { pointerInside = true; pause(); });
  slider.addEventListener("pointerleave", () => { pointerInside = false; resume(); });
  slider.addEventListener("focusin", () => { focusInside = true; pause(); });
  slider.addEventListener("focusout", event => {
    if (!slider.contains(event.relatedTarget)) { focusInside = false; resume(); }
  });
  document.addEventListener("visibilitychange", () => document.hidden ? pause() : resume());
  reducedMotion.addEventListener?.("change", () => reducedMotion.matches ? pause() : resume());
  slider.querySelector("#combo-dots").addEventListener("click", event => {
    const dot = event.target.closest(".combo-dot");
    if (dot) show([...slider.querySelectorAll(".combo-dot")].indexOf(dot));
  });
  show(0);
}
export function setupHero(data) {
  catalogPerfumes = data.perfumes;
  heroConfig = {};
  setupComboSlider(data);
  return heroCombos.length > 0;
}
