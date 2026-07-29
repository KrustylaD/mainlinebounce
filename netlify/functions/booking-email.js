const nodemailer = require("nodemailer");

const DEFAULT_RECIPIENTS = [
  "garciajonathan916.jg@gmail.com",
  "carlineleblanc@gmail.com",
];

function buildCartText(cart = []) {
  return cart
    .map((item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity || item.qty) || 1;
      const itemTotal = (price * quantity).toFixed(2);
      return `• ${item.name} x${quantity} = $${itemTotal}`;
    })
    .join("\n");
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

function getRecipients() {
  return (process.env.BOOKING_NOTIFICATION_EMAILS || DEFAULT_RECIPIENTS.join(","))
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, or SMTP_PASS is not configured");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendBookingEmail({ title, customer, cart, itemsText = "", total, paidLabel = "" }) {
  const transporter = createTransport();
  const recipients = getRecipients();
  const fromEmail = process.env.SMTP_FROM || `Main Line Bounce <${process.env.SMTP_USER}>`;

  const { subject, text, html } = buildEmailContent({ title, customer, cart, itemsText, total, paidLabel });

  const info = await transporter.sendMail({
    from: fromEmail,
    to: recipients,
    subject,
    text,
    html,
    replyTo: customer.email || undefined,
  });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

module.exports = { sendBookingEmail };