const DEFAULT_RECIPIENTS = [
  "garciajonathan916.jg@gmail.com",
  "carlineleblanc@gmail.com",
];

function buildCartText(cart = []) {
  return cart.map((item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity || item.qty) || 1;
    const itemTotal = (price * quantity).toFixed(2);
    return `• ${item.name} x${quantity} = $${itemTotal}`;
  }).join("\n");
}

function buildEmailContent({ title, customer = {}, cart = [], itemsText = "", total = "0.00", paidLabel = "" }) {
  const itemsSummary = itemsText || buildCartText(cart) || "No items";
  const subject = title;

  const text = [
    subject,
    "",
    `Customer: ${customer.name || "N/A"}`,
    `Email: ${customer.email || "N/A"}`,
    `Phone: ${customer.phone || "N/A"}`,
    `Address: ${customer.address || "N/A"}`,
    `Event Date: ${customer.date || customer.eventDate || "N/A"}`,
    `Location: ${customer.location || customer.where || "N/A"}`,
    `Guests: ${customer.guests || "N/A"}`,
    `Comments: ${customer.comments || "No comments"}`,
    "",
    "Items Ordered:",
    itemsSummary,
    "",
    `Total: $${total}${paidLabel ? ` ${paidLabel}` : ""}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5">
      <h2>${subject}</h2>
      <p><strong>Customer:</strong> ${customer.name || "N/A"}</p>
      <p><strong>Email:</strong> ${customer.email || "N/A"}</p>
      <p><strong>Phone:</strong> ${customer.phone || "N/A"}</p>
      <p><strong>Address:</strong> ${customer.address || "N/A"}</p>
      <p><strong>Event Date:</strong> ${customer.date || customer.eventDate || "N/A"}</p>
      <p><strong>Location:</strong> ${customer.location || customer.where || "N/A"}</p>
      <p><strong>Guests:</strong> ${customer.guests || "N/A"}</p>
      <p><strong>Comments:</strong> ${customer.comments || "No comments"}</p>
      <p><strong>Items Ordered:</strong><br>${itemsSummary.replace(/\n/g, "<br>")}</p>
      <p><strong>Total:</strong> $${total}${paidLabel ? ` ${paidLabel}` : ""}</p>
    </div>
  `;

  return { subject, text, html };
}

async function sendBookingEmail({ title, customer, cart, itemsText = "", total, paidLabel = "" }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY not configured, skipping email notification");
    return { skipped: true };
  }

  const fromEmail = process.env.BOOKING_FROM_EMAIL || "Main Line Bounce <onboarding@resend.dev>";
  const recipients = (process.env.BOOKING_NOTIFICATION_EMAILS || DEFAULT_RECIPIENTS.join(","))
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  const { subject, text, html } = buildEmailContent({ title, customer, cart, itemsText, total, paidLabel });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject,
      text,
      html,
      replyTo: customer.email || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

module.exports = { sendBookingEmail };