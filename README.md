# MCP Dolibarr Enterprise v6.0.0 🚀

[![npm version](https://img.shields.io/npm/v/mcp-dolibarr.svg)](https://www.npmjs.com/package/mcp-dolibarr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-digitalfactorysn-black?logo=github)](https://github.com/digitalfactorysn)
[![Tools Count](https://img.shields.io/badge/Tools-291-blue.svg)](https://github.com/digitalfactorysn/mcp-dolibarr)

> Serveur **Model Context Protocol (MCP)** de niveau entreprise pour Dolibarr ERP/CRM (v18 à v24+).
> Permet aux modèles et agents IA (Claude, Cursor, Windsurf, Antigravity, etc.) d'agir comme un **Directeur Administratif & Financier et Expert ERP complet** :
> - Facturation, Avoirs, Règlements multi-factures
> - Comptabilité générale & analytique (SYSCOHADA & PCG), Grand livre, Balance
> - Extourne miroir sans suppression, Clôtures d'exercices & Contrôles de fin d'année
> - Rapprochement bancaire certifié et Import de relevés
> - Déclarations fiscales de TVA (simulation, préparation, verrouillage)
> - Paie Sénégal complète (Barèmes IPRES RG/RC, CSS PF/AT, IR progressif par part, CFCE)
> - Automatisation de workflows & Gestion des tâches planifiées (Cron jobs)
> - Contrats, Projets, Suivi du temps, Interventions
> - Documents, Pièces jointes Base64, Catégories & Champs personnalisés (Extrafields)
> - Administration contrôlée, Rôles, Dictionnaires et Modèles de documents
> - **Socle de Mutation & Sécurité Renforcée** : Idempotence 24h, Approbation à 2 étapes (jetons `APPR_*` 5 min), Verrouillage optimiste (`tms`/`status`), Masquage automatique des secrets et Protection absolue des comptes bancaires de production.
> 
> **Développé par [Digital Factory Senegal](https://digitalfactory.sn)**  
> 🌐 [digitalfactory.sn](https://digitalfactory.sn) &nbsp;|&nbsp; 📞 WhatsApp : [+221 77 800 38 14](https://wa.me/221778003814) &nbsp;|&nbsp; 📧 [infos@digitalfactory.sn](mailto:infos@digitalfactory.sn)

---

## ✨ Fonctionnalités Clés (291 Outils Spécialisés)

### 🛡️ Socle de Mutation & Sécurité de Niveau Bancaire
- **Idempotence native** : Prévient toute double exécution accidentelle via `idempotency_key`.
- **Approbation renforcée à 2 étapes** : Les actions irréversibles (clôtures, extournes, validations fiscales, suspension de modules, exécution manuelle de cron) génèrent un jeton sécurisé temporaire (`APPR_...`) à confirmer dans les 5 minutes.
- **Protection des comptes bancaires de production** : Le compte bancaire principal (ID 1 - ECOBANK) est verrouillé contre toute altération accidentelle (`PRODUCTION_ACCOUNT_PROTECTED`).
- **Verrouillage optimiste** : Détection des conflits d'édition concurrente via `expected_status` et `expected_tms`.
- **Zéro fausse réussite** : Toute écriture est immédiatement relue et vérifiée avant confirmation (`verified: true`).

### 💰 Comptabilité, Clôtures & Fiscalité (SYSCOHADA / OHADA)
- **Extourne obligatoire (`reverse_accounting_entry`)** : Aucune écriture validée n'est supprimée ; génération automatique d'une écriture miroir d'extourne.
- **Périodes & Clôtures** : `list_accounting_periods`, `open_accounting_period`, `soft_close_accounting_period`, `reopen_accounting_period`, `close_accounting_period`, `run_year_end_checks`, `generate_opening_entries`.
- **Rapprochement bancaire** : Sessions de rapprochement, import de relevé, lettrage (`match_bank_transactions`), dé-lettrage (`unreconcile_bank_line`), validation sans écart.
- **TVA & Déclarations** : Simulation (`simulate_vat_return`), préparation des feuilles de travail (`prepare_vat_return`), validation, verrouillage de période (`lock_vat_period`).

### 🇸🇳 Paie & Déclarations Sociales Sénégal
- Calcul certifié des cotisations selon la législation sénégalaise :
  - **IPRES Régime Général** (5.6% salarial, 8.4% patronal, plafond 450 000 FCFA)
  - **IPRES Cadres / Complémentaire** (2.4% salarial, 3.6% patronal, plafond 1 350 000 FCFA)
  - **Caisse de Sécurité Sociale (CSS)** : Prestations familiales (7%, plafond 63 000 FCFA), Accidents du travail (1% à 5%)
  - **Impôt sur le Revenu (IR)** progressif selon le nombre de parts fiscales (abattements légaux)
  - **CFCE** (Contribution Forfaitaire à la Charge de l'Employeur : 3%)
- Génération de bulletins mensuels individuels et en masse (`mass_generate_payslips_senegal`).

### ⚙️ Automatisation : Workflows & Tâches Planifiées (Cron)
- Règles de workflow : Devis → Commande → Facture → Classement automatique.
- Supervision et gestion des Cron jobs internes Dolibarr avec exécution manuelle sécurisée.

### 📑 Contrats, Projets & Interventions
- Gestion complète des contrats : renouvellement, résiliation, facturation automatique de services récurrents.
- Projets & Tâches : imputation des temps passés (`log_task_time_spent`), facturation au temps ou au jalon.
- Fiches d'intervention : suivi, modification de lignes, annulation et conversion en facture.

### 📂 Documents, Extrafields & Administration
- Téléversement Base64, renommage, déplacement, association d'extrafields dynamiques.
- Gestion des rôles, permissions utilisateurs, modèles de numérotation, templates de documents et dictionnaires métier.

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
git clone https://github.com/digitalfactorysn/mcp-dolibarr.git
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
| 📧 Email | [infos@digitalfactory.sn](mailto:infos@digitalfactory.sn) |
| 💬 WhatsApp | [+221 77 800 38 14](https://wa.me/221778003814) |
| 🐙 GitHub | [github.com/digitalfactorysn](https://github.com/digitalfactorysn) |

- **Issues & bugs** : [GitHub Issues](https://github.com/digitalfactorysn/mcp-dolibarr/issues)
- **Contribuer** : Les Pull Requests sont les bienvenues !
