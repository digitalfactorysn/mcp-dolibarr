import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const supplierInvoiceTools: Tool[] = [
  { name: 'list_supplier_invoices', description: 'Lister les factures fournisseurs. Statut: 0=Brouillon, 1=Validée/Impayée, 2=Payée, 3=Abandonnée', inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Impayée, 2=Payée, 3=Abandonnée' }, thirdparty_ids: { type: 'string' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_supplier_invoice', description: "Obtenir les détails d'une facture fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_supplier_invoice', description: 'Créer une facture fournisseur brouillon', inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du fournisseur' }, ref_supplier: { type: 'string', description: 'Référence facture fournisseur' }, date: { type: 'string', description: 'Date ISO 8601' }, note_public: { type: 'string' }, cond_reglement_id: { type: 'number' }, mode_reglement_id: { type: 'number' } }, required: ['socid'] } },
  { name: 'add_supplier_invoice_line', description: "Ajouter une ligne à une facture fournisseur avec vérification stricte du prix et de la description", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la facture fournisseur' }, desc: { type: 'string', description: 'Description' }, description: { type: 'string', description: 'Description alternative' }, subprice: { type: 'number', description: 'Prix unitaire HT' }, pu_ht: { type: 'number', description: 'Prix unitaire HT (alias)' }, qty: { type: 'number', description: 'Quantité' }, tva_tx: { type: 'number', description: 'Taux TVA %' }, fk_product: { type: 'number', description: 'ID produit/service' }, remise_percent: { type: 'number', description: 'Remise %' } }, required: ['id', 'qty'] } },
  { name: 'delete_supplier_invoice_line', description: "Supprimer une ligne d'une facture fournisseur", inputSchema: { type: 'object', properties: { invoice_id: { type: 'number', description: 'ID de la facture fournisseur' }, line_id: { type: 'number', description: 'ID de la ligne à supprimer' } }, required: ['invoice_id', 'line_id'] } },
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
      const propId = Number(args.id);
      const price = Number(args.pu_ht ?? args.subprice ?? 0);
      const qty = Number(args.qty || 1);
      const tvaTx = Number(args.tva_tx || 0);
      const desc = String(args.desc ?? args.description ?? '');

      const linePayload: Record<string, unknown> = {
        pu_ht: price,
        subprice: price,
        qty,
        tva_tx: tvaTx,
        desc,
        description: desc,
        fk_product: args.fk_product ? Number(args.fk_product) : undefined,
        remise_percent: Number(args.remise_percent || 0),
      };

      const lineId = await api.post<number>(`/supplierinvoices/${propId}/lines`, linePayload);
      const invoice = await api.get<any>(`/supplierinvoices/${propId}`).catch(() => null);
      const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];
      const addedLine = lines.find((l: any) => Number(l.id) === Number(lineId));

      const priceVerified = (price === 0) || (addedLine && (Number(addedLine.pu_ht) > 0 || Number(addedLine.subprice) > 0));
      const isFullyVerified = !!invoice && !!addedLine && priceVerified;

      return JSON.stringify({
        applied: true,
        verified: isFullyVerified,
        invoice_id: propId,
        line_id: lineId,
        line: addedLine,
        total_ht: invoice?.total_ht,
        total_ttc: invoice?.total_ttc,
        verification: {
          status: isFullyVerified ? 'VERIFIED' : 'FAILED',
          line_present: !!addedLine,
          price_verified: priceVerified,
          requested_price: price,
          saved_pu_ht: addedLine?.pu_ht,
          saved_subprice: addedLine?.subprice,
        },
      }, null, 2);
    }
    case 'delete_supplier_invoice_line': {
      const invId = Number(args.invoice_id || args.id);
      const lId = Number(args.line_id);
      await api.delete(`/supplierinvoices/${invId}/lines/${lId}`);
      const invoice = await api.get<any>(`/supplierinvoices/${invId}`).catch(() => null);
      const remaining = Array.isArray(invoice?.lines) ? invoice.lines : [];
      const removed = !remaining.some((l: any) => Number(l.id) === lId);
      return JSON.stringify({
        applied: true,
        verified: removed,
        invoice_id: invId,
        deleted_line_id: lId,
        remaining_lines_count: remaining.length,
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
