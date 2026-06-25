// ─────────────────────────────────────────────
//  Sweet Salad — Logique de l'agent
// ─────────────────────────────────────────────

// ── Données du menu ──────────────────────────
const MENU = [
  { id:1, name:"Macédoine",       price:2500, ing:"Pomme de terre, petits pois, carotte, haricots verts, maïs doux, saucisses, œuf dur" },
  { id:2, name:"Bouchère",        price:2500, ing:"Viande de bœuf, tomate, carotte, oignon, poivrons, laitue, œuf dur" },
  { id:3, name:"Sweet Gourmande", price:3000, ing:"Pomme de terre, laitue, carotte, concombre, tomates, oignons, betterave, viande de bœuf, œuf dur" },
  { id:4, name:"Sweet Chicken",   price:3000, ing:"Pomme de terre, laitue, carotte, concombre, maïs doux, blanc de poulet, œuf dur" },
  { id:5, name:"Sweet Beef",      price:2500, ing:"Pomme de terre, laitue, carotte, concombre, maïs doux, viande hachée, œuf dur" },
  { id:6, name:"Sweet Faith",     price:2500, ing:"Pomme de terre, laitue, carotte, concombre, maïs doux, foie, petits pois, œuf dur" },
];

const ALL_ING = [
  "pomme de terre","petits pois","carotte","haricots verts","maïs doux","saucisses","œuf dur",
  "viande de bœuf","tomate","oignon","poivrons","laitue","concombre","tomates","oignons",
  "betterave","blanc de poulet","viande hachée","foie",
];

// ── Alias pour la tolérance orthographique ───
const ING_ALIASES = {
  "oeuf":"œuf dur","oeufs":"œuf dur","oeuf dur":"œuf dur","oeufs durs":"œuf dur",
  "mais":"maïs doux","maïs":"maïs doux","mais doux":"maïs doux",
  "patate":"pomme de terre","patates":"pomme de terre","pommes de terre":"pomme de terre",
  "boeuf":"viande de bœuf","bœuf":"viande de bœuf","viande":"viande de bœuf",
  "poulet":"blanc de poulet","blanc poulet":"blanc de poulet",
  "haricot":"haricots verts","haricots":"haricots verts",
  "petit pois":"petits pois","saucisse":"saucisses",
  "poivron":"poivrons","oignon":"oignon","oignons":"oignons",
};

const MENU_ALIASES = {
  "macedoine":1,"macedonie":1,"macedo":1,
  "bouchere":2,"boucher":2,
  "gourmande":3,"gourmant":3,
  "chicken":4,"chikin":4,
  "beef":5,
  "faith":6,
};

// ── Mots-clés de reconnaissance ──────────────
const POSITIVE  = ["oui","ok","d'accord","daccord","bien sur","bien sûr","ouais","yep","yes","allez","go","parfait","confirme","je confirme","c bon","c'est bon","super","correct","exactement","tout a fait","tout à fait"];
const NEGATIVE  = ["non","nope","annuler","annule","stop","no","incorrecte","incorrect","pas correct","modifier","changer","faux"];
const MENU_TRIG = ["menu","carte","plats","salades","voir","liste","quoi","choisir","commander","commande","passer"];
const COMP_TRIG = ["composer","compos","personnalis","propre","moi-meme","moi même","créer","choisir mes"];
const VAL_TRIG  = ["valider","valide","confirmer","confirme","terminer","finaliser","c bon","c'est bon"];

// ── États de la conversation ──────────────────
const S = {
  WELCOME:0, MENU_SHOWN:1, ITEM_CONFIRM:2, ORDERING:3, COMPOSE:4,
  CART_CONFIRM:5, LOCATION:6, LOCATION_ALT:7, PHONE:8,
  PAYMENT:9, MOBILE_MONEY:10, FINAL_CONFIRM:11,
};

// ── Sessions en mémoire (une par numéro client) ──
// En production, remplacer par Redis ou une base de données.
const sessions = {};

function getSession(from) {
  if (!sessions[from]) {
    sessions[from] = {
      state: S.WELCOME,
      cart: [],
      delivery: {},
      customIng: [],
      pendingItem: null,
    };
  }
  return sessions[from];
}

// ── Utilitaires ───────────────────────────────
const fmt = (n) => n.toLocaleString("fr-FR") + " FR";
const normalize = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function isPositive(t) { return POSITIVE.some((p) => t.includes(normalize(p))); }
function isNegative(t) { return NEGATIVE.some((p) => t.includes(normalize(p))); }
function isMenuReq(t)  { return MENU_TRIG.some((p) => t.includes(p)); }
function isCompReq(t)  { return COMP_TRIG.some((p) => t.includes(p)); }
function isValReq(t)   { return VAL_TRIG.some((p) => t.includes(p)); }

function findMenu(t) {
  const n = normalize(t);
  const num = parseInt(n);
  if (!isNaN(num) && num >= 1 && num <= 6) return MENU[num - 1];
  for (const [alias, idx] of Object.entries(MENU_ALIASES)) {
    if (n.includes(normalize(alias))) return MENU[idx - 1];
  }
  return MENU.find((m) =>
    normalize(m.name).split(" ").some((w) => w.length > 3 && n.includes(w))
  );
}

function resolveIng(raw) {
  const n = normalize(raw);
  if (ING_ALIASES[n]) return ING_ALIASES[n];
  return (
    ALL_ING.find((ing) => {
      const ni = normalize(ing);
      return ni === n || ni.includes(n) || n.includes(ni.split(" ")[0]);
    }) || null
  );
}

// ── Formatage des textes ──────────────────────
function menuMsg() {
  let m = "Voici notre menu Sweet Salad :\n\n";
  MENU.forEach((i) => { m += `${i.id}. ${i.name} — ${fmt(i.price)}\n${i.ing}\n\n`; });
  m += `7. Composer votre propre salade\n500 FR par ingrédient, minimum 4 ingrédients\n\nQuelle est votre sélection ?`;
  return m;
}

function cartSummary(cart) {
  if (!cart.length) return "Votre panier est vide.";
  let s = "Contenu de votre panier :\n\n", total = 0;
  cart.forEach((c) => {
    const label = c.custom
      ? `Salade personnalisée (${c.ingList.length} ingrédients)`
      : c.name;
    s += `- ${label} x${c.qty} = ${fmt(c.price * c.qty)}\n`;
    if (c.custom) s += `  Ingrédients : ${c.ingList.join(", ")}\n`;
    total += c.price * c.qty;
  });
  return s + `\nTotal : ${fmt(total)}`;
}

function fullSummary(cart, delivery) {
  let s = "Récapitulatif complet de votre commande :\n\n", total = 0;
  cart.forEach((c) => {
    const label = c.custom
      ? `Salade personnalisée (${c.ingList.length} ingrédients)`
      : c.name;
    s += `- ${label} x${c.qty} = ${fmt(c.price * c.qty)}\n`;
    if (c.custom) s += `  Ingrédients : ${c.ingList.join(", ")}\n`;
    total += c.price * c.qty;
  });
  s += `\nLocalisation : ${delivery.location}`;
  s += `\nTéléphone : ${delivery.phone}`;
  s += `\nPaiement : ${delivery.payment}`;
  s += `\n\nTotal à régler : ${fmt(total)}`;
  return s;
}

function composeStatus(customIng) {
  const nb = customIng.length, price = nb * 500, remaining = Math.max(0, 4 - nb);
  let s = `Votre composition actuelle :\n`;
  s += nb ? customIng.map((i) => `- ${i}`).join("\n") : "(aucun ingrédient sélectionné)";
  s += `\n\nMontant : ${fmt(price)}`;
  if (remaining > 0)
    s += `\n\nIl vous faut encore ${remaining} ingrédient(s) pour atteindre le minimum requis.`;
  else
    s += `\n\nLe minimum est atteint. Vous pouvez valider ou ajouter d'autres ingrédients.`;
  return s;
}

function locationPrompt() {
  return (
    "Pour vous livrer dans les meilleures conditions, nous vous proposons deux options :\n\n" +
    "1. Partagez votre localisation GPS directement depuis WhatsApp (appuyez sur le trombone > Localisation) — c'est la méthode la plus précise.\n\n" +
    "2. Si vous préférez, indiquez un point de repère facilement identifiable près de vous (ex : un bâtiment connu, une école, un carrefour, un magasin)."
  );
}

function paymentPrompt() {
  return (
    "Quel est votre mode de paiement préféré ?\n\n" +
    "1. Cash — règlement à la livraison\n" +
    "2. Mobile Money — paiement avant livraison (Mixx by TMoney ou Flooz by Moov)"
  );
}

// ── Moteur principal ──────────────────────────
function handleMessage(from, rawText) {
  const sess = getSession(from);
  const text  = rawText.trim();
  const t     = normalize(text);

  // Localisation GPS transmise par Twilio
  const isGPS = text.startsWith("__GPS__");

  // ── WELCOME ──
  if (sess.state === S.WELCOME) {
    sess.state = S.MENU_SHOWN;
    return (
      "Bonjour et bienvenue chez Sweet Salad.\n\n" +
      "Merci de noter que les commandes doivent être passées au moins 1 heure à l'avance. " +
      "Notre service est disponible du mardi au vendredi.\n\n" +
      "Tapez *menu* pour consulter notre carte ou *commande* pour passer une commande."
    );
  }

  // ── Commandes globales (disponibles à tout moment) ──
  if (isMenuReq(t)) {
    sess.state = S.MENU_SHOWN;
    return menuMsg();
  }

  if (t === "panier" || t.includes("mon panier")) {
    return cartSummary(sess.cart);
  }

  // Déclencher la livraison depuis n'importe quel état (sauf composition en cours)
  if (
    (t.includes("proceder") || t.includes("procéder") || t.includes("livraison") || isValReq(t)) &&
    sess.state !== S.COMPOSE && sess.state !== S.ITEM_CONFIRM
  ) {
    if (!sess.cart.length) {
      return "Votre panier est actuellement vide. Veuillez consulter notre menu pour effectuer votre sélection.";
    }
    sess.state = S.CART_CONFIRM;
    return (
      "Avant de procéder, veuillez vérifier votre panier :\n\n" +
      cartSummary(sess.cart) +
      "\n\nCes articles sont-ils corrects ? (répondez *oui* ou *non*)"
    );
  }

  // ── ITEM_CONFIRM — confirmation après sélection d'un article ──
  if (sess.state === S.ITEM_CONFIRM) {
    if (isPositive(t)) {
      const item = sess.pendingItem;
      if (item.custom) {
        sess.cart.push({ ...item });
      } else {
        const ex = sess.cart.find((c) => c.id === item.id && !c.custom);
        if (ex) ex.qty++; else sess.cart.push({ ...item, qty: 1 });
      }
      sess.pendingItem = null;
      sess.state = S.ORDERING;
      return (
        "L'article a bien été ajouté à votre panier.\n\n" +
        cartSummary(sess.cart) +
        "\n\nSouhaitez-vous ajouter un autre article ou procéder à la livraison ?\n" +
        "Tapez un numéro de salade, *composer* pour une salade personnalisée, ou *livraison* pour continuer."
      );
    } else if (isNegative(t)) {
      sess.pendingItem = null;
      sess.state = S.MENU_SHOWN;
      return "Pas de problème. Veuillez choisir un autre article.\n\n" + menuMsg();
    }
    const name = sess.pendingItem?.name || "cet article";
    return `Souhaitez-vous confirmer l'ajout de "${name}" ? Répondez *oui* ou *non*.`;
  }

  // ── CART_CONFIRM — validation du panier avant livraison ──
  if (sess.state === S.CART_CONFIRM) {
    if (isPositive(t)) {
      sess.state = S.LOCATION;
      return locationPrompt();
    } else if (isNegative(t)) {
      sess.state = S.ORDERING;
      return (
        "Bien entendu. Que souhaitez-vous modifier ?\n\n" +
        "Tapez un numéro de salade pour ajouter un article, ou *menu* pour consulter notre carte."
      );
    }
    return "Votre panier est-il correct ? Répondez *oui* ou *non*.";
  }

  // ── LOCATION — choix GPS ou point de repère ──
  if (sess.state === S.LOCATION) {
    if (isGPS) {
      const coords = text.replace("__GPS__", "");
      sess.delivery.location = `Localisation GPS : https://maps.google.com/?q=${coords}`;
      sess.state = S.PHONE;
      return `Votre localisation GPS a bien été reçue.\n\nPourriez-vous nous communiquer votre numéro de téléphone ?`;
    }
    if (t.includes("gps") || t.includes("localisation") || t.includes("partager")) {
      sess.state = S.LOCATION_ALT;
      return (
        "Très bien. Dans WhatsApp, appuyez sur le trombone (📎), " +
        "sélectionnez *Localisation*, puis *Envoyer ma position actuelle*.\n\n" +
        "Si vous préférez saisir un point de repère à la place, vous pouvez l'indiquer directement ici."
      );
    }
    // Le client saisit directement un point de repère
    sess.delivery.location = text;
    sess.state = S.PHONE;
    return `Point de repère enregistré : ${text}.\n\nPourriez-vous nous communiquer votre numéro de téléphone ?`;
  }

  if (sess.state === S.LOCATION_ALT) {
    if (isGPS) {
      const coords = text.replace("__GPS__", "");
      sess.delivery.location = `Localisation GPS : https://maps.google.com/?q=${coords}`;
    } else {
      sess.delivery.location = text;
    }
    sess.state = S.PHONE;
    return `Localisation enregistrée.\n\nPourriez-vous nous communiquer votre numéro de téléphone ?`;
  }

  // ── PHONE ──
  if (sess.state === S.PHONE) {
    sess.delivery.phone = text;
    sess.state = S.PAYMENT;
    return paymentPrompt();
  }

  // ── PAYMENT ──
  if (sess.state === S.PAYMENT) {
    if (t.includes("cash") || t.includes("espece") || t === "1") {
      sess.delivery.payment = "Cash à la livraison";
      sess.state = S.FINAL_CONFIRM;
      return fullSummary(sess.cart, sess.delivery) + "\n\nToutes ces informations sont-elles correctes ? Répondez *oui* pour confirmer.";
    }
    if (t.includes("mobile") || t.includes("money") || t.includes("momo") || t === "2") {
      sess.state = S.MOBILE_MONEY;
      return "Quel réseau Mobile Money utilisez-vous ?\n\n1. Mixx by TMoney\n2. Flooz by Moov";
    }
    return paymentPrompt();
  }

  // ── MOBILE_MONEY ──
  if (sess.state === S.MOBILE_MONEY) {
    if (t.includes("mixx") || t.includes("tmoney") || t === "1") {
      sess.delivery.payment = "Mobile Money — Mixx by TMoney";
    } else if (t.includes("flooz") || t.includes("moov") || t === "2") {
      sess.delivery.payment = "Mobile Money — Flooz by Moov";
    } else {
      return "Veuillez préciser votre réseau :\n1. Mixx by TMoney\n2. Flooz by Moov";
    }
    sess.state = S.FINAL_CONFIRM;
    return (
      "Nous vous enverrons les instructions de paiement après confirmation.\n\n" +
      fullSummary(sess.cart, sess.delivery) +
      "\n\nToutes ces informations sont-elles correctes ? Répondez *oui* pour confirmer."
    );
  }

  // ── FINAL_CONFIRM ──
  if (sess.state === S.FINAL_CONFIRM) {
    if (isPositive(t)) {
      const total = sess.cart.reduce((s, c) => s + c.price * c.qty, 0);
      const num   = Math.floor(Math.random() * 9000) + 1000;
      const payNote = sess.delivery.payment.includes("Mobile")
        ? `\n\nVous recevrez sous peu les instructions de paiement ${sess.delivery.payment.split("—")[1].trim()}.`
        : "\n\nLe règlement s'effectuera en cash à la livraison.";
      const confirmation =
        `✅ Votre commande n°${num} a bien été enregistrée.\n\n` +
        cartSummary(sess.cart) +
        `\n\nTotal : ${fmt(total)}${payNote}\n\n` +
        "Nous vous remercions de votre confiance. Votre commande sera prête dans environ 1 heure. Bon appétit !";

      // Réinitialiser la session
      sessions[from] = {
        state: S.MENU_SHOWN,
        cart: [], delivery: {}, customIng: [], pendingItem: null,
      };
      return confirmation;
    }
    if (t.includes("localisation")) {
      sess.state = S.LOCATION;
      return locationPrompt();
    }
    if (t.includes("telephone") || t.includes("téléphone") || t.includes("numero")) {
      sess.state = S.PHONE;
      return "Veuillez nous indiquer votre nouveau numéro de téléphone.";
    }
    if (t.includes("paiement")) {
      sess.state = S.PAYMENT;
      return paymentPrompt();
    }
    if (t.includes("commande")) {
      sess.state = S.ORDERING;
      sess.cart = [];
      return "Votre panier a été réinitialisé.\n\n" + menuMsg();
    }
    if (isNegative(t)) {
      return (
        "Que souhaitez-vous modifier ?\n\n" +
        "Répondez *localisation*, *téléphone*, *paiement* ou *commande*."
      );
    }
    return "Confirmez-vous l'ensemble de ces informations ? Répondez *oui* ou précisez ce que vous souhaitez modifier.";
  }

  // ── COMPOSE — composition libre ──
  if (sess.state === S.COMPOSE) {
    if (isValReq(t)) {
      if (sess.customIng.length < 4) {
        return (
          `Votre composition ne contient pas encore le minimum requis.\n\n` +
          `Il vous manque ${4 - sess.customIng.length} ingrédient(s).\n\n` +
          composeStatus(sess.customIng)
        );
      }
      const price = sess.customIng.length * 500;
      const ing   = [...sess.customIng];
      sess.pendingItem = { id: Date.now(), name: "Salade personnalisée", price, qty: 1, custom: true, ingList: ing };
      sess.customIng  = [];
      sess.state       = S.ITEM_CONFIRM;
      return (
        `Votre salade personnalisée :\n\n${ing.map((i) => `- ${i}`).join("\n")}\n\n` +
        `Montant : ${fmt(price)}\n\nConfirmez-vous cette composition ? Répondez *oui* ou *non*.`
      );
    }
    if (t.includes("voir") || t.includes("composition")) {
      return composeStatus(sess.customIng);
    }
    if (t.includes("recommencer")) {
      sess.customIng = [];
      return "Votre composition a été réinitialisée. Veuillez indiquer vos ingrédients, séparés par des virgules.";
    }

    const parts = text.split(/,|et /).map((s) => s.trim()).filter(Boolean);
    const added = [], unknown = [], duplicate = [];
    parts.forEach((p) => {
      const resolved = resolveIng(p);
      if (resolved) {
        if (sess.customIng.includes(resolved)) duplicate.push(resolved);
        else { sess.customIng.push(resolved); added.push(resolved); }
      } else {
        unknown.push(p);
      }
    });
    let reply = "";
    if (added.length)     reply += `Ajouté${added.length > 1 ? "s" : ""} : ${added.join(", ")}.\n`;
    if (duplicate.length) reply += `Déjà présent${duplicate.length > 1 ? "s" : ""} : ${duplicate.join(", ")}.\n`;
    if (unknown.length)   reply += `Non reconnu${unknown.length > 1 ? "s" : ""} : ${unknown.join(", ")}.\n`;
    reply += "\n" + composeStatus(sess.customIng);
    if (sess.customIng.length >= 4) reply += "\n\nTapez *valider* pour confirmer votre composition.";
    return reply.trim();
  }

  // ── MENU_SHOWN / ORDERING — sélection d'un plat ──
  if (sess.state === S.MENU_SHOWN || sess.state === S.ORDERING) {
    if (t === "7" || isCompReq(t)) {
      sess.state     = S.COMPOSE;
      sess.customIng = [];
      return (
        "Nous vous invitons à composer votre salade sur mesure.\n\n" +
        "Ingrédients disponibles :\n\n" +
        ALL_ING.map((g, i) => `${i + 1}. ${g}`).join("\n") +
        "\n\nVeuillez indiquer les ingrédients souhaités, séparés par des virgules.\n" +
        "Chaque ingrédient est facturé 500 FR, avec un minimum de 4 ingrédients (2 000 FR)."
      );
    }
    const found = findMenu(t);
    if (found) {
      sess.pendingItem = found;
      sess.state       = S.ITEM_CONFIRM;
      return (
        `Vous avez sélectionné : ${found.name}\n${found.ing}\nPrix : ${fmt(found.price)}\n\n` +
        `Confirmez-vous cet article ? Répondez *oui* ou *non*.`
      );
    }
    return (
      "Nous n'avons pas pu identifier votre sélection. " +
      "Veuillez indiquer le numéro (1 à 7) ou le nom de la salade.\n\n" +
      "Tapez *menu* pour consulter notre carte."
    );
  }

  return "Nous sommes à votre disposition. Tapez *menu* pour consulter notre carte ou *commande* pour passer une commande.";
}

module.exports = { handleMessage };
