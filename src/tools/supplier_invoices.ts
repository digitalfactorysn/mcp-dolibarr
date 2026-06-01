import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const supplierInvoiceTools: Tool[] = [
  {
    name: 'list_supplier_invoices',
    description: 'Lister les factures fournisseurs. Statut: 0=Brouillon, 1=Ouverte, 2=Payée, 3=Abandonnée',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number', description: 'Page de pagination' },
        status: { type: 'number', description: '0=Brouillon, 1=Ouverte, 2=Payée, 3=Abandonnée' },
        thirdparty_ids: { type: 'string', description: 'ID fournisseur' },
        sqlfilters: { type: 'string', description: "Filtre SQL ex: (t.datef:>='2025-01-01')" },
      },
    },
  },
  {
    name: 'get_supplier_invoice',
    description: "Obtenir tous les détails d'une facture fournisseur (lignes, paiements, statut)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_supplier_invoice',
    description: 'Créer une facture fournisseur brouillon',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du fournisseur' },
        ref_supplier: { type: 'string', description: 'Référence facture du fournisseur' },
        date: { type: 'string', description: 'Date de facture ISO 8601' },
        date_echeance: { type: 'string', description: 'Date échéance paiement ISO 8601' },
        note_public: { type: 'string', description: 'Note publique' },
        note_private: { type: 'string', description: 'Note interne' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement' },
        mode_reglement_id: { type: 'number', description: 'ID mode de paiement' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_supplier_invoice_line',
    description: 'Ajouter une ligne à une facture fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur' },
        fk_product: { type: 'number', description: 'ID produit/service du catalogue (optionnel)' },
        desc: { type: 'string', description: 'Description libre de la ligne' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA % (ex: 18)' },
        remise_percent: { type: 'number', description: 'Remise en % (ex: 10)' },
        ref_supplier: { type: 'string', description: 'Référence fournisseur de la ligne' },
        product_type: { type: 'number', description: '0=Produit, 1=Service' },
      },
      required: ['id', 'qty', 'subprice'],
    },
  },
  {
    name: 'update_supplier_invoice_line',
    description: 'Modifier une ligne de facture fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur' },
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
    name: 'delete_supplier_invoice_line',
    description: 'Supprimer une ligne de facture fournisseur (doit être en brouillon)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur' },
        lineid: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'validate_supplier_invoice',
    description: 'Valider une facture fournisseur brouillon (la rend officielle)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_payment_supplier_invoice',
    description: 'Enregistrer un paiement sur une facture fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur' },
        datepaye: { type: 'string', description: 'Date du paiement ISO 8601' },
        amount: { type: 'number', description: 'Montant payé' },
        fk_account: { type: 'number', description: 'ID compte bancaire débité' },
        num_paiement: { type: 'string', description: 'Référence/numéro du paiement' },
        fk_type: { type: 'string', description: "Type: 'VIR', 'CHQ', 'CB', 'LIQ'" },
      },
      required: ['id', 'datepaye', 'amount', 'fk_account'],
    },
  },
  {
    name: 'create_supplier_credit_note',
    description: "Créer un avoir fournisseur (note de crédit) lié à une facture fournisseur existante",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture fournisseur originale' },
        note_public: { type: 'string', description: 'Motif de l\'avoir' },
      },
      required: ['id'],
    },
  },
];

export async function handleSupplierInvoiceTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_supplier_invoices': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/supplierinvoices', params);
      return JSON.stringify(data, null, 2);
    }

    case 'get_supplier_invoice': {
      const data = await api.get(`/supplierinvoices/${args.id}`);
      return JSON.stringify(data, null, 2);
    }

    case 'create_supplier_invoice': {
      const payload: Record<string, unknown> = { ...args };
      if (args.date) payload.date = Math.floor(new Date(args.date as string).getTime() / 1000);
      if (args.date_echeance) payload.date_echeance = Math.floor(new Date(args.date_echeance as string).getTime() / 1000);
      const id = await api.post('/supplierinvoices', payload);
      return `✅ Facture fournisseur créée. ID: ${id}\nFournisseur: #${args.socid}${args.ref_supplier ? ` | Ref: ${args.ref_supplier}` : ''}`;
    }

    case 'add_supplier_invoice_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/supplierinvoices/${id}/lines`, line);
      return `✅ Ligne ajoutée à la facture fournisseur #${id}. ID ligne: ${lineId}`;
    }

    case 'update_supplier_invoice_line': {
      const { id, lineid, ...rest } = args;
      await api.put(`/supplierinvoices/${id}/lines/${lineid}`, rest);
      return `✅ Ligne #${lineid} de la facture fournisseur #${id} mise à jour.`;
    }

    case 'delete_supplier_invoice_line': {
      await api.delete(`/supplierinvoices/${args.id}/lines/${args.lineid}`);
      return `✅ Ligne #${args.lineid} supprimée de la facture fournisseur #${args.id}.`;
    }

    case 'validate_supplier_invoice': {
      await api.post(`/supplierinvoices/${args.id}/validate`, {});
      return `✅ Facture fournisseur #${args.id} validée.`;
    }

    case 'add_payment_supplier_invoice': {
      const payload = {
        datepaye: Math.floor(new Date(args.datepaye as string).getTime() / 1000),
        amount: args.amount,
        fk_account: args.fk_account,
        num_paiement: args.num_paiement || '',
        type: args.fk_type || 'VIR',
        closepaidinvoices: 'yes',
      };
      await api.post(`/supplierinvoices/${args.id}/payments`, payload);
      return `✅ Paiement de ${args.amount} enregistré sur la facture fournisseur #${args.id}.`;
    }

    case 'create_supplier_credit_note': {
      const original = await api.get<Record<string, unknown>>(`/supplierinvoices/${args.id}`);
      const payload = {
        socid: original.socid,
        type: 2,
        fk_facture_source: args.id,
        note_public: args.note_public || `Avoir sur facture #${args.id}`,
      };
      const newId = await api.post('/supplierinvoices', payload);
      return `✅ Avoir fournisseur créé. ID: ${newId} (lié à la facture #${args.id})`;
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
