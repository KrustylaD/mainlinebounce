// Cette fonction crée une session Stripe Checkout
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Accepte seulement les requêtes POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { cart, customer } = JSON.parse(event.body);

    // L'URL de base du site (Netlify la fournit automatiquement)
    const baseUrl = process.env.URL || `https://${event.headers.host}`;

    // Transforme le panier en line_items Stripe
    const lineItems = cart.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        // Stripe utilise les CENTS → on multiplie par 100
        unit_amount: Math.round(parseFloat(item.price) * 100),
      },
      quantity: parseInt(item.quantity) || 1,
    }));

    // Crée la session de paiement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      customer_email: customer.email,
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout.html`,
      // On stocke les infos client dans metadata (transmises au webhook)
      metadata: {
        name: customer.name || "",
        email: customer.email || "",
        address: customer.address || "",
        phone: customer.phone || "",
        date: customer.date || "",
        location: customer.location || "",
        guests: customer.guests || "",
        comments: (customer.comments || "").substring(0, 400),
        // Résumé du panier (metadata limité à 500 caractères par champ)
        items: cart
          .map((i) => `${i.name} x${i.quantity || 1}`)
          .join(", ")
          .substring(0, 450),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    console.error("Erreur Stripe:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
