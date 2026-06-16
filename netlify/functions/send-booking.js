// netlify/functions/send-booking.js

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { customer, cart, total, paymentMethod } = JSON.parse(event.body);

    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    if (!DISCORD_WEBHOOK) {
      throw new Error("DISCORD_WEBHOOK not configured");
    }

    // Formate le panier
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
          { name: "👤 Customer Name", value: customer.name || "N/A", inline: true },
          { name: "📧 Email", value: customer.email || "N/A", inline: true },
          { name: "📍 Address", value: customer.address || "N/A", inline: false },
          { name: "📱 Phone", value: customer.phone || "N/A", inline: true },
          { name: "📅 Event Date", value: customer.date || "N/A", inline: true },
          { name: "📌 Event Location", value: customer.location || "N/A", inline: false },
          { name: "👥 Number of Guests", value: customer.guests || "N/A", inline: true },
          { name: "💬 Comments", value: customer.comments || "No comments", inline: false },
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
      throw new Error(`Discord error: ${response.status}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Booking sent to Discord" }),
    };
  } catch (error) {
    console.error("❌ Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
