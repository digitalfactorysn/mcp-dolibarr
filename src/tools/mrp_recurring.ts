import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

// ── PRODUCTION / MRP ──────────────────────────────────────────────────────────

export const mrpTools: Tool[] = [
  {
    name: 'list_mrp_productions',
    description: 'Lister les ordres de fabrication (OF). Statut: 0=Brouillon, 1=Validé, 2=En production, 3=Produit, 4=Annulé',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number' },
        status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=En production, 3=Produit, 4=Annulé' },
        product_id: { type: 'number', description: 'Filtrer par produit à fabriquer' },
        sqlfilters: { type: 'string', description: 'Filtre SQL' },
      },
    },
  },
  {
    name: 'get_mrp_production',
    description: 'Obtenir les détails d\'un ordre de fabrication (nomenclature, matières, statut)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'ordre de fabrication' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_mrp_production',
    description: 'Créer un ordre de fabrication',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence OF (ex: OF-2025-001)' },
        fk_product: { type: 'number', description: 'ID du produit fini à fabriquer' },
        qty: { type: 'number', description: 'Quantité à fabriquer' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt de production' },
        date_start_planned: { type: 'string', description: 'Date de début planifiée ISO 8601' },
        date_end_planned: { type: 'string', description: 'Date de fin planifiée ISO 8601' },
        fk_bom: { type: 'number', description: 'ID nomenclature (BOM) à utiliser' },
        note_private: { type: 'string', description: 'Note interne' },
      },
      required: ['fk_product', 'qty'],
    },
  },
  {
    name: 'validate_mrp_production',
    description: 'Valider un ordre de fabrication brouillon (démarre le processus de production)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'ordre de fabrication' },
      },
      required: ['id'],
    },
  },
  {
    name: 'produce_mrp_production',
    description: 'Enregistrer la production (consomme les matières premières et produit le produit fini)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'ordre de fabrication' },
        qty: { type: 'number', description: 'Quantité produite (si différente de la planifiée)' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt de sortie du produit fini' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_mrp_production',
    description: 'Modifier un ordre de fabrication (quantité, dates, entrepôt, nomenclature)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'ordre de fabrication' },
        qty: { type: 'number', description: 'Nouvelle quantité à fabriquer' },
        date_start_planned: { type: 'string', description: 'Date de début planifiée ISO 8601' },
        date_end_planned: { type: 'string', description: 'Date de fin planifiée ISO 8601' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt de production' },
        note_private: { type: 'string', description: 'Note interne' },
      },
      required: ['id'],
    },
  },
  {
    name: 'cancel_mrp_production',
    description: 'Annuler un ordre de fabrication validé',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'ordre de fabrication' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_mrp_production',
    description: 'Supprimer un ordre de fabrication brouillon',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'ordre de fabrication à supprimer' },
      },
      required: ['id'],
    },
  },
  // ── NOMENCLATURES (BOM) ──
  {
    name: 'list_bom',
    description: 'Lister les nomenclatures (Bill of Materials / Gamme de fabrication)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        product_id: { type: 'number', description: 'Filtrer par produit fini' },
        status: { type: 'number', description: '1=Actives seulement (défaut), 0=Toutes' },
        sqlfilters: { type: 'string', description: 'Filtre SQL' },
      },
    },
  },
  {
    name: 'get_bom',
    description: 'Obtenir les détails d\'une nomenclature (composants, quantités)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la nomenclature' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_bom',
    description: 'Créer une nouvelle nomenclature de fabrication',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence de la nomenclature' },
        label: { type: 'string', description: 'Libellé de la nomenclature' },
        fk_product: { type: 'number', description: 'ID du produit fini produit' },
        qty: { type: 'number', description: 'Quantité produite par cette nomenclature (défaut: 1)' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt de production par défaut' },
        bomtype: { type: 'number', description: '0=Fabrication (défaut), 1=Désassemblage' },
        note_private: { type: 'string', description: 'Note interne' },
      },
      required: ['ref', 'fk_product'],
    },
  },
  {
    name: 'add_bom_line',
    description: 'Ajouter un composant (matière première) à une nomenclature',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la nomenclature' },
        fk_product: { type: 'number', description: 'ID du produit composant' },
        qty: { type: 'number', description: 'Quantité nécessaire' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt source (optionnel)' },
        import_qty: { type: 'number', description: 'Quantité de chute/perte (défaut: 0)' },
        position: { type: 'number', description: 'Ordre/position dans la nomenclature' },
        note_private: { type: 'string', description: 'Note sur le composant' },
      },
      required: ['id', 'fk_product', 'qty'],
    },
  },
  {
    name: 'update_bom',
    description: 'Modifier une nomenclature (libellé, quantité produite, entrepôt)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la nomenclature' },
        label: { type: 'string', description: 'Libellé' },
        qty: { type: 'number', description: 'Quantité produite par cette nomenclature' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt de production' },
        note_private: { type: 'string', description: 'Note interne' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_bom',
    description: 'Supprimer une nomenclature de fabrication',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la nomenclature à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_bom_line',
    description: 'Modifier un composant d\'une nomenclature (quantité, entrepôt, position)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la nomenclature' },
        lineid: { type: 'number', description: 'ID de la ligne composant' },
        qty: { type: 'number', description: 'Nouvelle quantité nécessaire' },
        fk_warehouse: { type: 'number', description: 'ID entrepôt source' },
        import_qty: { type: 'number', description: 'Quantité de chute/perte' },
        position: { type: 'number', description: 'Position dans la nomenclature' },
        note_private: { type: 'string', description: 'Note sur le composant' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'delete_bom_line',
    description: 'Supprimer un composant d\'une nomenclature',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la nomenclature' },
        lineid: { type: 'number', description: 'ID de la ligne composant à supprimer' },
      },
      required: ['id', 'lineid'],
    },
  },
];

// ── FACTURES RÉCURRENTES ────────────────────────────────────────────────────

export const recurringInvoiceTools: Tool[] = [
  {
    name: 'list_recurring_invoices',
    description: 'Lister les modèles de factures récurrentes (facturation automatique périodique)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        status: { type: 'number', description: '0=Désactivé, 1=Actif' },
        sqlfilters: { type: 'string', description: 'Filtre SQL' },
      },
    },
  },
  {
    name: 'get_recurring_invoice',
    description: 'Obtenir les détails d\'un modèle de facture récurrente',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du modèle de facture récurrente' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_recurring_invoice',
    description: 'Créer un modèle de facture récurrente (générera automatiquement des factures selon la fréquence)',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du tiers client' },
        title: { type: 'string', description: 'Titre/libellé du modèle' },
        frequency: { type: 'number', description: 'Fréquence de génération (ex: 1 = toutes les X périodes)' },
        unit_frequency: { type: 'string', description: "'D'=jours, 'W'=semaines, 'M'=mois (défaut), 'Y'=années" },
        date_when: { type: 'string', description: 'Prochaine date de génération ISO 8601' },
        nb_gen_max: { type: 'number', description: 'Nombre max de générations (0=illimité)' },
        auto_validate: { type: 'number', description: '1=Valider automatiquement les factures générées, 0=Brouillon' },
        note_public: { type: 'string', description: 'Note publique sur les factures générées' },
      },
      required: ['socid', 'title'],
    },
  },
  {
    name: 'update_recurring_invoice',
    description: 'Modifier un modèle de facture récurrente (fréquence, prochaine date, statut)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du modèle' },
        title: { type: 'string', description: 'Nouveau titre' },
        frequency: { type: 'number', description: 'Nouvelle fréquence' },
        unit_frequency: { type: 'string', description: "'D', 'W', 'M', 'Y'" },
        date_when: { type: 'string', description: 'Nouvelle prochaine date de génération ISO 8601' },
        nb_gen_max: { type: 'number', description: 'Nouveau max de générations' },
        auto_validate: { type: 'number', description: '1=Auto-valider, 0=Brouillon' },
        suspended: { type: 'number', description: '1=Suspendre la récurrence, 0=Activer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_recurring_invoice',
    description: 'Supprimer un modèle de facture récurrente',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du modèle à supprimer' },
      },
      required: ['id'],
    },
  },
];

export async function handleMrpTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_mrp_productions': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.product_id) params.fk_product = args.product_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/mrps', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_mrp_production': {
      const data = await api.get(`/mrps/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_mrp_production': {
      const payload: Record<string, unknown> = { ...args, qty: args.qty, fk_product: args.fk_product };
      if (args.date_start_planned) payload.date_start_planned = Math.floor(new Date(args.date_start_planned as string).getTime() / 1000);
      if (args.date_end_planned) payload.date_end_planned = Math.floor(new Date(args.date_end_planned as string).getTime() / 1000);
      const id = await api.post('/mrps', payload);
      return `✅ Ordre de fabrication créé. ID: ${id} | Produit: #${args.fk_product} | Qté: ${args.qty}`;
    }
    case 'validate_mrp_production': {
      await api.post(`/mrps/${args.id}/validate`, {});
      return `✅ Ordre de fabrication #${args.id} validé.`;
    }
    case 'produce_mrp_production': {
      const payload: Record<string, unknown> = {};
      if (args.qty) payload.qty = args.qty;
      if (args.fk_warehouse) payload.fk_warehouse = args.fk_warehouse;
      await api.post(`/mrps/${args.id}/produce`, payload);
      return `✅ Production enregistrée pour l'OF #${args.id}.`;
    }
    case 'list_bom': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.product_id) params.fk_product = args.product_id;
      if (args.status !== undefined) params.status = args.status; else params.status = 1;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/boms', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bom': {
      const data = await api.get(`/boms/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_bom': {
      const payload = { qty: 1, bomtype: 0, status: 1, ...args };
      const id = await api.post('/boms', payload);
      return `✅ Nomenclature '${args.ref}' créée. ID: ${id} | Produit fini: #${args.fk_product}`;
    }
    case 'add_bom_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/boms/${id}/lines`, { import_qty: 0, position: 0, ...line });
      return `✅ Composant #${args.fk_product} (qté: ${args.qty}) ajouté à la nomenclature #${id}. ID ligne: ${lineId}`;
    }
    case 'update_mrp_production': {
      const { id, ...rest } = args;
      if (rest.date_start_planned) rest.date_start_planned = Math.floor(new Date(rest.date_start_planned as string).getTime() / 1000);
      if (rest.date_end_planned) rest.date_end_planned = Math.floor(new Date(rest.date_end_planned as string).getTime() / 1000);
      await api.put(`/mrps/${id}`, rest);
      return `✅ Ordre de fabrication #${id} mis à jour.`;
    }
    case 'cancel_mrp_production': {
      await api.post(`/mrps/${args.id}/cancel`, {});
      return `✅ Ordre de fabrication #${args.id} annulé.`;
    }
    case 'delete_mrp_production': {
      await api.delete(`/mrps/${args.id}`);
      return `✅ Ordre de fabrication #${args.id} supprimé.`;
    }
    case 'update_bom': {
      const { id, ...rest } = args;
      await api.put(`/boms/${id}`, rest);
      return `✅ Nomenclature #${id} mise à jour.`;
    }
    case 'delete_bom': {
      await api.delete(`/boms/${args.id}`);
      return `✅ Nomenclature #${args.id} supprimée.`;
    }
    case 'update_bom_line': {
      const { id, lineid, ...rest } = args;
      await api.put(`/boms/${id}/lines/${lineid}`, rest);
      return `✅ Ligne #${lineid} de la nomenclature #${id} mise à jour.`;
    }
    case 'delete_bom_line': {
      await api.delete(`/boms/${args.id}/lines/${args.lineid}`);
      return `✅ Composant #${args.lineid} supprimé de la nomenclature #${args.id}.`;
    }
    default:
      throw new Error(`Outil MRP inconnu: ${name}`);
  }
}

export async function handleRecurringInvoiceTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_recurring_invoices': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/invoices/templates', params).catch(() =>
        api.get('/invoices', { ...params, type: 5 })
      );
      return JSON.stringify(data, null, 2);
    }
    case 'get_recurring_invoice': {
      const data = await api.get(`/invoices/templates/${args.id}`).catch(() =>
        api.get(`/invoices/${args.id}`)
      );
      return JSON.stringify(data, null, 2);
    }
    case 'create_recurring_invoice': {
      const payload: Record<string, unknown> = {
        socid: args.socid,
        titre: args.title,
        frequency: args.frequency || 1,
        unit_frequency: args.unit_frequency || 'M',
        date_when: args.date_when ? Math.floor(new Date(args.date_when as string).getTime() / 1000) : Math.floor(Date.now() / 1000),
        nb_gen_max: args.nb_gen_max || 0,
        auto_validate: args.auto_validate || 0,
        note_public: args.note_public || '',
        type: 5,
      };
      const id = await api.post('/invoices/templates', payload).catch(() =>
        api.post('/invoices', payload)
      );
      return `✅ Modèle de facture récurrente créé. ID: ${id} | Client: #${args.socid} | Fréquence: ${args.frequency || 1} ${args.unit_frequency || 'M'}`;
    }
    case 'update_recurring_invoice': {
      const { id, ...rest } = args;
      if (rest.date_when) rest.date_when = Math.floor(new Date(rest.date_when as string).getTime() / 1000);
      await api.put(`/invoices/templates/${id}`, rest).catch(() =>
        api.put(`/invoices/${id}`, rest)
      );
      return `✅ Modèle de facture récurrente #${id} mis à jour.`;
    }
    case 'delete_recurring_invoice': {
      await api.delete(`/invoices/templates/${args.id}`).catch(() =>
        api.delete(`/invoices/${args.id}`)
      );
      return `✅ Modèle de facture récurrente #${args.id} supprimé.`;
    }
    default:
      throw new Error(`Outil facture récurrente inconnu: ${name}`);
  }
}
