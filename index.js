// ─────────────────────────────────────────────
//  Sweet Salad — Agent WhatsApp
//  Serveur Express + Twilio WhatsApp API
// ─────────────────────────────────────────────

require("dotenv").config();
const express = require("express");
const { twiml: { MessagingResponse } } = require("twilio");
const { handleMessage } = require("./agent");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Webhook Twilio — reçoit les messages WhatsApp entrants
app.post("/webhook", (req, res) => {
  const from    = req.body.From;   // ex: whatsapp:+22891777287
  const body    = req.body.Body?.trim() || "";
  const hasLocation = req.body.Latitude && req.body.Longitude;

  let messageText = body;

  // Si le client partage sa localisation GPS via WhatsApp
  if (hasLocation) {
    const lat = req.body.Latitude;
    const lon = req.body.Longitude;
    messageText = `__GPS__${lat},${lon}`;
  }

  const reply = handleMessage(from, messageText);

  const twimlResp = new MessagingResponse();
  twimlResp.message(reply);
  res.type("text/xml").send(twimlResp.toString());
});

// Route de santé
app.get("/", (_, res) => res.send("Sweet Salad Bot — opérationnel ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
