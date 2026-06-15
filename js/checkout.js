// ===== Config Google Form =====
const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSdQwkikSLubEkowRLdTnHuG-HU4Xg8WolXAgh5Z_F4NIwbp6g/formResponse";
const ENTRY = {
  name:     "entry.2005620554",
  email:    "entry.1045781291",
  address:  "entry.1065046570",
  phone:    "entry.1166974658",
  inflatable:"entry.1918896126",
  date:     "entry.2019677258",
  where:    "entry.2055134333",
  guests:   "entry.1710366866",
  comments: "entry.839337160"
};

// Mapping nom produit panier -> option EXACTE du form
const FORM_NAME_MAP = {
  "Magic Castle": "Magic Castle",
  "Dolphin Water Slide": "Dolphin water slide - 3 weeks lead time",
  "SuperHero Combo": "SuperHero 31' Slide combo",
  "Big & Fun XL": "Big Fun XL Bounce House - 3 weeks Lead time",
  "Slip and Slide": "Slip and Slide",
  "Tropical Paradise": "Tropical Paradise Slide",
  "Table and chair": "Table and chair"
};

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
renderSummary();

// ===== Soumission =====
document.getElementById("checkoutForm").addEventListener("submit", function(e){
  e.preventDefault();

  if(cart.length === 0){
    alert("Your cart is empty!");
    return;
  }

  // Construit la liste des gonflables choisis (mappés sur les options du form)
  const inflatableValues = cart.map(item=>{
    return FORM_NAME_MAP[item.name] || item.name;
  });

  // Construit l'URL de soumission (hidden iframe pour éviter CORS)
  const params = new URLSearchParams();
  params.append(ENTRY.name,    document.getElementById("name").value);
  params.append(ENTRY.email,   document.getElementById("email").value);
  params.append(ENTRY.address, document.getElementById("address").value);
  params.append(ENTRY.phone,   document.getElementById("phone").value);
  params.append(ENTRY.date,    document.getElementById("date").value);
  params.append(ENTRY.where,   document.getElementById("where").value);
  params.append(ENTRY.guests,  document.getElementById("guests").value);

  // Commentaires + résumé panier (prix + qty) ajoutés dans le champ comments
  let cartSummary = cart.map(i=>`${i.name} (x${i.qty||1}) - $${i.price}`).join(" | ");
  const userComment = document.getElementById("comments").value;
  params.append(ENTRY.comments, (userComment ? userComment+" || " : "") + "ORDER: " + cartSummary);

  // Champ inflatable (radio multiple -> on append plusieurs fois)
  inflatableValues.forEach(v=>{
    params.append(ENTRY.inflatable, v);
  });

  // Soumission via iframe caché
  const iframe = document.createElement("iframe");
  iframe.name = "hidden_iframe";
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.action = FORM_ACTION;
  form.method = "POST";
  form.target = "hidden_iframe";
  form.style.display = "none";

  for(const [key, value] of params.entries()){
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();

  // Confirmation + vide le panier
  setTimeout(()=>{
    localStorage.removeItem("mlb_cart");
    alert("✅ Thank you! Your booking request has been sent. We'll contact you shortly!");
    window.location.href = "index.html";
  }, 1000);
});
