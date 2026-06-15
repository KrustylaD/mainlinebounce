// ===== CONFIG EMAILJS =====
const SERVICE_ID = "service_iaashttk";
const TEMPLATE_ID = "template_yv5v7qg";
const PUBLIC_KEY = "HmGFAe8nigT4PTSej";

emailjs.init(PUBLIC_KEY);

// ===== Charger le panier =====
let cart = JSON.parse(localStorage.getItem("mlb_cart")) || [];

function renderSummary(){
  const box = document.getElementById("summaryItems");
  if(cart.length === 0){
    box.innerHTML = '<div class="empty-cart">Your cart is empty.<br><a href="inflatables.html">Browse inflatables</a></div>';
    document.getElementById("summaryTotal").textContent = "$0";
    return;
  }
  let total = 0;
  box.innerHTML = cart.map(item=>{
    const qty = item.qty || 1;
    const price = parseFloat(item.price) || 0;
    const line = price * qty;
    total += line;
    return `<div class="summary-item">
      <span class="name">${item.name} ${qty>1?'×'+qty:''}</span>
      <span>$${line.toFixed(2)}</span>
    </div>`;
  }).join("");
  document.getElementById("summaryTotal").textContent = "$"+total.toFixed(2);
}

document.addEventListener("DOMContentLoaded", function(){
  renderSummary();

  const formElement = document.getElementById("checkoutForm");
  if(!formElement) return;
  
  formElement.addEventListener("submit", function(e){
    e.preventDefault();

    if(cart.length === 0){
      alert("Your cart is empty!");
      return;
    }

    // Crée le résumé du panier
    let cartSummary = cart.map(item=>{
      const qty = item.qty || 1;
      const price = parseFloat(item.price) || 0;
      return `${item.name} (×${qty}) - $${(price*qty).toFixed(2)}`;
    }).join("\n");

    // Prépare les données pour EmailJS
    const templateParams = {
      customer_name: document.getElementById("name").value,
      customer_email: document.getElementById("email").value,
      customer_phone: document.getElementById("phone").value,
      customer_address: document.getElementById("address").value,
      event_date: document.getElementById("date").value,
      event_location: document.getElementById("where").value,
      guests_count: document.getElementById("guests").value,
      cart_items: cartSummary,
      customer_message: document.getElementById("comments").value || "No additional comments"
    };

    // Envoie l'email
    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
      .then(response => {
        console.log("Email envoyé!", response);
        localStorage.removeItem("mlb_cart");
        alert("✅ Thank you! Your booking request has been sent. We'll contact you shortly!");
        window.location.href = "index.html";
      })
      .catch(error => {
        console.error("Erreur:", error);
        alert("❌ Oops! Something went wrong. Please try again.");
      });
  });
});
