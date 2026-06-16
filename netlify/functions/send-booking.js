// Handles "pay on site" bookings — sends notification to Discord
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const discordWebhook = process.env.DISCORD_WEBHOOK;
  if (!discordWebhook) {
    console.error("DISCORD_WEBHOOK env var not set");
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook not configured" }) };
  }

  try {
    const { formData, cart, total } = JSON.parse(event.body);

    let cartText = "";
    (cart || []).forEach((item) => {
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

    const response = await fetch(discordWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordMessage),
    });

    if (!response.ok) {
      throw new Error("Discord error: " + response.status);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Error sending booking:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
