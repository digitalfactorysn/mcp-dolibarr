import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const supplierInvoiceTools: Tool[] = [
  { name: 'list_supplier_invoices', description: 'Lister les factures fournisseurs. Statut: 0=Brouillon, 1=Validée/Impayée, 2=Payée, 3=Abandonnée', inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Impayée, 2=Payée, 3=Abandonnée' }, thirdparty_ids: { type: 'string' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_supplier_invoice', description: "Obtenir les détails d'une facture fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_supplier_invoice', description: 'Créer une facture fournisseur brouillon', inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du fournisseur' }, ref_supplier: { type: 'string', description: 'Référence facture fournisseur' }, date: { type: 'string', description: 'Date ISO 8601' }, note_public: { type: 'string' }, cond_reglement_id: { type: 'number' }, mode_reglement_id: { type: 'number' } }, required: ['socid'] } },
  { name: 'add_supplier_invoice_line', description: "Ajouter une ligne à une facture fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' }, desc: { type: 'string' }, subprice: { type: 'number' }, qty: { type: 'number' }, tva_tx: { type: 'number' }, fk_product: { type: 'number' } }, required: ['id', 'subprice', 'qty', 'tva_tx'] } },
  { name: 'validate_supplier_invoice', description: 'Valider une facture fournisseur brouillon', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'pay_supplier_invoice', description: 'Enregistrer un paiement sur une facture fournisseur', inputSchema: { type: 'object', properties: { id: { type: 'number' }, datepaye: { type: 'string' }, payment_mode_id: { type: 'number' }, accountid: { type: 'number' }, amount: { type: 'number' }, comment: { type: 'string' } }, required: ['id', 'datepaye', 'payment_mode_id'] } },
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
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const id = await api.post<number>('/supplierinvoices', { ...args, date, fk_user_author: Number(args.fk_user_author) || 1 });
      const created = await api.get<Record<string, unknown>>(`/supplierinvoices/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!created,
        id,
        ref: created?.ref,
        socid: args.socid,
        supplier_invoice: created || { id, ...args },
      }, null, 2);
    }
    case 'add_supplier_invoice_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/supplierinvoices/${id}/lines`, line);
      const invoice = await api.get<Record<string, unknown>>(`/supplierinvoices/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!invoice,
        invoice_id: id,
        line_id: lineId,
        total_ht: invoice?.total_ht,
        total_ttc: invoice?.total_ttc,
      }, null, 2);
    }
    case 'validate_supplier_invoice': {
      await api.post(`/supplierinvoices/${args.id}/validate`, {});
      const invoice = await api.get<Record<string, unknown>>(`/supplierinvoices/${args.id}`).catch(() => null);
      const isOk = invoice && (String(invoice.statut) === '1' || String(invoice.statut) === '2');
      return JSON.stringify({
        applied: true,
        verified: !!isOk,
        id: args.id,
        ref: invoice?.ref,
        statut: invoice?.statut,
        message: isOk ? `Facture fournisseur #${invoice?.ref || args.id} validée et vérifiée.` : `Validation soumise pour la facture #${args.id}.`,
      }, null, 2);
    }
    case 'pay_supplier_invoice': {
      const datepaye = Math.floor(new Date(args.datepaye as string).getTime() / 1000);
      const invoice = await api.get<Record<string, unknown>>(`/supplierinvoices/${args.id}`);
      const amount = args.amount || (invoice.total_ttc as number);
      const payload = { datepaye, paiementid: args.payment_mode_id, accountid: args.accountid, comment: args.comment || '', amounts: { [args.id as string]: amount } };
      const payId = await api.post('/supplierinvoices/paymentsdistributed', payload);
      const reread = await api.get<Record<string, unknown>>(`/supplierinvoices/${args.id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!reread,
        payment_id: payId,
        invoice_id: args.id,
        amount,
        statut: reread?.statut,
        remaintopay: reread?.remaintopay,
      }, null, 2);
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
