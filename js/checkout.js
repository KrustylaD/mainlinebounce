// ===== DISCORD WEBHOOK =====
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1516213530288848906/QXvy4KQkXJuOMS-FP-FdqNivU89RjiRid-_uv6pRu3klpT1yQI0jdq2G7K0IAZUtwipN";

// ===== Charger le panier =====
let cart = JSON.parse(localStorage.getItem("mlb_cart")) || [];

// ===== Au chargement =====
document.addEventListener("DOMContentLoaded", function() {
  console.log("✅ Page chargée");
  console.log("🛒 Panier:", cart);
  loadCart();
  setupFormSubmit();
});

// ===== Afficher le panier =====
function loadCart() {
  const summaryItems = document.getElementById("summaryItems");
  const summaryTotal = document.getElementById("summaryTotal");

  console.log("📦 Chargement panier...", cart);

  if (!cart || cart.length === 0) {
    summaryItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    summaryTotal.textContent = "$0";
    return;
  }

  let html = "";
  let total = 0;

  cart.forEach((item, index) => {
    // ✅ Force la conversion en nombre
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    const itemTotal = price * quantity;

    total += itemTotal;

    console.log(`Item ${index}: ${item.name} | Price: ${price} | Qty: ${quantity} | Total: ${itemTotal}`);

    html += `
      <div class="summary-item">
        <span class="name">${item.name} x${quantity}</span>
        <span>$${itemTotal.toFixed(2)}</span>
      </div>
    `;
  });

  summaryItems.innerHTML = html;
  summaryTotal.textContent = "$" + total.toFixed(2);

  console.log("✅ Total calculé:", total);
}

// ===== Calculer le total =====
function calculateTotal() {
  let total = 0;
  cart.forEach(item => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    total += price * quantity;
  });
  return total.toFixed(2);
}

// ===== Setup du formulaire =====
function setupFormSubmit() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    console.error("❌ Formulaire non trouvé!");
    return;
  }

  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const btn = document.querySelector(".btn-submit");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      // Récupère les données du formulaire
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const address = document.getElementById("address").value;
      const phone = document.getElementById("phone").value;
      const date = document.getElementById("date").value;
      const location = document.getElementById("where").value;
      const guests = document.getElementById("guests").value;
      const comments = document.getElementById("comments").value;

      const total = calculateTotal();

      // Formate le panier pour Discord
      let cartText = "";
      if (cart && cart.length > 0) {
        cart.forEach(item => {
          const price = parseFloat(item.price) || 0;
          const quantity = parseInt(item.quantity) || 1;
          const itemTotal = (price * quantity).toFixed(2);
          cartText += `• ${item.name} x${quantity} = $${itemTotal}\n`;
        });
      } else {
        cartText = "No items in cart";
      }

      console.log("📦 Panier formaté:", cartText);
      console.log("💰 Total:", total);

      // Message pour Discord
      const discordMessage = {
        embeds: [{
          title: "🎉 New Booking - Main Line Bounce",
          color: 15138816,
          fields: [
            {
              name: "👤 Customer Name",
              value: name || "N/A",
              inline: true
            },
            {
              name: "📧 Email",
              value: email || "N/A",
              inline: true
            },
            {
              name: "📍 Address",
              value: address || "N/A",
              inline: false
            },
            {
              name: "📱 Phone",
              value: phone || "N/A",
              inline: true
            },
            {
              name: "📅 Event Date",
              value: date || "N/A",
              inline: true
            },
            {
              name: "📌 Event Location",
              value: location || "N/A",
              inline: false
            },
            {
              name: "👥 Number of Guests",
              value: guests || "N/A",
              inline: true
            },
            {
              name: "💬 Comments",
              value: comments || "No comments",
              inline: false
            },
            {
              name: "🛒 Items Ordered",
              value: cartText || "No items",
              inline: false
            },
            {
              name: "💰 Total Amount",
              value: "$" + total,
              inline: true
            },
            {
              name: "⏰ Booking Time",
              value: new Date().toLocaleString("en-US"),
              inline: true
            }
          ]
        }]
      };

      console.log("📨 Message Discord:", discordMessage);

      // Envoie à Discord
      const response = await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(discordMessage)
      });

      if (response.ok) {
        console.log("✅ Message envoyé à Discord!");
        showSuccessMessage();

        // Vide le panier et le formulaire
        cart = [];
        localStorage.setItem("mlb_cart", JSON.stringify(cart));
        form.reset();
        loadCart();

        // Redirection après 1.5 secondes
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        console.error("❌ Erreur Discord:", response.status, response.statusText);
        throw new Error("Server error: " + response.status);
      }

    } catch (error) {
      console.error("❌ Erreur:", error);
      alert("Error sending booking. Please try again.");
      btn.disabled = false;
      btn.textContent = "Confirm Booking";
    }
  });
}

// ===== Message de succès =====
function showSuccessMessage() {
  const successDiv = document.createElement("div");
  successDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 40px 60px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    animation: slideIn 0.5s ease-out;
  `;

  successDiv.innerHTML = `
    <div style="font-size: 50px; margin-bottom: 15px;">✅</div>
    <div>Booking confirmed!</div>
    <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">
      We'll contact you soon.
    </div>
  `;

  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes slideIn {
      from { opacity: 0; transform: translate(-50%, -60%); }
      to { opacity: 1; transform: translate(-50%, -50%); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(successDiv);

  setTimeout(() => {
    successDiv.style.opacity = "0";
    successDiv.style.transition = "opacity 0.3s ease-out";
    setTimeout(() => successDiv.remove(), 300);
  }, 2500);
}
