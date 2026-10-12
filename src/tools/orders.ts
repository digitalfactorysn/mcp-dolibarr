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
      const payload = { ...args, date, user_author_id: Number(args.user_author_id) || 1 };
      const id = await api.post<number>('/orders', payload);
      const created = await api.get<Record<string, unknown>>(`/orders/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!created,
        id,
        ref: created?.ref || `(ID #${id})`,
        statut: created?.statut,
        socid: args.socid,
        order: created || { id, ...payload },
      }, null, 2);
    }
    case 'add_order_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/orders/${id}/lines`, line);
      const order = await api.get<Record<string, unknown>>(`/orders/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!order,
        order_id: id,
        line_id: lineId,
        total_ht: order?.total_ht,
        total_ttc: order?.total_ttc,
        lines_count: Array.isArray(order?.lines) ? order.lines.length : undefined,
      }, null, 2);
    }
    case 'validate_order': {
      await api.post(`/orders/${args.id}/validate`, { idwarehouse: 0 });
      const validated = await api.get<Record<string, unknown>>(`/orders/${args.id}`).catch(() => null);
      const isOk = validated && (String(validated.statut) === '1' || String(validated.statut) === '2');
      return JSON.stringify({
        applied: true,
        verified: !!isOk,
        id: args.id,
        ref: validated?.ref,
        statut: validated?.statut,
        message: isOk ? `Commande #${validated?.ref || args.id} validée et vérifiée.` : `Validation soumise pour la commande #${args.id}.`,
      }, null, 2);
    }
    case 'convert_order_to_invoice': {
      const invoiceId = await api.post<number>(`/orders/${args.id}/invoice`, {});
      const invoice = await api.get<Record<string, unknown>>(`/invoices/${invoiceId}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!invoice,
        order_id: args.id,
        invoice_id: invoiceId,
        invoice_ref: invoice?.ref,
        total_ttc: invoice?.total_ttc,
        details: invoice,
      }, null, 2);
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
      const id = await api.post<number>('/supplierorders', { ...args, date, user_author_id: Number(args.user_author_id) || 1 });
      const created = await api.get<Record<string, unknown>>(`/supplierorders/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!created,
        id,
        ref: created?.ref,
        socid: args.socid,
        order: created,
      }, null, 2);
    }
    case 'add_supplier_order_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/supplierorders/${id}/lines`, line);
      const order = await api.get<Record<string, unknown>>(`/supplierorders/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!order,
        order_id: id,
        line_id: lineId,
        total_ht: order?.total_ht,
        total_ttc: order?.total_ttc,
      }, null, 2);
    }
    case 'validate_supplier_order': {
      await api.post(`/supplierorders/${args.id}/validate`, {});
      const validated = await api.get<Record<string, unknown>>(`/supplierorders/${args.id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!validated,
        id: args.id,
        ref: validated?.ref,
        statut: validated?.statut,
      }, null, 2);
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}

