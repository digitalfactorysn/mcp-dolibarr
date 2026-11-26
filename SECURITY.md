# Politique de sécurité / Security policy

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir de ticket public. Utilisez le signalement privé de GitHub
(onglet « Security » → « Report a vulnerability ») ou écrivez à **infos@digitalfactory.sn**
avec « [SECURITE mcp-dolibarr] » dans l'objet. Nous accusons réception sous 3 jours ouvrés.

Please do **not** open a public issue. Use GitHub private vulnerability reporting
(“Security” → “Report a vulnerability”) or email **infos@digitalfactory.sn**.

## Versions maintenues

| Version | Corrections de sécurité |
|---|---|
| 6.x | Oui |
| < 6.0 (dont 2.0.x publiée sur npm) | Non : mettre à jour |

## Configuration sûre (résumé)

- Mode HTTP : `MCP_API_TOKEN` obligatoire (le serveur refuse de démarrer sans), écoute sur `127.0.0.1`
  par défaut, `MCP_ALLOWED_HOSTS` = votre domaine, aucun CORS par défaut.
- Utilisez une clé Dolibarr dédiée aux droits minimaux ; `MCP_READ_ONLY=1` pour la consultation seule ;
  `MCP_DISABLED_TOOLS` pour retirer des familles d'outils (ex. `delete_*,send_*,pay_*`).
- Les textes renvoyés par Dolibarr sont balisés comme données non fiables : ne donnez pas d'outils
  d'écriture à un agent qui lit des contenus venant de tiers sans confirmation humaine.
