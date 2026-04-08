import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const invoiceTools: Tool[] = [
  {
    name: 'list_invoices',
    description: 'Lister les factures avec filtres avancés (statut, tiers, date). Statut: 0=Brouillon, 1=Ouverte/Impayée, 2=Payée, 3=Abandonnée',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number', description: 'Page de pagination' },
        status: { type: 'number', description: '0=Brouillon, 1=Impayée, 2=Payée, 3=Abandonnée' },
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
    name: 'send_invoice_email',
    description: "Envoyer une facture par email au client. Génère le PDF Dolibarr et l'attache.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la facture' },
        sendto: { type: 'string', description: 'Email destinataire' },
        subject: { type: 'string', description: "Sujet de l'email" },
        message: { type: 'string', description: "Corps de l'email" },
      },
      required: ['id', 'sendto'],
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
        amount: { type: 'number', description: 'Montant payé (si partiel, sinon total TTC)' },
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
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const payload = { ...args, date };
      delete (payload as Record<string, unknown>).date;
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
      await api.post(`/invoices/${args.id}/validate`, {
        idwarehouse: args.idwarehouse || 0,
        notrigger: 0,
      });
      return `✅ Facture #${args.id} validée avec succès. Elle est maintenant officielle et envoyable au client.`;
    }
    case 'send_invoice_email': {
      const payload = {
        sendto: args.sendto,
        subject: args.subject || `Facture N°`,
        message: args.message || 'Veuillez trouver ci-joint votre facture.',
        attach_pdf: 1,
      };
      await api.post(`/invoices/${args.id}/sendbyemail`, payload);
      return `✅ Facture #${args.id} envoyée par email à ${args.sendto}.`;
    }
    case 'add_payment_to_invoice': {
      const payDate = args.datepaye ? Math.floor(new Date(args.datepaye as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const invoice = await api.get<Record<string, unknown>>(`/invoices/${args.id}`);
      const amount = args.amount || (invoice.total_ttc as number);
      const payload = {
        datepaye: payDate,
        paiementid: args.payment_mode_id,
        closepaidinvoices: args.closepaidinvoices || 'yes',
        accountid: args.accountid,
        comment: args.comment || '',
        amounts: { [args.id as string]: amount },
      };
      const paymentId = await api.post('/invoices/paymentsdistributed', payload);
      return `✅ Paiement de ${amount} enregistré sur la facture #${args.id}. ID paiement: ${paymentId}`;
    }
    case 'create_credit_note': {
      const sourceInvoice = await api.get<Record<string, unknown>>(`/invoices/${args.source_invoice_id}`);
      const payload = {
        socid: sourceInvoice.socid,
        type: 2, // Avoir
        fac_rec: args.source_invoice_id,
        note_public: args.description || `Avoir sur facture #${args.source_invoice_id}`,
      };
      const id = await api.post('/invoices', payload);
      return `✅ Avoir (facture de crédit) créé. ID: ${id}. Associé à la facture source #${args.source_invoice_id}.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
