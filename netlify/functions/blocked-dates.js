const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const store = getStore("blocked-dates");
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Pré-requête navigateur (CORS)
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // 📖 GET → renvoie toutes les dates bloquées (public, lu par le checkout)
  if (event.httpMethod === "GET") {
    const data = (await store.get("data", { type: "json" })) || {};
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  // ✍️ POST → bloquer / débloquer une date (ADMIN uniquement)
  if (event.httpMethod === "POST") {
    const adminKey = event.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_KEY) {
      return { statusCode: 401, headers, body: "Unauthorized" };
    }

    const { item, date, action } = JSON.parse(event.body);
    const data = (await store.get("data", { type: "json" })) || {};

    if (!data[item]) data[item] = [];

    if (action === "block") {
      if (!data[item].includes(date)) data[item].push(date);
    } else if (action === "unblock") {
      data[item] = data[item].filter((d) => d !== date);
      if (data[item].length === 0) delete data[item]; // nettoie si vide
    }

    await store.set("data", JSON.stringify(data));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) };
  }

  return { statusCode: 405, headers, body: "Method Not Allowed" };
};
