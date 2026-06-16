// ========================================
// CONFIGURATION
// ========================================

// 🔑 Ta clé PUBLIQUE Stripe (commence par pk_test_ ou pk_live_)
const STRIPE_PUBLIC_KEY = "pk_test_51TijiEFP6iINRwJw2zXWPLpRO6hnItDTNlcGQxImahsAlxaCAxBOFgWL8fKhlYWbw79YzeXtJOctTUxY8WSwGA5r00idu9gLrg";

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
  console.log("✅ Checkout page loaded");
  console.log("🛒 Cart from localStorage:", cart);
  
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
    alert("Please enter your name");
    return false;
  }
  if (!formData.email) {
    alert("Please enter your email");
    return false;
  }
  if (!formData.address) {
    alert("Please enter your address");
    return false;
  }
  if (!formData.guests) {
    alert("Please enter number of guests");
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

    // Vérifie qu'il y a des articles
    if (!cart || cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    const formData = getFormData();

    // Valide le formulaire
    if (!validateForm(formData)) {
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Processing...";

    // Quel mode de paiement est sélectionné ?
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    console.log("💳 Payment method:", paymentMethod);

    try {
      if (paymentMethod === "card") {
        // ===== OPTION 1 : PAIEMENT STRIPE =====
        await handleStripePayment(formData);
      } else {
        // ===== OPTION 2 : PAIEMENT SUR PLACE → NETLIFY FUNCTION =====
        await handlePayOnSite(formData);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("An error occurred: " + error.message);
      btn.disabled = false;
      btn.textContent = paymentMethod === "card" ? "Pay with Card" : "Confirm Booking";
    }
  });
}

// ========================================
// OPTION 1 : PAIEMENT AVEC STRIPE
// ========================================
async function handleStripePayment(formData) {
  console.log("💳 Creating Stripe checkout session...");

  // Sauvegarde temporaire des infos client
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
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create checkout session");
  }

  const data = await response.json();
  console.log("✅ Session created:", data.id);

  // Redirige vers la page de paiement Stripe
  const result = await stripe.redirectToCheckout({ sessionId: data.id });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// ========================================
// OPTION 2 : PAIEMENT SUR PLACE (NETLIFY FUNCTION)
// ========================================
async function handlePayOnSite(formData) {
  console.log("🏠 Sending booking to Discord via Netlify Function...");

  const total = calculateTotal();

  // Formate le panier pour Discord
  let cartText = "";
  cart.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    const itemTotal = (price * quantity).toFixed(2);
    cartText += `• ${item.name} x${quantity} = $${itemTotal}\n`;
  });

  // Appelle la Netlify Function qui envoie à Discord
  const response = await fetch("/.netlify/functions/send-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: formData,
      cart: cart,
      total: total,
      paymentMethod: "site",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to send booking");
  }

  console.log("✅ Booking sent to Discord!");
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

  setTimeout(() => {
    successDiv.style.opacity = "0";
    successDiv.style.transition = "opacity 0.3s ease-out";
    setTimeout(() => successDiv.remove(), 300);
  }, 2500);
}
