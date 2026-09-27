import {
  bindCardInteractions,
  bindMobileMenu,
  escapeHtml,
  loadCatalog,
  renderPerfumeCard,
  salePrice
} from "./shared.js";

const grid = document.querySelector("#catalog-grid");
const empty = document.querySelector("#catalog-empty");
const resultsLabel = document.querySelector("#results-label");
const activeFilters = document.querySelector("#active-filters");
const filterToggle = document.querySelector("#catalog-filter-toggle");
const filterPanel = document.querySelector("#catalog-filter-panel");
const pagination = document.querySelector("#catalog-pagination");
const fields = {
  gender: document.querySelector("#gender-filter"),
  family: document.querySelector("#family-filter"),
  occasion: document.querySelector("#occasion-filter"),
  season: document.querySelector("#season-filter"),
  brand: document.querySelector("#brand-filter")
};
const fieldLabels = {
  gender: "Género",
  family: "Familia",
  occasion: "Ocasión",
  season: "Temporada",
  brand: "Marca"
};
const fieldDefaults = {
  gender: "Todos",
  family: "Todas",
  occasion: "Cualquiera",
  season: "Cualquiera",
  brand: "Todas"
};
const search = document.querySelector("#catalog-search");
const sort = document.querySelector("#sort-filter");
let perfumes = [];
let catalogData = {};
let pageSize = 20;
let currentPage = 1;

function labelFor(field, value) {
  if (field === "gender") return ({ el: "Él", ella: "Ella", unisex: "Unisex" })[value] || value;
  return value ? value.charAt(0).toLocaleUpperCase("es-CO") + value.slice(1) : value;
}

function selectedValues(group) {
  return [...group.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
}

function fillFilterGroup(key, values) {
  fields[key].innerHTML = values.map((value, index) => {
    const id = `${key}-option-${index}`;
    return `<label class="filter-option" for="${id}"><input id="${id}" type="checkbox" value="${escapeHtml(value)}"><span>${escapeHtml(labelFor(key, value))}</span></label>`;
  }).join("");
}

function uniqueOptions(configured = [], observed = []) {
  return [...new Set([...configured, ...observed].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es-CO"));
}

function prepareFilters() {
  const config = catalogData.filters || {};
  fillFilterGroup("gender", uniqueOptions(config.genders, perfumes.map(item => item.gender)));
  fillFilterGroup("family", uniqueOptions(config.families, perfumes.map(item => item.family)));
  fillFilterGroup("occasion", uniqueOptions(config.occasions, perfumes.flatMap(item => item.occasions || [])));
  fillFilterGroup("season", uniqueOptions(config.seasons, perfumes.flatMap(item => item.seasons || [])));
  fillFilterGroup("brand", uniqueOptions([], perfumes.map(item => item.brand)));
}

function getVisiblePerfumes() {
  const term = search.value.trim().toLocaleLowerCase("es-CO");
  const selected = Object.fromEntries(Object.entries(fields).map(([key, group]) => [key, selectedValues(group)]));
  const visible = perfumes.filter(perfume => {
    const matchesFilters = Object.entries(selected).every(([key, values]) => {
      if (!values.length) return true;
      return values.some(value => {
        if (key === "occasion") return (perfume.occasions || []).includes(value);
        if (key === "season") return (perfume.seasons || []).includes(value);
        return perfume[key] === value;
      });
    });
    const searchable = [
      perfume.name, perfume.brand, perfume.description, perfume.family,
      perfume.subfamily, perfume.labels?.short,
      ...(perfume.notes?.top || []), ...(perfume.notes?.heart || []), ...(perfume.notes?.base || []),
      ...(perfume.occasions || []), ...(perfume.seasons || [])
    ].join(" ").toLocaleLowerCase("es-CO");
    return matchesFilters && searchable.includes(term);
  });

  const priceOf = perfume => {
    const sizes = perfume.sizes || [];
    if (!sizes.length) return salePrice(perfume.prices?.final, perfume);
    return Math.min(...sizes.map(size => salePrice(size.price, perfume)));
  };
  const sortValue = sort.value;
  if (sortValue === "price-asc") visible.sort((a, b) => priceOf(a) - priceOf(b));
  if (sortValue === "price-desc") visible.sort((a, b) => priceOf(b) - priceOf(a));
  if (sortValue === "name") visible.sort((a, b) => a.name.localeCompare(b.name, "es-CO"));
  if (sortValue === "featured") visible.sort((a, b) => Number(b.featured) - Number(a.featured));
  return visible;
}

function renderActiveFilters() {
  const chips = [];
  for (const [key, group] of Object.entries(fields)) {
    for (const value of selectedValues(group)) {
      chips.push(`<button type="button" class="active-filter-chip" data-clear="${key}" data-value="${escapeHtml(value)}">${escapeHtml(fieldLabels[key])}: ${escapeHtml(labelFor(key, value))}<span>×</span></button>`);
    }
  }
  if (search.value.trim()) chips.push(`<button type="button" class="active-filter-chip" data-clear="search">${escapeHtml(search.value.trim())}<span>×</span></button>`);
  activeFilters.innerHTML = chips.join("");
  document.querySelector("#active-filter-count").textContent = String(chips.length);
  document.querySelector("#filter-toggle-count").textContent = chips.length ? String(chips.length) : "";
  for (const [key, group] of Object.entries(fields)) {
    const values = selectedValues(group);
    const summary = document.querySelector(`#${key}-filter-summary`);
    summary.textContent = values.length === 0
      ? fieldDefaults[key]
      : values.length === 1
        ? labelFor(key, values[0])
        : `${values.length} elegidos`;
  }
}

function renderPagination(pageCount) {
  pagination.hidden = pageCount <= 1;
  if (pagination.hidden) {
    pagination.innerHTML = "";
    return;
  }

  const visiblePages = [...new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1])]
    .filter(page => page > 0 && page <= pageCount)
    .sort((a, b) => a - b);
  const pageButtons = [];
  visiblePages.forEach((page, index) => {
    if (index > 0 && page - visiblePages[index - 1] > 1) {
      pageButtons.push('<span class="pagination-ellipsis" aria-hidden="true">…</span>');
    }
    pageButtons.push(`<button class="pagination-page${page === currentPage ? " is-current" : ""}" type="button" data-page="${page}"${page === currentPage ? ' aria-current="page"' : ""} aria-label="Página ${page}">${page}</button>`);
  });

  pagination.innerHTML = [
    `<button class="pagination-step" type="button" data-page="${currentPage - 1}" aria-label="Página anterior"${currentPage === 1 ? " disabled" : ""}>Anterior</button>`,
    ...pageButtons,
    `<button class="pagination-step" type="button" data-page="${currentPage + 1}" aria-label="Página siguiente"${currentPage === pageCount ? " disabled" : ""}>Siguiente</button>`
  ].join("");
}

function render() {
  const visible = getVisiblePerfumes();
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  currentPage = Math.max(1, Math.min(currentPage, pageCount));
  const start = (currentPage - 1) * pageSize;
  grid.innerHTML = visible.slice(start, start + pageSize).map(perfume => renderPerfumeCard(perfume)).join("");
  empty.hidden = visible.length > 0;
  resultsLabel.textContent = `${visible.length} ${visible.length === 1 ? "fragancia" : "fragancias"}`;
  renderActiveFilters();
  renderPagination(pageCount);
}

const resetToFirstPage = () => {
  currentPage = 1;
  render();
};

const pickerAnimations = new WeakMap();

function setPickerOpen(picker, shouldOpen, animate = true) {
  const options = picker.querySelector(".filter-picker-options");
  const wasClosing = picker.classList.contains("is-closing");
  const currentStyles = picker.open && options ? getComputedStyle(options) : null;
  pickerAnimations.get(picker)?.cancel();
  pickerAnimations.delete(picker);

  if (shouldOpen) {
    if (picker.open && !wasClosing) return;
    filterPanel.querySelectorAll(".filter-picker[open]").forEach(other => {
      if (other !== picker) setPickerOpen(other, false, false);
    });
    picker.open = true;
    picker.classList.remove("is-closing");
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !options.animate) return;

    const from = wasClosing && currentStyles
      ? { opacity: currentStyles.opacity, transform: currentStyles.transform }
      : { opacity: 0, transform: "translateY(-7px) scale(.98)" };
    const animation = options.animate(
      [from, { opacity: 1, transform: "translateY(0) scale(1)" }],
      { duration: 180, easing: "cubic-bezier(.2, .75, .25, 1)" }
    );
    pickerAnimations.set(picker, animation);
    animation.onfinish = () => {
      if (pickerAnimations.get(picker) === animation) pickerAnimations.delete(picker);
    };
    animation.oncancel = () => {
      if (pickerAnimations.get(picker) === animation) pickerAnimations.delete(picker);
    };
    return;
  }

  if (!picker.open) return;
  if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !options.animate) {
    picker.open = false;
    picker.classList.remove("is-closing");
    return;
  }

  picker.classList.add("is-closing");
  const animation = options.animate(
    [
      { opacity: currentStyles?.opacity || 1, transform: currentStyles?.transform || "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(-7px) scale(.98)" }
    ],
    { duration: 150, easing: "ease-in" }
  );
  pickerAnimations.set(picker, animation);
  animation.onfinish = () => {
    if (pickerAnimations.get(picker) !== animation) return;
    picker.open = false;
    picker.classList.remove("is-closing");
    pickerAnimations.delete(picker);
  };
  animation.oncancel = () => {
    if (pickerAnimations.get(picker) === animation) pickerAnimations.delete(picker);
  };
}

filterPanel.querySelectorAll(".filter-picker").forEach(picker => {
  picker.querySelector("summary").addEventListener("click", event => {
    event.preventDefault();
    setPickerOpen(picker, !picker.open || picker.classList.contains("is-closing"));
  });
});

document.addEventListener("pointerdown", event => {
  filterPanel.querySelectorAll(".filter-picker[open]").forEach(picker => {
    if (!picker.contains(event.target)) setPickerOpen(picker, false);
  });
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  const picker = filterPanel.querySelector(".filter-picker[open]");
  if (!picker) return;
  setPickerOpen(picker, false, false);
  picker.querySelector("summary").focus();
});

Object.values(fields).forEach(group => group.addEventListener("change", resetToFirstPage));
filterToggle.addEventListener("click", () => {
  const open = filterToggle.getAttribute("aria-expanded") !== "true";
  filterToggle.setAttribute("aria-expanded", String(open));
  filterPanel.classList.toggle("is-open", open);
  filterPanel.inert = !open;
  if (!open) {
    filterPanel.querySelectorAll(".filter-picker[open]").forEach(picker => {
      setPickerOpen(picker, false, false);
    });
  }
});
search.addEventListener("input", resetToFirstPage);
sort.addEventListener("change", resetToFirstPage);
pagination.addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled) return;
  currentPage = Number(button.dataset.page);
  render();
  resultsLabel.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelector("#clear-filters").addEventListener("click", () => {
  Object.values(fields).forEach(group => {
    group.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  });
  search.value = "";
  sort.value = "featured";
  resetToFirstPage();
});
activeFilters.addEventListener("click", event => {
  const chip = event.target.closest("[data-clear]");
  if (!chip) return;
  if (chip.dataset.clear === "search") search.value = "";
  else {
    const input = [...fields[chip.dataset.clear].querySelectorAll('input[type="checkbox"]')]
      .find(option => option.value === chip.dataset.value);
    if (input) input.checked = false;
  }
  resetToFirstPage();
});
bindMobileMenu();

loadCatalog()
  .then(data => {
    catalogData = data;
    perfumes = data.perfumes;
    const configuredPageSize = Number(data.pagination?.pageSize);
    pageSize = Number.isInteger(configuredPageSize) && configuredPageSize > 0 ? configuredPageSize : 20;
    prepareFilters();
    document.querySelector("#catalog-total").textContent = `${perfumes.length} FRAGANCIAS`;
    bindCardInteractions(grid, perfumes);
    render();
  })
  .catch(error => {
    console.error("No se pudo cargar el catálogo:", error);
    resultsLabel.textContent = "Catálogo no disponible";
    empty.hidden = false;
    empty.textContent = "No se pudo cargar el catálogo. Actualiza la página para volver a intentarlo.";
  });
