/* ============================================
   MAIN LINE BOUNCE - SYSTÈME COMPLET
   ============================================ */

const CART_KEY = 'mlb_cart';
const MAX_QTY = 100; // Quantité maximum par article

/* ============================================
   PANIER - Lecture / écriture localStorage
   ============================================ */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

/* ---- Ajouter un produit ---- */
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: 1
    });
  }
  saveCart(cart);
}

/* ---- Modifier la quantité (boutons + / −) ---- */
function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  if (item.qty > MAX_QTY) item.qty = MAX_QTY;
  saveCart(cart);
  renderCartPage();
}

/* ---- 🔑 NOUVEAU : Définir la quantité directement (saisie clavier) ---- */
function setQty(id, value) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;

  let qty = parseInt(value, 10);

  // Si vide ou invalide → on remet à 1
  if (isNaN(qty) || qty < 1) qty = 1;
  if (qty > MAX_QTY) qty = MAX_QTY;

  item.qty = qty;
  saveCart(cart);
  renderCartPage();
}

/* ---- Supprimer un produit ---- */
function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  renderCartPage();
}

/* ---- Vider le panier ---- */
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
  renderCartPage();
}

/* ---- Compteur total d'articles ---- */
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/* ---- Mettre à jour le badge dans le header ---- */
function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ---- Feedback visuel "Ajouté ✓" ---- */
function showAddedFeedback(btn) {
  const original = btn.textContent;
  btn.textContent = 'Added to cart ✓';
  btn.disabled = true;
  setTimeout(function () {
    btn.textContent = original;
    btn.disabled = false;
  }, 1500);
}

/* ---- Gestion des boutons "Add to cart" ---- */
function initAddButtons() {
  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      addToCart({
        id:    btn.dataset.id,
        name:  btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        image: btn.dataset.image
      });
      showAddedFeedback(btn);
    });
  });
}

/* ---- Rendu de la page panier ---- */
function renderCartPage() {
  const list = document.querySelector('.cart-list');
  if (!list) return;

  const empty   = document.querySelector('.cart-empty');
  const summary = document.querySelector('.cart-summary');
  const cart    = getCart();

  if (cart.length === 0) {
    list.innerHTML = '';
    if (empty)   empty.style.display = 'block';
    if (summary) summary.style.display = 'none';
    return;
  }

  if (empty)   empty.style.display = 'none';
  if (summary) summary.style.display = 'block';

  list.innerHTML = cart.map(function (item) {
    const lineTotal = (item.price * item.qty).toFixed(0);
    return `
      <div class="cart-item product-card">
        <div class="product-image cart-item-img">
          <img src="${item.image}" alt="${item.name}" />
        </div>
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <span class="price-tag">$${item.price}</span>
          <div class="cart-qty">
            <button class="btn btn-outline btn-sm" onclick="changeQty('${item.id}', -1)">−</button>
            <input
              type="number"
              class="cart-qty-input"
              value="${item.qty}"
              min="1"
              max="${MAX_QTY}"
              onchange="setQty('${item.id}', this.value)"
              onclick="this.select()"
            />
            <button class="btn btn-outline btn-sm" onclick="changeQty('${item.id}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-right">
          <span class="cart-line-total">$${lineTotal}</span>
          <button class="cart-remove" onclick="removeFromCart('${item.id}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalEl = document.querySelector('.cart-total-amount');
  if (totalEl) totalEl.textContent = '$' + total.toFixed(0);
}

/* ============================================
   COMPTE À REBOURS PROMO
   ============================================ */
function initCountdown() {
  const el = document.querySelector('[data-countdown]');
  if (!el) return;

  const end = new Date(el.getAttribute('data-countdown')).getTime();
  const d = el.querySelector('[data-days]');
  const h = el.querySelector('[data-hours]');
  const m = el.querySelector('[data-mins]');
  const s = el.querySelector('[data-secs]');

  function tick() {
    let diff = end - Date.now();
    if (diff < 0) diff = 0;
    if (d) d.textContent = Math.floor(diff / 86400000);
    if (h) h.textContent = Math.floor((diff % 86400000) / 3600000);
    if (m) m.textContent = Math.floor((diff % 3600000) / 60000);
    if (s) s.textContent = Math.floor((diff % 60000) / 1000);
  }

  tick();
  setInterval(tick, 1000);
}

/* ============================================
   FAQ ACCORDÉON
   ============================================ */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const toggleIcon = item.querySelector('.faq-toggle-icon');

    if (!question) return;

    question.addEventListener('click', function() {
      const isOpen = item.classList.contains('active');

      faqItems.forEach(other => {
        other.classList.remove('active');
        const icon = other.querySelector('.faq-toggle-icon');
        if (icon) icon.textContent = '+';
      });

      if (!isOpen) {
        item.classList.add('active');
        toggleIcon.textContent = '−';
      }
    });
  });
}

/* ===== HAMBURGER MENU ===== */
function initHamburger() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.main-nav');
  const overlay = document.querySelector('.nav-overlay');

  if (!hamburger || !nav) {
    console.error('❌ Hamburger ou nav not found');
    return;
  }

  hamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', hamburger.classList.contains('active'));
  });

  if (overlay) {
    overlay.addEventListener('click', function() {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
      overlay.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  }

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function() {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---- Initialisation UNIQUE ---- */
document.addEventListener('DOMContentLoaded', function () {
  updateCartBadge();
  initAddButtons();
  renderCartPage();
  initFAQ();
  initHamburger();
  initCountdown();
});
