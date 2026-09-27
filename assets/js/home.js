import {
  bindCardInteractions,
  bindMobileMenu,
  loadCatalog,
  makeWhatsAppLink,
  renderPerfumeCard
} from "./shared.js";
import { setupHero } from "./hero.js";

const grid = document.querySelector("#product-grid");

bindMobileMenu();
document.querySelector("#contact-link").href = makeWhatsAppLink([
  "Hola, YC1.1.",
  "",
  "Quisiera asesoría para elegir una fragancia. ¿Me pueden ayudar?"
].join("\n"));

loadCatalog()
  .then(data => {
    const total = data.perfumes.length;
    const selection = ["el", "ella", "unisex"].map(gender =>
      data.perfumes.find(perfume => perfume.gender === gender && perfume.featured) ||
      data.perfumes.find(perfume => perfume.gender === gender)
    ).filter(Boolean);

    grid.innerHTML = selection.map(perfume => renderPerfumeCard(perfume, { compact: true })).join("");
    const homeCount = document.querySelector("#home-count");
    if (homeCount) homeCount.textContent = total;
    bindCardInteractions(grid, selection);

    if (!setupHero(data)) document.querySelector(".hero").hidden = true;
  })
  .catch(error => {
    console.error("No se pudo cargar el catálogo:", error);
    grid.innerHTML = "<p class=\"empty-state\">No se pudo cargar la selección. Actualiza la página para volver a intentarlo.</p>";
  });
