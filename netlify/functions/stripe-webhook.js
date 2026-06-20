// Cette fonction reçoit la confirmation de paiement de Stripe
// puis envoie les infos à Discord
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  // ✅ CORRECTION : on récupère le body BRUT (non modifié)
  // Stripe exige le body exact pour vérifier la signature
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  try {
    // Vérifie que la requête vient bien de Stripe (sécurité)
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,           // ← on utilise le body brut au lieu de event.body
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Signature webhook invalide:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // On écoute l'événement "paiement complété"
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const m = session.metadata || {};

    // Total payé (Stripe renvoie en cents)
    const total = (session.amount_total / 100).toFixed(2);

    const discordMessage = {
      embeds: [{
        title: "✅ New Booking - PAID ONLINE 💳",
        color: 5763719, // vert
        fields: [
          { name: "👤 Customer Name", value: m.name || "N/A", inline: true },
          { name: "📧 Email", value: m.email || session.customer_email || "N/A", inline: true },
          { name: "📍 Address", value: m.address || "N/A", inline: false },
          { name: "📱 Phone", value: m.phone || "N/A", inline: true },
          { name: "📅 Event Date", value: m.date || "N/A", inline: true },
          { name: "📌 Event Location", value: m.location || "N/A", inline: false },
          { name: "👥 Number of Guests", value: m.guests || "N/A", inline: true },
          { name: "💬 Comments", value: m.comments || "No comments", inline: false },
          { name: "🛒 Items Ordered", value: m.items || "No items", inline: false },
          { name: "💰 Total Paid", value: "$" + total + " ✅ PAID", inline: true },
          { name: "⏰ Booking Time", value: new Date().toLocaleString("en-US"), inline: true },
        ],
      }],
    };

    try {
      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordMessage),
      });
      console.log("✅ Réservation payée envoyée à Discord!");
    } catch (err) {
      console.error("❌ Erreur Discord:", err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
