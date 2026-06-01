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

export const orderExtendedTools: Tool[] = [
  {
    name: 'update_order',
    description: 'Modifier une commande client (dates, conditions, notes) — brouillon seulement',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
        date_livraison: { type: 'string', description: 'Nouvelle date de livraison ISO 8601' },
        note_public: { type: 'string', description: 'Note publique' },
        note_private: { type: 'string', description: 'Note interne' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement' },
        ref_client: { type: 'string', description: 'Référence client' },
      },
      required: ['id'],
    },
  },
  {
    name: 'send_order_email',
    description: 'Envoyer une confirmation de commande par email au client',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
        to: { type: 'string', description: 'Email destinataire' },
        subject: { type: 'string', description: 'Objet' },
        message: { type: 'string', description: 'Corps du message' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_order_shipments',
    description: 'Lister les expéditions/bons de livraison liés à une commande client',
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
  {
    name: 'update_order_line',
    description: 'Modifier une ligne d\'une commande client (brouillon seulement)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
        lineid: { type: 'number', description: 'ID de la ligne' },
        desc: { type: 'string', description: 'Description' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        remise_percent: { type: 'number', description: 'Remise %' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'delete_order_line',
    description: 'Supprimer une ligne d\'une commande client (brouillon seulement)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
        lineid: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Annuler une commande client validée',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande à annuler' },
        comment: { type: 'string', description: 'Motif d\'annulation' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_supplier_order',
    description: 'Obtenir les détails d\'une commande fournisseur (lignes, statut, réceptions)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
      },
      required: ['id'],
    },
  },
  {
    name: 'receive_supplier_order',
    description: 'Enregistrer la réception d\'une commande fournisseur (incrémente le stock)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        warehouse_id: { type: 'number', description: 'ID de l\'entrepôt de réception' },
      },
      required: ['id', 'warehouse_id'],
    },
  },
  {
    name: 'update_supplier_order',
    description: 'Modifier une commande fournisseur (notes, date, référence)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        note_public: { type: 'string', description: 'Note publique' },
        note_private: { type: 'string', description: 'Note interne' },
        ref_supplier: { type: 'string', description: 'Référence fournisseur' },
        date_livraison: { type: 'string', description: 'Date de livraison prévue ISO 8601' },
      },
      required: ['id'],
    },
  },
  {
    name: 'cancel_supplier_order',
    description: 'Annuler une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        comment: { type: 'string', description: 'Motif d\'annulation' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_supplier_order',
    description: 'Supprimer une commande fournisseur (brouillon seulement)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_supplier_order_line',
    description: 'Modifier une ligne d\'une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        lineid: { type: 'number', description: 'ID de la ligne' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        desc: { type: 'string', description: 'Description' },
        remise_percent: { type: 'number', description: 'Remise %' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'delete_supplier_order_line',
    description: 'Supprimer une ligne d\'une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        lineid: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['id', 'lineid'],
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
    case 'validate_order': {
      await api.post(`/orders/${args.id}/validate`, { idwarehouse: 0 });
      return `✅ Commande #${args.id} validée.`;
    }
    case 'convert_order_to_invoice': {
      const invoiceId = await api.post(`/orders/${args.id}/invoice`, {});
      return `✅ Commande #${args.id} facturée. ID facture générée: ${invoiceId}`;
    }
    // Supplier orders
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
    case 'validate_supplier_order': {
      await api.post(`/supplierorders/${args.id}/validate`, {});
      return `✅ Commande fournisseur #${args.id} validée.`;
    }
    case 'update_order_line': {
      const { id, lineid, ...rest } = args;
      await api.put(`/orders/${id}/lines/${lineid}`, rest);
      return `✅ Ligne #${lineid} de la commande #${id} mise à jour.`;
    }
    case 'delete_order_line': {
      await api.delete(`/orders/${args.id}/lines/${args.lineid}`);
      return `✅ Ligne #${args.lineid} supprimée de la commande #${args.id}.`;
    }
    case 'cancel_order': {
      await api.post(`/orders/${args.id}/cancel`, { idwarehouse: 0 });
      return `✅ Commande #${args.id} annulée.${args.comment ? ` Motif: ${args.comment}` : ''}`;
    }
    case 'get_supplier_order': {
      const data = await api.get(`/supplierorders/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'receive_supplier_order': {
      await api.post(`/supplierorders/${args.id}/receive`, { warehouse_id: args.warehouse_id });
      return `✅ Réception de la commande fournisseur #${args.id} enregistrée dans l'entrepôt #${args.warehouse_id}.`;
    }
    case 'update_order': {
      const { id, ...rest } = args;
      if (rest.date_livraison) rest.date_livraison = Math.floor(new Date(rest.date_livraison as string).getTime() / 1000);
      await api.put(`/orders/${id}`, rest);
      return `✅ Commande #${id} mise à jour.`;
    }
    case 'send_order_email': {
      const payload = { sendto: args.to || '', subject: args.subject || '', message: args.message || '' };
      await api.post(`/orders/${args.id}/sendbyemail`, payload);
      return `✅ Commande #${args.id} envoyée par email${args.to ? ` à ${args.to}` : ''}.`;
    }
    case 'list_order_shipments': {
      const data = await api.get(`/orders/${args.id}/shipments`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_supplier_order': {
      const { id, ...rest } = args;
      if (rest.date_livraison) rest.date_livraison = Math.floor(new Date(rest.date_livraison as string).getTime() / 1000);
      await api.put(`/supplierorders/${id}`, rest);
      return `✅ Commande fournisseur #${id} mise à jour.`;
    }
    case 'cancel_supplier_order': {
      await api.post(`/supplierorders/${args.id}/cancel`, { comment: args.comment || '' });
      return `✅ Commande fournisseur #${args.id} annulée.${args.comment ? ` Motif: ${args.comment}` : ''}`;
    }
    case 'delete_supplier_order': {
      await api.delete(`/supplierorders/${args.id}`);
      return `✅ Commande fournisseur #${args.id} supprimée.`;
    }
    case 'update_supplier_order_line': {
      const { id, lineid, ...rest } = args;
      await api.put(`/supplierorders/${id}/lines/${lineid}`, rest);
      return `✅ Ligne #${lineid} de la commande fournisseur #${id} mise à jour.`;
    }
    case 'delete_supplier_order_line': {
      await api.delete(`/supplierorders/${args.id}/lines/${args.lineid}`);
      return `✅ Ligne #${args.lineid} supprimée de la commande fournisseur #${args.id}.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
