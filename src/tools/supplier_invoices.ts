import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiError, DolibarrAPI, toUnix, withAuthor } from '../api.js';
import { money, num, paging } from './_util.js';

export const supplierInvoiceTools: Tool[] = [
  { name: 'list_supplier_invoices', description: 'Lister les factures fournisseurs. Statut : draft, unpaid, paid, cancelled', inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'string', enum: ['draft', 'unpaid', 'paid', 'cancelled'] }, thirdparty_ids: { type: 'string' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_supplier_invoice', description: "Obtenir les détails d'une facture fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_supplier_invoice', description: 'Créer une facture fournisseur brouillon', inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du fournisseur' }, ref_supplier: { type: 'string', description: 'Référence facture fournisseur' }, date: { type: 'string', description: 'Date ISO 8601' }, note_public: { type: 'string' }, cond_reglement_id: { type: 'number' }, mode_reglement_id: { type: 'number' } }, required: ['socid'] } },
  { name: 'add_supplier_invoice_line', description: "Ajouter une ligne à une facture fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' }, desc: { type: 'string' }, subprice: { type: 'number' }, qty: { type: 'number' }, tva_tx: { type: 'number' }, fk_product: { type: 'number' } }, required: ['id', 'subprice', 'qty', 'tva_tx'] } },
  { name: 'validate_supplier_invoice', description: 'Valider une facture fournisseur brouillon', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'pay_supplier_invoice', description: 'Enregistrer un paiement sur une facture fournisseur', inputSchema: { type: 'object', properties: { id: { type: 'number' }, datepaye: { type: 'string' }, payment_mode_id: { type: 'number' }, accountid: { type: 'number' }, amount: { type: 'number', description: 'Montant TTC payé (défaut : reste à payer)' }, closepaidinvoices: { type: 'string', enum: ['yes', 'no'] }, comment: { type: 'string' } }, required: ['id', 'datepaye', 'payment_mode_id'] } },
];

export async function handleSupplierInvoiceTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_supplier_invoices': {
      const data = await api.get('/supplierinvoices', { ...paging(args), status: args.status, thirdparty_ids: args.thirdparty_ids, sqlfilters: args.sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_supplier_invoice': {
      const data = await api.get(`/supplierinvoices/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_supplier_invoice': {
      const payload = await withAuthor(api, { ...args, date: toUnix(args.date) }, 'fk_user_author');
      const id = await api.post('/supplierinvoices', payload);
      return `✅ Facture fournisseur créée. ID: ${id}`;
    }
    case 'add_supplier_invoice_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/supplierinvoices/${id}/lines`, line);
      return `✅ Ligne ajoutée à la facture fournisseur #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_supplier_invoice': {
      await api.post(`/supplierinvoices/${args.id}/validate`, { idwarehouse: 0, notrigger: 0 });
      return `✅ Facture fournisseur #${args.id} validée.`;
    }
    case 'pay_supplier_invoice': {
      let amount = args.amount === undefined ? undefined : Number(args.amount);
      if (amount === undefined) {
        const invoice = await api.get<Record<string, unknown>>(`/supplierinvoices/${args.id}`);
        const payments = await api.get<Array<Record<string, unknown>>>(`/supplierinvoices/${args.id}/payments`).catch(() => []);
        const paid = (Array.isArray(payments) ? payments : []).reduce((sum, p) => sum + num(p.amount), 0);
        amount = Math.round((num(invoice.total_ttc) - paid) * 100) / 100;
      }
      if (!(amount > 0)) throw new ApiError('Aucun montant à régler sur cette facture fournisseur.');
      const payId = await api.post(`/supplierinvoices/${args.id}/payments`, {
        datepaye: toUnix(args.datepaye),
        payment_mode_id: args.payment_mode_id,
        accountid: args.accountid,
        amount,
        closepaidinvoices: args.closepaidinvoices ?? 'yes',
        comment: args.comment ?? '',
      });
      return `✅ Paiement de ${money(amount)} enregistré sur la facture fournisseur #${args.id}. ID: ${payId}`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
