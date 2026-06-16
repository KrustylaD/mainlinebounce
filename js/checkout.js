// ========================================
// CONFIGURATION
// ========================================

// 🔑 Ta clé PUBLIQUE Stripe (commence par pk_test_ ou pk_live_)
// ⚠️ C'est la clé publique, elle peut être visible côté client
const STRIPE_PUBLIC_KEY = "pk_test_REMPLACE_PAR_TA_CLE_PUBLIQUE";

// Discord Webhook (utilisé seulement pour "Pay on Site")
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Initialise Stripe
let stripe = null;
if (typeof Stripe !== "undefined") {
  stripe = Stripe(STRIPE_PUBLIC_KEY);
} else {
  console.error("⚠️ Stripe.js non chargé !");
}

// ========================================
// PANIER
// ========================================
let cart = JSON.parse(localStorage.getItem("mlb_cart")) || [];

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Page chargée");
  console.log("🛒 Panier:", cart);
  loadCart();
  setupPaymentToggle();
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
    const quantity = parseInt(item.quantity) || 1;
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
    const quantity = parseInt(item.quantity) || 1;
    total += price * quantity;
  });
  return total.toFixed(2);
}

// ========================================
// TOGGLE VISUEL DU CHOIX DE PAIEMENT
// ========================================
function setupPaymentToggle() {
  const optionCard = document.getElementById("optionCard");
  const optionSite = document.getElementById("optionSite");
  const radios = document.querySelectorAll('input[name="paymentMethod"]');

  radios.forEach((radio) => {
    radio.addEventListener("change", function () {
      optionCard.classList.toggle("selected", this.value === "card");
      optionSite.classList.toggle("selected", this.value === "site");

      // Change le texte du bouton selon le mode
      const btn = document.getElementById("submitBtn");
      btn.textContent = this.value === "card" ? "Pay with Card" : "Confirm Booking";
    });
  });
}

// ========================================
// RÉCUPÈRE LES DONNÉES DU FORMULAIRE
// ========================================
function getFormData() {
  return {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    address: document.getElementById("address").value,
    phone: document.getElementById("phone").value,
    date: document.getElementById("date").value,
    location: document.getElementById("where").value,
    guests: document.getElementById("guests").value,
    comments: document.getElementById("comments").value,
  };
}

// ========================================
// SETUP DU FORMULAIRE
// ========================================
function setupFormSubmit() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    console.error("❌ Formulaire non trouvé!");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Vérifie qu'il y a des articles
    if (!cart || cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Processing...";

    // Quel mode de paiement est sélectionné ?
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    console.log("💳 Mode de paiement:", paymentMethod);

    const formData = getFormData();

    try {
      if (paymentMethod === "card") {
        // ===== OPTION 1 : PAIEMENT STRIPE =====
        await handleStripePayment(formData);
      } else {
        // ===== OPTION 2 : PAIEMENT SUR PLACE → DISCORD =====
        await handlePayOnSite(formData);
      }
    } catch (error) {
      console.error("❌ Erreur:", error);
      alert("An error occurred. Please try again.");
      btn.disabled = false;
      btn.textContent = paymentMethod === "card" ? "Pay with Card" : "Confirm Booking";
    }
  });
}

// ========================================
// OPTION 1 : PAIEMENT AVEC STRIPE
// ========================================
async function handleStripePayment(formData) {
  console.log("💳 Création de la session Stripe...");

  // Sauvegarde temporaire des infos client (pour les retrouver après paiement)
  // Stripe les transmettra via metadata, mais on garde une copie locale par sécurité
  localStorage.setItem("mlb_pending_booking", JSON.stringify({
    ...formData,
    cart: cart,
  }));

  // Appelle la Netlify Function qui crée la session Stripe
  const response = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: cart,
      customer: formData,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }

  const data = await response.json();
  console.log("✅ Session créée:", data.id);

  // Redirige vers la page de paiement Stripe
  const result = await stripe.redirectToCheckout({ sessionId: data.id });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// ========================================
// OPTION 2 : PAIEMENT SUR PLACE (DISCORD)
// ========================================
async function handlePayOnSite(formData) {
  console.log("🏠 Envoi de la réservation à Discord...");

  const total = calculateTotal();

  // Formate le panier pour Discord
  let cartText = "";
  cart.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    const itemTotal = (price * quantity).toFixed(2);
    cartText += `• ${item.name} x${quantity} = $${itemTotal}\n`;
  });

  const discordMessage = {
    embeds: [{
      title: "🎉 New Booking - PAY ON SITE 🏠",
      color: 15138816,
      fields: [
        { name: "👤 Customer Name", value: formData.name || "N/A", inline: true },
        { name: "📧 Email", value: formData.email || "N/A", inline: true },
        { name: "📍 Address", value: formData.address || "N/A", inline: false },
        { name: "📱 Phone", value: formData.phone || "N/A", inline: true },
        { name: "📅 Event Date", value: formData.date || "N/A", inline: true },
        { name: "📌 Event Location", value: formData.location || "N/A", inline: false },
        { name: "👥 Number of Guests", value: formData.guests || "N/A", inline: true },
        { name: "💬 Comments", value: formData.comments || "No comments", inline: false },
        { name: "🛒 Items Ordered", value: cartText || "No items", inline: false },
        { name: "💰 Total Amount", value: "$" + total + " (PAY ON SITE)", inline: true },
        { name: "⏰ Booking Time", value: new Date().toLocaleString("en-US"), inline: true },
      ],
    }],
  };

  const response = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(discordMessage),
  });

  if (!response.ok) {
    throw new Error("Discord error: " + response.status);
  }

  console.log("✅ Réservation envoyée à Discord!");
  showSuccessMessage();

  // Vide le panier
  cart = [];
  localStorage.setItem("mlb_cart", JSON.stringify(cart));
  document.getElementById("checkoutForm").reset();
  loadCart();

  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
}

// ========================================
// MESSAGE DE SUCCÈS
// ========================================
function showSuccessMessage() {
  const successDiv = document.createElement("div");
  successDiv.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #4CAF50, #45a049); color: white;
    padding: 40px 60px; border-radius: 10px; font-size: 18px; font-weight: bold;
    text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.3); z-index: 9999;
  `;
  successDiv.innerHTML = `
    <div style="font-size:50px;margin-bottom:15px;">✅</div>
    <div>Booking confirmed!</div>
    <div style="font-size:14px;margin-top:10px;opacity:.9;">We'll contact you soon.</div>
  `;
  document.body.appendChild(successDiv);
}
