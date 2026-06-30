// ========================================
// CONFIGURATION
// ========================================

// 🔑 Ta clé PUBLIQUE Stripe
const STRIPE_PUBLIC_KEY = "pk_live_51TijhzFJaoRvZGr1l39HwB6tqpIhl0ppbIxsQ9fpxW2BR4Xo9lepgPxcrEpxN0txZi64iKVNZaPhA2ujro9BEpIw00sl5Ojy7i";

// 📊 Google Ads
const GOOGLE_ADS_ID = "AW-18226675274";
const CONVERSION_LABEL = "yt2_CK2Y18IcEMr8k_ND";

// Initialise Stripe
let stripe = null;
if (typeof Stripe !== "undefined") {
  stripe = Stripe(STRIPE_PUBLIC_KEY);
} else {
  console.error("⚠️ Stripe.js non chargé !");
}

// ========================================
// FALLBACK POPUP (si showModal pas encore défini)
// ========================================
function safeModal(message, title, icon) {
  if (typeof showModal === "function") {
    showModal(message, title, icon);
  } else {
    alert(message);
  }
}

// ========================================
// PANIER
// ========================================
let cart = JSON.parse(localStorage.getItem("mlb_cart")) || [];

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Checkout page loaded");
  console.log("🛒 Cart from localStorage:", cart);

  loadCart();
  setupFormSubmit();
});

// ========================================
// AFFICHAGE PANIER
// ========================================
function loadCart() {
  const summaryItems = document.getElementById("summaryItems");
  const summaryTotal = document.getElementById("summaryTotal");

  if (!cart || cart.length === 0) {
    summaryItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    summaryTotal.textContent = "$0";
    return;
  }

  let html = "";
  let total = 0;

  cart.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.qty) || 1;
    const itemTotal = price * quantity;
    total += itemTotal;

    html += `
      <div class="summary-item">
        <span class="name">${item.name} x${quantity}</span>
        <span>$${itemTotal.toFixed(2)}</span>
      </div>
    `;
  });

  summaryItems.innerHTML = html;
  summaryTotal.textContent = "$" + total.toFixed(2);
}

// ========================================
// CALCUL DU TOTAL
// ========================================
function calculateTotal() {
  let total = 0;
  cart.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.qty) || 1;
    total += price * quantity;
  });
  return total.toFixed(2);
}

// ========================================
// RÉCUPÈRE LES DONNÉES DU FORMULAIRE
// ========================================
function getFormData() {
  return {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    address: document.getElementById("address").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    date: document.getElementById("date").value,
    location: document.getElementById("where").value,
    guests: document.getElementById("guests").value,
    comments: document.getElementById("comments").value.trim(),
  };
}

// ========================================
// VALIDATION DU FORMULAIRE
// ========================================
function validateForm(formData) {
  if (!formData.name) {
    safeModal("Please enter your name.", "Missing information", "📝");
    return false;
  }
  if (!formData.email) {
    safeModal("Please enter your email.", "Missing information", "📝");
    return false;
  }
  if (!formData.address) {
    safeModal("Please enter your address.", "Missing information", "📝");
    return false;
  }
  if (!formData.guests) {
    safeModal("Please enter number of guests.", "Missing information", "📝");
    return false;
  }
  return true;
}

// ========================================
// SETUP DU FORMULAIRE
// ========================================
function setupFormSubmit() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    console.error("❌ Form not found!");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!cart || cart.length === 0) {
      safeModal("Your cart is empty!", "Empty cart", "🛒");
      return;
    }

    const formData = getFormData();

    if (!validateForm(formData)) {
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      await handleStripePayment(formData);
    } catch (error) {
      console.error("❌ Error:", error);
      safeModal("An error occurred: " + error.message, "Payment error", "❌");
      btn.disabled = false;
      btn.textContent = "Pay with Card";
    }
  });
}

// ========================================
// PAIEMENT AVEC STRIPE
// ========================================
async function handleStripePayment(formData) {
  console.log("💳 Creating Stripe checkout session...");

  const total = calculateTotal();

  setUserData(formData);

  localStorage.setItem("mlb_pending_booking", JSON.stringify({
    ...formData,
    cart: cart,
    total: total,
  }));

  const response = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: cart,
      customer: formData,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create checkout session");
  }

  const data = await response.json();
  console.log("✅ Session created:", data.id);

  const result = await stripe.redirectToCheckout({ sessionId: data.id });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// ========================================
// GOOGLE ADS — ENHANCED CONVERSIONS
// ========================================
function setUserData(formData) {
  if (typeof gtag === "undefined") {
    console.warn("⚠️ gtag non chargé, user_data non envoyé");
    return;
  }

  const nameParts = (formData.name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  gtag('set', 'user_data', {
    "email": formData.email || "",
    "phone_number": formData.phone || "",
    "address": {
      "first_name": firstName,
      "last_name": lastName,
      "street": formData.address || "",
      "country": "US"
    }
  });

  console.log("📊 user_data envoyé à Google (Enhanced Conversions)");
}
