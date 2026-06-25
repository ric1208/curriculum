# 🥗 Sweet Salad — Guide de déploiement WhatsApp

## Ce que contient ce projet

| Fichier        | Rôle                                              |
|----------------|---------------------------------------------------|
| `index.js`     | Serveur Express qui reçoit les messages Twilio    |
| `agent.js`     | Toute la logique de l'agent (menu, commandes...) |
| `package.json` | Dépendances Node.js                               |
| `.env.example` | Modèle de configuration à remplir                |

---

## Étape 1 — Créer un compte Twilio (gratuit)

1. Rendez-vous sur [twilio.com](https://www.twilio.com) et créez un compte gratuit.
2. Dans le tableau de bord, notez votre **Account SID** et **Auth Token**.
3. Allez dans **Messaging > Try it out > Send a WhatsApp message**.
4. Activez le **WhatsApp Sandbox** et suivez les instructions pour le connecter à votre téléphone.

---

## Étape 2 — Déployer le serveur (Render — gratuit)

1. Créez un compte sur [render.com](https://render.com).
2. Cliquez sur **New > Web Service**.
3. Connectez votre dépôt GitHub contenant ces fichiers, ou glissez-déposez le dossier.
4. Paramètres :
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Dans **Environment Variables**, ajoutez :
   - `TWILIO_ACCOUNT_SID` → votre Account SID
   - `TWILIO_AUTH_TOKEN` → votre Auth Token
6. Cliquez sur **Deploy**. Render vous fournit une URL publique, par exemple :
   `https://sweet-salad-bot.onrender.com`

---

## Étape 3 — Connecter Twilio à votre serveur

1. Dans Twilio, allez dans **Messaging > Settings > WhatsApp Sandbox Settings**.
2. Dans le champ **When a message comes in**, collez :
   ```
   https://sweet-salad-bot.onrender.com/webhook
   ```
3. Méthode : **HTTP POST**
4. Sauvegardez.

---

## Étape 4 — Tester

Envoyez *Bonjour* au numéro WhatsApp Sandbox de Twilio.
L'agent doit répondre automatiquement.

---

## Étape 5 — Passer en production (numéro réel)

Lorsque vous êtes prêt à utiliser votre vrai numéro WhatsApp (+228 91777287) :

1. Dans Twilio, faites une demande d'accès **WhatsApp Business API**.
2. Soumettez votre profil d'entreprise (nom, logo, description).
3. Une fois approuvé, associez votre numéro au webhook.
4. Vos clients pourront alors écrire directement à votre numéro.

---

## Commandes reconnues par l'agent

| Ce que le client écrit       | Ce que l'agent comprend         |
|------------------------------|---------------------------------|
| menu, carte, plats           | Afficher le menu                |
| 1 à 6, nom de salade         | Sélectionner un plat            |
| 7, composer, personnaliser   | Composer sa propre salade       |
| oui, ok, parfait, c bon      | Confirmer                       |
| non, annuler, modifier       | Refuser / corriger              |
| livraison, valider           | Procéder à la commande          |
| cash                         | Paiement en espèces             |
| mixx, tmoney                 | Paiement Mixx by TMoney         |
| flooz, moov                  | Paiement Flooz by Moov          |

---

## Règles de composition libre

- **500 FR par ingrédient**
- **Minimum 4 ingrédients** (= 2 000 FR minimum)
- Pas de limite maximale
- L'agent reconnaît les fautes courantes : "oeuf" → œuf dur, "patate" → pomme de terre, etc.

---

## Questions fréquentes

**L'agent ne répond pas ?**
Vérifiez que l'URL du webhook dans Twilio est correcte et que votre serveur Render est actif.

**Ajouter un plat au menu ?**
Ouvrez `agent.js` et ajoutez une entrée dans le tableau `MENU` (lignes 7–14).

**Modifier un prix ?**
Changez la valeur `price` dans le tableau `MENU` dans `agent.js`.

**Stocker les commandes en base de données ?**
Dans `agent.js`, les sessions sont en mémoire. Pour la production, remplacez `sessions = {}` par une intégration Redis ou MongoDB.
