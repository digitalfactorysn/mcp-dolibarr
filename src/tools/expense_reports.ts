import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix, withAuthor } from '../api.js';
import { andFilters, eqNum, paging, num } from './_util.js';

export const expenseReportTools: Tool[] = [
  { name: 'list_expense_reports', description: "Lister les notes de frais. Statut : 0=Brouillon, 2=Validée, 4=Approuvée, 5=Payée, 6=Refusée, 99=Annulée", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number' }, user_id: { type: 'number', description: 'Filtrer par employé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_expense_report', description: "Obtenir les détails d'une note de frais (lignes, montants, statut)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_expense_report', description: "Créer une note de frais", inputSchema: { type: 'object', properties: { fk_user_author: { type: 'number', description: 'ID utilisateur (employé)' }, date_debut: { type: 'string', description: 'Date début période ISO 8601' }, date_fin: { type: 'string', description: 'Date fin période ISO 8601' }, note_public: { type: 'string', description: 'Objet de la note de frais' }, fk_project: { type: 'number', description: 'ID projet associé (optionnel)' } }, required: ['fk_user_author', 'date_debut', 'date_fin'] } },
  { name: 'add_expense_report_line', description: "Ajouter une ligne de dépense à une note de frais", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la note de frais' }, fk_c_type_fees: { type: 'number', description: "ID du type de frais (list_dictionary → expensereport_types)" }, date: { type: 'string', description: 'Date de la dépense ISO 8601' }, comments: { type: 'string', description: 'Description de la dépense' }, value_unit: { type: 'number', description: 'Montant unitaire HT' }, qty: { type: 'number', description: 'Quantité (défaut: 1)' }, vatrate: { type: 'number', description: 'Taux TVA % (ex: 20)' }, fk_project: { type: 'number' } }, required: ['id', 'fk_c_type_fees', 'date', 'value_unit', 'vatrate'] } },
  { name: 'validate_expense_report', description: "Valider une note de frais (la soumettre pour approbation)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'approve_expense_report', description: "Approuver une note de frais validée", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'refuse_expense_report', description: "Refuser une note de frais", inputSchema: { type: 'object', properties: { id: { type: 'number' }, detail: { type: 'string', description: 'Motif du refus' } }, required: ['id'] } },
  { name: 'pay_expense_report', description: "Enregistrer le paiement d'une note de frais approuvée", inputSchema: { type: 'object', properties: { id: { type: 'number' }, mode_reglement_id: { type: 'number', description: 'ID du mode de paiement' }, date_paye: { type: 'string', description: 'Date de paiement ISO 8601' }, fk_account: { type: 'number', description: 'ID compte bancaire' }, amount: { type: 'number', description: 'Montant payé (défaut : total TTC de la note)' } }, required: ['id', 'mode_reglement_id', 'fk_account'] } },
];

export async function handleExpenseReportTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_expense_reports': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      return JSON.stringify(await api.get('/expensereports', { ...paging(args), user_ids: args.user_id === undefined ? undefined : String(args.user_id), sqlfilters }), null, 2);
    }
    case 'get_expense_report':
      return JSON.stringify(await api.get(`/expensereports/${args.id}`), null, 2);
    case 'create_expense_report': {
      const payload = await withAuthor(api, { ...args, date_debut: toUnix(args.date_debut), date_fin: toUnix(args.date_fin) }, 'fk_user_author');
      const id = await api.post('/expensereports', payload);
      return `✅ Note de frais créée. ID: ${id}\nPériode: ${args.date_debut} → ${args.date_fin}`;
    }
    case 'add_expense_report_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/expensereports/${id}/line`, { ...line, date: toUnix(line.date), qty: line.qty ?? 1 });
      return `✅ Dépense de ${args.value_unit} ajoutée à la note #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_expense_report':
      await api.post(`/expensereports/${args.id}/validate`, { notrigger: 0 });
      return `✅ Note de frais #${args.id} soumise pour validation.`;
    case 'approve_expense_report':
      await api.post(`/expensereports/${args.id}/approve`, { notrigger: 0 });
      return `✅ Note de frais #${args.id} approuvée.`;
    case 'refuse_expense_report':
      await api.post(`/expensereports/${args.id}/deny`, { details: args.detail ?? '', notrigger: 0 });
      return `✅ Note de frais #${args.id} refusée.`;
    case 'pay_expense_report': {
      let amount = args.amount === undefined ? undefined : Number(args.amount);
      if (amount === undefined) {
        const report = await api.get<Record<string, unknown>>(`/expensereports/${args.id}`);
        amount = num(report.total_ttc);
      }
      const payId = await api.post(`/expensereports/${args.id}/payments`, {
        fk_typepayment: args.mode_reglement_id,
        datep: toUnix(args.date_paye),
        amounts: { [String(args.id)]: amount },
        accountid: args.fk_account,
      });
      return `✅ Paiement de ${amount} enregistré sur la note de frais #${args.id}. ID paiement: ${payId}`;
    }
    default: throw new Error(`Outil NDF inconnu: ${name}`);
  }
}
