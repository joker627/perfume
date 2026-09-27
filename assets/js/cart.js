import { makeWhatsAppLink } from "./shared.js";

function initCart() {
  const cartToggle = document.getElementById("cart-toggle");
  const cartClose = document.getElementById("cart-close");
  const cartPanel = document.getElementById("cart-panel");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartBadge = document.getElementById("cart-badge");
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotalPrice = document.getElementById("cart-total-price");
  const checkoutButton = document.getElementById("checkout-button");
  const clearCartButton = document.getElementById("clear-cart");

  let cart = JSON.parse(localStorage.getItem("yc1_cart")) || [];

  function openCart() {
    cartPanel.classList.add("open");
    cartOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    renderCart();
  }

  function closeCart() {
    cartPanel.classList.remove("open");
    cartOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function formatPrice(price) {
    return "$" + price.toLocaleString("es-CO");
  }

  function saveCart() {
    localStorage.setItem("yc1_cart", JSON.stringify(cart));
    updateBadge();
  }

  function updateBadge() {
    if (cartBadge) {
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartBadge.textContent = totalItems;
      cartBadge.style.display = totalItems > 0 ? "inline-flex" : "none";
    }
  }

  function renderCart() {
    if (!cartItemsContainer) return;
    if (clearCartButton) clearCartButton.disabled = cart.length === 0;
    if (checkoutButton) checkoutButton.disabled = cart.length === 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<div class=\"cart-empty-message\">Tu carrito está vacío</div>";
      if (cartTotalPrice) cartTotalPrice.textContent = "$0";
      return;
    }

    let html = "";
    let total = 0;

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      html += `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
          <div class="cart-item-info">
            <h4 class="cart-item-name">${item.name}</h4>
            <span class="cart-item-meta">${item.size} | ${item.brand || "YC1.1"}</span>
            <div class="cart-item-price">${formatPrice(item.price)}</div>
            <div class="cart-item-qty">
              <button class="qty-btn" data-action="decrease" data-index="${index}">-</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" data-action="increase" data-index="${index}">+</button>
            </div>
          </div>
          <button class="cart-item-remove" data-index="${index}" aria-label="Eliminar producto">✕</button>
        </div>
      `;
    });

    cartItemsContainer.innerHTML = html;
    if (cartTotalPrice) {
      cartTotalPrice.textContent = formatPrice(total);
    }

    cartItemsContainer.querySelectorAll(".qty-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const index = parseInt(e.target.dataset.index, 10);
        if (e.target.dataset.action === "increase") {
          cart[index].quantity++;
        } else if (e.target.dataset.action === "decrease") {
          if (cart[index].quantity > 1) {
            cart[index].quantity--;
          } else {
            cart.splice(index, 1);
          }
        }
        saveCart();
        renderCart();
      });
    });

    cartItemsContainer.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", e => {
        const index = parseInt(e.target.dataset.index, 10);
        cart.splice(index, 1);
        saveCart();
        renderCart();
      });
    });
  }

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);
  if (clearCartButton) {
    clearCartButton.addEventListener("click", () => {
      if (!cart.length) return;
      cart = [];
      saveCart();
      renderCart();
    });
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
      if (cart.length === 0) return;

      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const message = [
        "Hola, YC1.1. Quiero realizar este pedido:",
        "",
        "*MI PEDIDO*",
        ...cart.map(item => `${item.quantity} x ${item.name} (${item.size})\nSubtotal: ${formatPrice(item.price * item.quantity)}`),
        "",
        `*TOTAL: ${formatPrice(total)}*`,
        "",
        "¿Me confirman disponibilidad y medios de pago?"
      ].join("\n");

      window.open(makeWhatsAppLink(message), "_blank");
    });
  }

  document.addEventListener("add-to-cart", e => {
    const product = e.detail;
    const existingIndex = cart.findIndex(item => item.id === product.id && item.size === product.size);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += product.quantity || 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        size: product.size,
        price: product.price,
        image: product.image,
        quantity: product.quantity || 1
      });
    }

    saveCart();
    openCart();
  });

  updateBadge();
  renderCart();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCart);
} else {
  initCart();
}
