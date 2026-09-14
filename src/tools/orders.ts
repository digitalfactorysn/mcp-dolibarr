import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const orderTools: Tool[] = [
  {
    name: 'list_orders',
    description: 'Lister les commandes clients. Statut: 0=Brouillon, 1=Validée, 2=En cours, 3=Livrée, 4=Annulée',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        page: { type: 'number' },
        status: { type: 'number', description: '0=Brouillon, 1=Validée, 2=Expédiée, 3=Livrée, 4=Annulée' },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'get_order',
    description: "Obtenir les détails complets d'une commande client (lignes, statut, livraisons)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_order',
    description: 'Créer une nouvelle commande client',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du tiers client' },
        date: { type: 'string', description: "Date de la commande ISO 8601 (ex: '2025-01-31')" },
        date_livraison: { type: 'string', description: 'Date de livraison souhaitée ISO 8601' },
        note_public: { type: 'string', description: 'Note visible sur le BdC' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_order_line',
    description: 'Ajouter une ligne à une commande client',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
        desc: { type: 'string', description: 'Description de la ligne' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité commandée' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        fk_product: { type: 'number', description: 'ID produit catalogue' },
        remise_percent: { type: 'number', description: 'Remise %' },
      },
      required: ['id', 'subprice', 'qty', 'tva_tx'],
    },
  },
  {
    name: 'update_order_line',
    description: "Modifier une ligne existante d'une commande client (brouillon seulement)",
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'number', description: 'ID de la commande' },
        line_id: { type: 'number', description: 'ID de la ligne à modifier' },
        desc: { type: 'string', description: 'Nouvelle description' },
        subprice: { type: 'number', description: 'Nouveau prix unitaire HT' },
        qty: { type: 'number', description: 'Nouvelle quantité' },
        tva_tx: { type: 'number', description: 'Nouveau taux TVA' },
        remise_percent: { type: 'number', description: 'Nouvelle remise %' },
      },
      required: ['order_id', 'line_id'],
    },
  },
  {
    name: 'delete_order_line',
    description: "Supprimer une ligne d'une commande client brouillon",
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'number', description: 'ID de la commande' },
        line_id: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['order_id', 'line_id'],
    },
  },
  {
    name: 'validate_order',
    description: "Valider une commande brouillon (la rend officielle, génère le N° de commande)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
      },
      required: ['id'],
    },
  },
  {
    name: 'convert_order_to_invoice',
    description: "Facturer une commande client validée (génère automatiquement la facture correspondante)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
      },
      required: ['id'],
    },
  },
];

export const supplierOrderTools: Tool[] = [
  {
    name: 'list_supplier_orders',
    description: 'Lister les commandes fournisseurs',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        page: { type: 'number' },
        status: { type: 'number', description: '0=Brouillon, 1=Validée, 2=Approuvée, 3=En livraison, 4=Livrée, 5=Annulée, 6=Refusée' },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'create_supplier_order',
    description: 'Créer une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du fournisseur' },
        date: { type: 'string', description: 'Date ISO 8601' },
        note_public: { type: 'string', description: 'Note publique' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_supplier_order_line',
    description: 'Ajouter une ligne à une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        desc: { type: 'string' },
        subprice: { type: 'number', description: 'Prix unitaire HT achat' },
        qty: { type: 'number' },
        tva_tx: { type: 'number' },
        fk_product: { type: 'number', description: 'ID produit catalogue' },
      },
      required: ['id', 'subprice', 'qty', 'tva_tx'],
    },
  },
  {
    name: 'update_supplier_order_line',
    description:
      "Modifier une ligne d'une commande fournisseur brouillon. ⚠️ L'API Dolibarr n'expose pas de route native pour ça (contrairement aux factures et commandes clients) : cet outil reconstruit la commande (suppression + recréation avec les lignes corrigées). La commande obtient un NOUVEL ID et une nouvelle référence brouillon (ex: PROV-xxx change), et les documents/pièces jointes déjà attachés à l'ancienne commande sont perdus. Ne fonctionne que sur une commande en statut brouillon.",
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'number', description: 'ID de la commande fournisseur' },
        line_id: { type: 'number', description: 'ID de la ligne à modifier' },
        desc: { type: 'string', description: 'Nouvelle description' },
        subprice: { type: 'number', description: 'Nouveau prix unitaire HT achat' },
        qty: { type: 'number', description: 'Nouvelle quantité' },
        tva_tx: { type: 'number', description: 'Nouveau taux TVA' },
      },
      required: ['order_id', 'line_id'],
    },
  },
  {
    name: 'delete_supplier_order_line',
    description:
      "Supprimer une ligne d'une commande fournisseur brouillon. ⚠️ Même limitation que update_supplier_order_line : pas de route native, la commande est supprimée et recréée sans cette ligne (nouvel ID, nouvelle référence, pièces jointes perdues). Ne fonctionne que sur une commande en statut brouillon.",
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'number', description: 'ID de la commande fournisseur' },
        line_id: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['order_id', 'line_id'],
    },
  },
  {
    name: 'get_supplier_order',
    description: "Obtenir les details d'une commande fournisseur",
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la commande fournisseur' } }, required: ['id'] },
  },
  {
    name: 'validate_supplier_order',
    description: 'Valider une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
      },
      required: ['id'],
    },
  },
];

export async function handleOrderTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_orders': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/orders', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_order': {
      const data = await api.get(`/orders/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_order': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const payload = { ...args, date };
      const id = await api.post('/orders', payload);
      return `✅ Commande client créée. ID: ${id}`;
    }
    case 'add_order_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/orders/${id}/lines`, line);
      return `✅ Ligne ajoutée à la commande #${id}. ID ligne: ${lineId}`;
    }
    case 'update_order_line': {
      const { order_id, line_id, ...line } = args;
      await api.put(`/orders/${order_id}/lines/${line_id}`, line);
      return `✅ Ligne #${line_id} de la commande #${order_id} mise à jour.`;
    }
    case 'delete_order_line': {
      await api.delete(`/orders/${args.order_id}/lines/${args.line_id}`);
      return `✅ Ligne #${args.line_id} supprimée de la commande #${args.order_id}.`;
    }
    case 'validate_order': {
      await api.post(`/orders/${args.id}/validate`, { idwarehouse: 0 });
      return `✅ Commande #${args.id} validée.`;
    }
    case 'convert_order_to_invoice': {
      const invoiceId = await api.post(`/orders/${args.id}/invoice`, {});
      return `✅ Commande #${args.id} facturée. ID facture générée: ${invoiceId}`;
    }
    // Supplier orders
    case 'get_supplier_order': {
      const data = await api.get(`/supplierorders/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'list_supplier_orders': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      const data = await api.get('/supplierorders', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_supplier_order': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const id = await api.post('/supplierorders', { ...args, date });
      return `✅ Commande fournisseur créée. ID: ${id}`;
    }
    case 'add_supplier_order_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/supplierorders/${id}/lines`, line);
      return `✅ Ligne ajoutée à la commande fournisseur #${id}. ID ligne: ${lineId}`;
    }
    case 'update_supplier_order_line':
    case 'delete_supplier_order_line': {
      // L'API Dolibarr n'a pas de PUT/DELETE {id}/lines/{lineid} pour les commandes fournisseur
      // (contrairement aux factures et commandes clients). Seul moyen via REST: reconstruire
      // la commande brouillon (delete + recreate) avec les lignes corrigées.
      const orderId = args.order_id;
      const lineId = Number(args.line_id);
      const order = await api.get<Record<string, unknown>>(`/supplierorders/${orderId}`);
      const statut = Number(order.statut ?? order.status);
      if (statut !== 0) {
        throw new Error(
          `Commande fournisseur #${orderId} n'est pas en brouillon (statut=${statut}). Seule une commande brouillon peut être reconstruite pour modifier/supprimer une ligne.`
        );
      }
      const existingLines = (order.lines as Array<Record<string, unknown>>) || [];
      const target = existingLines.find((l) => Number(l.id ?? l.rowid) === lineId);
      if (!target) {
        throw new Error(`Ligne #${lineId} introuvable sur la commande fournisseur #${orderId}.`);
      }
      const keptLines = existingLines.filter((l) => name === 'update_supplier_order_line' || Number(l.id ?? l.rowid) !== lineId);
      const rebuiltLines = keptLines.map((l) => {
        const isTarget = Number(l.id ?? l.rowid) === lineId;
        return {
          desc: (isTarget ? (args.desc as string) : undefined) ?? (l.desc as string),
          subprice: (isTarget ? (args.subprice as number) : undefined) ?? (l.subprice as number),
          qty: (isTarget ? (args.qty as number) : undefined) ?? (l.qty as number),
          tva_tx: (isTarget ? (args.tva_tx as number) : undefined) ?? (l.tva_tx as number),
          fk_product: l.fk_product || undefined,
          ref_fourn: l.ref_fourn || l.ref_supplier || undefined,
        };
      });
      const headerPayload: Record<string, unknown> = {
        socid: order.socid,
        date: order.date_commande || order.date || Math.floor(Date.now() / 1000),
        note_public: order.note_public || undefined,
        note_private: order.note_private || undefined,
        user_author_id: 4,
      };
      await api.delete(`/supplierorders/${orderId}`);
      const newId = await api.post('/supplierorders', headerPayload);
      for (const line of rebuiltLines) {
        await api.post(`/supplierorders/${newId}/lines`, line);
      }
      const verb = name === 'update_supplier_order_line' ? 'modifiée' : 'supprimée';
      return `✅ Ligne ${verb}. ⚠️ La commande a dû être reconstruite (limitation API Dolibarr) : ancien ID #${orderId} remplacé par le nouvel ID #${newId} (nouvelle référence brouillon, documents/pièces jointes de l'ancienne commande perdus). Utilise #${newId} pour la suite.`;
    }
    case 'validate_supplier_order': {
      await api.post(`/supplierorders/${args.id}/validate`, {});
      return `✅ Commande fournisseur #${args.id} validée.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}

