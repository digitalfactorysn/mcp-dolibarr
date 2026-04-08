# MCP Dolibarr Expert 🚀

[![npm version](https://img.shields.io/npm/v/mcp-dolibarr.svg)](https://www.npmjs.com/package/mcp-dolibarr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-digitalfactorysn-black?logo=github)](https://github.com/digitalfactorysn)

> Un serveur **Model Context Protocol (MCP)** complet pour Dolibarr ERP/CRM. Permets à n'importe quel assistant IA (Claude, Cursor, Windsurf, etc.) d'agir comme un **expert Dolibarr à part entière** : facturation, comptabilité avancée, CRM, projets, stocks, contrats, configuration complète du système et bien plus.
> 
> **Développé par [Digital Factory Senegal](https://digitalfactory.sn)**  
> 🌐 [digitalfactory.sn](https://digitalfactory.sn) &nbsp;|&nbsp; 📞 WhatsApp : [+221 77 800 38 14](https://wa.me/221778003814) &nbsp;|&nbsp; 📧 [contact@digitalfactory.sn](mailto:contact@digitalfactory.sn)

---

## ✨ Fonctionnalités (55+ outils)

### 🏢 Tiers (Clients / Fournisseurs)
- Lister, rechercher, créer, mettre à jour les tiers
- Accéder à l'historique (factures, devis, commandes, contacts d'un tiers)

### 📄 Facturation (10 outils)
- Créer des factures brouillons, ajouter/modifier/supprimer des lignes
- Valider des factures officiellement
- Enregistrer des paiements avec ventilation multi-factures
- Créer des avoirs (factures de crédit)
- Envoyer des factures par email

### 📋 Devis & Propositions Commerciales
- Créer, envoyer, valider, signer, refuser des devis
- Convertir un devis signé en commande client

### 📦 Commandes (Clients & Fournisseurs)
- Gestion complète du cycle commande → livraison → facturation
- Commandes fournisseurs et approvisionnement

### 🏭 Produits & Stocks
- Catalogue produits et services avec prix, TVA, codes comptables
- Consultation et mouvements de stock par entrepôt

### 💰 Comptabilité & Trésorerie (Expert)
- Consultation des comptes bancaires et transactions
- Plan comptable et journaux comptables
- Écritures du grand livre
- **Rapport financier synthétique** : CA, impayés, solde de trésorerie

### 🤝 CRM
- Contacts individuels
- Agenda d'activités (appels, RDV, emails commerciaux)

### 📊 Projets & Tâches
- Gérer des projets client avec budget et deadline
- Créer et suivre des tâches

### 👥 RH & Administration
- Lister les utilisateurs/commerciaux
- Consulter les notes de frais

### 📑 Contrats & Abonnements
- Créer et gérer des contrats client

### ⚙️ Configuration & Administration Système
- Informations de la société (avec mise à jour)
- Activation/désactivation des modules
- Lecture et écriture des constantes système
- Modes et conditions de paiement, devises, pays

---

## 🚀 Installation

### Méthode 1 : Via npx (recommandé, aucune installation)
```bash
npx mcp-dolibarr
```

### Méthode 2 : Installation globale
```bash
npm install -g mcp-dolibarr
```

### Méthode 3 : Depuis le code source
```bash
git clone https://github.com/digitalfactory-sn/mcp-dolibarr.git
cd mcp-dolibarr
npm install && npm run build
```

---

## ⚙️ Configuration

### 1. Activer l'API REST dans Dolibarr
Dans votre Dolibarr : **Accueil > Configuration > Modules > Activez "API REST Dolibarr"**

### 2. Obtenir votre Clé API
Dans votre Dolibarr : **Accueil > Utilisateurs & Groupes > [Votre profil] > Onglet "Fiche utilisateur"**  
Copiez la valeur du champ **"Clé pour l'API REST"** (générez-en une si elle est vide).

---

## 🔌 Connexion avec Claude Desktop

Éditez le fichier de configuration de Claude Desktop :
- **Mac** : `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dolibarr": {
      "command": "npx",
      "args": ["mcp-dolibarr"],
      "env": {
        "DOLIBARR_URL": "https://votre-instance.dolibarr.com",
        "DOLIBARR_API_KEY": "VOTRE_CLE_API_SECRETE"
      }
    }
  }
}
```

> Redémarrez Claude Desktop. Un nouvel icône 🔌 apparaîtra — Dolibarr est connecté !

---

## 🔌 Connexion avec Cursor / Windsurf

Dans les paramètres MCP de votre IDE :
```json
{
  "mcp": {
    "servers": {
      "dolibarr": {
        "command": "npx",
        "args": ["mcp-dolibarr"],
        "env": {
          "DOLIBARR_URL": "https://votre-instance.dolibarr.com",
          "DOLIBARR_API_KEY": "VOTRE_CLE_API"
        }
      }
    }
  }
}
```

---

## 💡 Exemples d'utilisation avec l'IA

Une fois connecté, vous pouvez demander à votre IA :

```
"Quelles sont les 5 dernières factures impayées ?"
→ list_invoices (status=1, limit=5)

"Crée un devis pour STN GROUPE pour la maintenance Azure à 150 000 FCFA HT avec 18% TVA"
→ create_proposal → add_proposal_line → validate_proposal

"Quel est notre chiffre d'affaires de 2025 ?"
→ get_financial_summary (year=2025)

"Montre-moi le plan comptable"
→ list_accounting_accounts

"Quels modules sont activés sur notre Dolibarr ?"
→ list_modules
```

---

## 🔐 Sécurité

- **Ne committez jamais** votre clé API dans un dépôt Git.
- Utilisez un compte Dolibarr dédié avec les **permissions minimales** nécessaires.
- La clé API est transmise uniquement entre votre machine locale et l'instance Dolibarr (pas via des services tiers).

---

## 📜 License

MIT © [Digital Factory Senegal](https://digitalfactory.sn)

---

## 📞 Contact & Support

| Canal | Lien |
|---|---|
| 🌐 Site web | [digitalfactory.sn](https://digitalfactory.sn) |
| 📧 Email | [contact@digitalfactory.sn](mailto:contact@digitalfactory.sn) |
| 💬 WhatsApp | [+221 77 800 38 14](https://wa.me/221778003814) |
| 🐙 GitHub | [github.com/digitalfactorysn](https://github.com/digitalfactorysn) |

- **Issues & bugs** : [GitHub Issues](https://github.com/digitalfactorysn/mcp-dolibarr/issues)
- **Contribuer** : Les Pull Requests sont les bienvenues !
