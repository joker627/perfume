import { escapeHtml, money, salePrice } from "./shared.js";

const heroDetail = document.querySelector("#hero-detail");
const heroImageLayers = [document.querySelector("#hero-art"), document.querySelector("#hero-art-alt")];
const GENDER_LABELS = { el: "Masculino", ella: "Femenino", unisex: "Unisex" };
const NOTE_LABELS = { top: "Salida", heart: "Corazón", base: "Fondo" };
let activeHeroLayer = 0;
let heroImageRequest = 0;
export function normalizeImagePath(path) {
  if (!path) return "";
  return String(path).replace(/^\//, "");
}

function heroSpotlightIndex(perfume, perfumes, heroConfig) {
  const ids = heroConfig?.spotlights?.length
    ? heroConfig.spotlights
    : perfumes.filter(item => item.featured).map(item => item.id);
  const index = ids.indexOf(perfume?.id);
  const position = index >= 0 ? index + 1 : 1;
  const total = ids.length || perfumes.length;
  return { position, total, ids };
}

function renderNoteRows(notes) {
  return Object.entries(NOTE_LABELS)
    .map(([key, label]) => {
      const items = notes?.[key] || [];
      if (!items.length) return "";
      return `<div class="hero-detail-notes-row">
        <span>${label}</span>
        <p>${escapeHtml(items.join(" · "))}</p>
      </div>`;
    })
    .join("");
}

export function renderHeroDetail(perfume, perfumes, heroConfig) {
  if (!heroDetail || !perfume) return;

  const { position, total } = heroSpotlightIndex(perfume, perfumes, heroConfig);
  const firstSize = perfume.sizes?.[0];
  const price = firstSize ? salePrice(firstSize.price, perfume) : perfume.prices?.final;
  const tag = perfume.labels?.tag || perfume.badges?.[0] || "";
  const wearLine = perfume.detail?.wear_line ||
    [perfume.occasions?.slice(0, 2).join(", "), perfume.performance?.projection]
      .filter(Boolean)
      .join(" · ");

  heroDetail.innerHTML = `
    <div class="hero-detail-grid">
      <div class="hero-detail-intro">
        <div class="hero-detail-head">
          <span class="hero-detail-index">${String(position).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
          ${tag ? `<span class="hero-detail-badge">${escapeHtml(tag)}</span>` : ""}
        </div>
        <p class="hero-detail-kicker">
          ${escapeHtml(perfume.brand)} · ${escapeHtml(GENDER_LABELS[perfume.gender] || perfume.gender || "")}
        </p>
        <h2 class="hero-detail-title">${escapeHtml(perfume.name)}</h2>
        <p class="hero-detail-label">${escapeHtml(perfume.labels?.short || perfume.family || "")}</p>
        <p class="hero-detail-desc">${escapeHtml(perfume.description || "")}</p>
        <div class="hero-detail-notes">${renderNoteRows(perfume.notes)}</div>
      </div>
      <div class="hero-detail-side">
        <div class="hero-detail-meta">
          <div class="hero-detail-stat">
            <span>Duración</span>
            <strong>${perfume.performance?.longevity_hours ? `${perfume.performance.longevity_hours} h` : "—"}</strong>
          </div>
          <div class="hero-detail-stat">
            <span>Estela</span>
            <strong>${escapeHtml(perfume.performance?.sillage || "—")}</strong>
          </div>
          <div class="hero-detail-stat">
            <span>Proyección</span>
            <strong>${escapeHtml(perfume.performance?.projection || "—")}</strong>
          </div>
          <div class="hero-detail-stat">
            <span>Desde</span>
            <strong>${price ? money(price) : "—"}</strong>
          </div>
        </div>
        <p class="hero-detail-wear">${escapeHtml(wearLine || "")}</p>
        <div class="hero-detail-sizes">
          ${(perfume.sizes || []).slice(0, 3).map(size => {
            const amount = salePrice(size.price, perfume);
            return `<span>${Number(size.ml)} ml · ${money(amount)}</span>`;
          }).join("")}
        </div>
      </div>
    </div>`;
}

export function crossfadeHeroImage(source, alt) {
  const active = heroImageLayers[activeHeroLayer];
  const normalized = normalizeImagePath(source);
  if (!active || !normalized) return;
  if (active.src && new URL(normalized, document.baseURI).href === active.src) return;

  const nextIndex = 1 - activeHeroLayer;
  const next = heroImageLayers[nextIndex];
  const requestId = ++heroImageRequest;
  const reveal = () => {
    if (requestId !== heroImageRequest) return;
    next.alt = alt;
    next.setAttribute("aria-hidden", "false");
    next.classList.add("active");
    active.classList.remove("active");
    active.alt = "";
    active.setAttribute("aria-hidden", "true");
    activeHeroLayer = nextIndex;
  };

  next.onload = reveal;
  next.onerror = () => { next.onload = null; };
  next.src = normalized;
  if (next.complete && next.naturalWidth) reveal();
}
