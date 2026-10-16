import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiError, DolibarrAPI, toUnix, withAuthor } from '../api.js';

export const invoiceTools: Tool[] = [
  {
    name: 'list_invoices',
    description: 'Lister les factures avec filtres avancés (statut, tiers, date). Statut : draft, unpaid, paid, cancelled. Pour une période, utilisez sqlfilters, ex. ((t.datef:>=:\'2025-01-01\') and (t.datef:<=:\'2025-12-31\'))',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number', description: 'Page de pagination' },
        status: { type: 'string', enum: ['draft', 'unpaid', 'paid', 'cancelled'], description: 'Statut de la facture' },
        thirdparty_ids: { type: 'string', description: 'ID(s) tiers, séparés par virgule' },
        sqlfilters: { type: 'string', description: "Filtre SQL: ex: (t.date_lim_reglement:lt:'2024-12-31')" },
      },
    },
  },
  {
    name: 'get_invoice',
    description: "Obtenir tous les détails d'une facture (lignes, paiements, statut, montants)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Créer une nouvelle facture brouillon pour un tiers',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du tiers (client)' },
        type: { type: 'number', description: '0=Standard, 1=Remplacement, 2=Avoir, 3=Situation, 5=Proforma. Défaut: 0' },
        date: { type: 'string', description: "Date de facturation ISO 8601 (ex: '2025-01-31'). Si vide: aujourd'hui" },
        note_public: { type: 'string', description: 'Note visible sur le PDF de la facture' },
        note_private: { type: 'string', description: 'Note interne (non visible sur le PDF)' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement (délai)' },
        mode_reglement_id: { type: 'number', description: 'ID mode de paiement (virement, chèque...)' },
        ref_client: { type: 'string', description: 'Référence client (votre N° de commande client)' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_invoice_line',
    description: "Ajouter une ligne de produit ou de service libre à une facture. Utiliser 'fk_product' pour un produit du catalogue ou 'desc' pour une ligne libre.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture' },
        desc: { type: 'string', description: 'Description de la ligne (service libre ou nom du produit)' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA % (ex: 18 pour 18%)' },
        fk_product: { type: 'number', description: 'ID du produit catalogue (optionnel, pour ligne produit)' },
        remise_percent: { type: 'number', description: 'Remise en % sur cette ligne (ex: 10 pour 10%)' },
        product_type: { type: 'number', description: '0=Produit physique, 1=Service. Défaut: 1' },
      },
      required: ['id', 'subprice', 'qty', 'tva_tx'],
    },
  },
  {
    name: 'update_invoice_line',
    description: "Modifier une ligne existante d'une facture (brouillon seulement)",
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'number', description: 'ID de la facture' },
        line_id: { type: 'number', description: 'ID de la ligne à modifier' },
        desc: { type: 'string', description: 'Nouvelle description' },
        subprice: { type: 'number', description: 'Nouveau prix unitaire HT' },
        qty: { type: 'number', description: 'Nouvelle quantité' },
        tva_tx: { type: 'number', description: 'Nouveau taux TVA' },
        remise_percent: { type: 'number', description: 'Nouvelle remise %' },
      },
      required: ['invoice_id', 'line_id'],
    },
  },
  {
    name: 'delete_invoice_line',
    description: "Supprimer une ligne d'une facture brouillon",
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'number', description: 'ID de la facture' },
        line_id: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['invoice_id', 'line_id'],
    },
  },
  {
    name: 'validate_invoice',
    description: 'Valider une facture brouillon pour la rendre officielle (irréversible sans avoir)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture' },
        idwarehouse: { type: 'number', description: "ID entrepôt pour mouvements de stock (0 si pas d'entrepôt)" },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_payment_to_invoice',
    description: "Enregistrer un paiement (règlement) sur une facture validée",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture' },
        datepaye: { type: 'string', description: "Date du paiement ISO 8601 (ex: '2025-01-31')" },
        payment_mode_id: { type: 'number', description: 'ID du mode de paiement (utiliser list_payment_methods)' },
        closepaidinvoices: { type: 'string', description: '"yes" pour fermer la facture si totalement payée (défaut: yes)' },
        accountid: { type: 'number', description: 'ID compte bancaire pour enregistrement (utiliser list_bank_accounts)' },
        amount: { type: 'number', description: 'Montant payé TTC (paiement partiel). Si absent : solde restant dû de la facture' },
        comment: { type: 'string', description: 'Commentaire/référence du paiement (ex: N° virement)' },
      },
      required: ['id', 'datepaye', 'payment_mode_id'],
    },
  },
  {
    name: 'create_credit_note',
    description: "Créer un avoir (facture de crédit) à partir d'une facture existante",
    inputSchema: {
      type: 'object',
      properties: {
        source_invoice_id: { type: 'number', description: 'ID de la facture source à contrepasser' },
        description: { type: 'string', description: "Raison de l'avoir" },
      },
      required: ['source_invoice_id'],
    },
  },
];

export async function handleInvoiceTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_invoices': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/invoices', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_invoice': {
      const data = await api.get(`/invoices/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_invoice': {
      const payload = await withAuthor(api, { ...args, date: toUnix(args.date) }, 'fk_user_author');
      const id = await api.post('/invoices', payload);
      return `✅ Facture brouillon créée avec succès.\nID facture: ${id}\nTiers ID: ${args.socid}\nProchaine étape: Ajoutez des lignes avec 'add_invoice_line', puis validez avec 'validate_invoice'.`;
    }
    case 'add_invoice_line': {
      const { id, ...line } = args;
      if (!line.product_type) line.product_type = 1; // Service par défaut
      const lineId = await api.post(`/invoices/${id}/lines`, line);
      return `✅ Ligne ajoutée à la facture #${id}. ID ligne: ${lineId}`;
    }
    case 'update_invoice_line': {
      const { invoice_id, line_id, ...line } = args;
      await api.put(`/invoices/${invoice_id}/lines/${line_id}`, line);
      return `✅ Ligne #${line_id} de la facture #${invoice_id} mise à jour.`;
    }
    case 'delete_invoice_line': {
      await api.delete(`/invoices/${args.invoice_id}/lines/${args.line_id}`);
      return `✅ Ligne #${args.line_id} supprimée de la facture #${args.invoice_id}.`;
    }
    case 'validate_invoice': {
      await api.post(`/invoices/${args.id}/validate`, { idwarehouse: args.idwarehouse ?? 0, notrigger: 0 });
      return `✅ Facture #${args.id} validée avec succès. Elle est maintenant officielle et envoyable au client.`;
    }
    case 'add_payment_to_invoice': {
      const invoice = await api.get<Record<string, unknown>>(`/invoices/${args.id}`);
      const paid = Number((await api.get<Array<{ amount?: string | number }>>(`/invoices/${args.id}/payments`).catch(() => []) as Array<{ amount?: string | number }>)
        .reduce((sum, p) => sum + Number(p.amount ?? 0), 0));
      const remain = Math.round((Number(invoice.total_ttc) - paid) * 100) / 100;
      const amount = args.amount !== undefined ? Number(args.amount) : remain;
      if (!(amount > 0)) throw new ApiError('Aucun montant à régler sur cette facture (solde nul).');
      const paymentId = await api.post('/invoices/paymentsdistributed', {
        arrayofamounts: { [String(args.id)]: { amount: String(amount), multicurrency_amount: '' } },
        datepaye: toUnix(args.datepaye),
        paymentid: args.payment_mode_id,
        closepaidinvoices: args.closepaidinvoices ?? 'yes',
        accountid: args.accountid,
        comment: args.comment ?? '',
      });
      return `✅ Paiement de ${amount} enregistré sur la facture #${args.id}. ID paiement: ${paymentId}`;
    }
    case 'create_credit_note': {
      const src = await api.get<Record<string, unknown> & { lines?: Array<Record<string, unknown>> }>(
        `/invoices/${args.source_invoice_id}`,
        { withLines: true },
      );
      const lines = (src.lines ?? []).map((l) => ({
        desc: l.desc ?? l.description ?? l.label ?? '',
        subprice: l.subprice,
        qty: -Math.abs(Number(l.qty)),
        tva_tx: l.tva_tx,
        fk_product: l.fk_product || undefined,
        product_type: l.product_type,
        remise_percent: l.remise_percent,
      }));
      const payload = await withAuthor(
        api,
        {
          socid: src.socid,
          type: 2,
          fk_facture_source: Number(args.source_invoice_id),
          date: toUnix(undefined),
          note_public: args.description ?? `Avoir sur facture ${String(src.ref ?? args.source_invoice_id)}`,
          lines,
        },
        'fk_user_author',
      );
      const id = await api.post('/invoices', payload);
      return `✅ Avoir brouillon créé (ID ${id}) à partir de la facture #${args.source_invoice_id} (lignes reprises en quantités négatives). Vérifiez-le puis validez-le avec validate_invoice.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
