import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { addFilter, toTimestamp } from '../validation.js';

export const expenseReportTools: Tool[] = [
  { name: 'list_expense_reports', description: "Lister les notes de frais. Statut: 0=Brouillon, 2=Validée, 4=Approuvée, 5=Payée, 6=Refusée, 99=Annulée", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number' }, user_id: { type: 'number', description: 'Filtrer par employé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_expense_report', description: "Obtenir les détails d'une note de frais (lignes, montants, statut)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_expense_report', description: "Créer une note de frais", inputSchema: { type: 'object', properties: { fk_user_author: { type: 'number', description: 'ID utilisateur (employé)' }, date_debut: { type: 'string', description: 'Date début période ISO 8601' }, date_fin: { type: 'string', description: 'Date fin période ISO 8601' }, note_public: { type: 'string', description: 'Objet de la note de frais' }, fk_project: { type: 'number', description: 'ID projet associé (optionnel)' } }, required: ['fk_user_author', 'date_debut', 'date_fin'] } },
  { name: 'add_expense_report_line', description: "Ajouter une ligne de dépense à une note de frais", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la note de frais' }, fk_c_type_fees: { type: 'number', description: "Type de frais: 1=Repas, 2=Hébergement, 3=Transport, 4=Carburant, 5=Téléphone, 6=Divers" }, date: { type: 'string', description: 'Date de la dépense ISO 8601' }, comments: { type: 'string', description: 'Description de la dépense' }, value_unit: { type: 'number', description: 'Montant unitaire HT' }, qty: { type: 'number', description: 'Quantité (défaut: 1)' }, vatrate: { type: 'number', description: 'Taux TVA % (ex: 18)' }, fk_project: { type: 'number' } }, required: ['id', 'fk_c_type_fees', 'date', 'value_unit'] } },
  { name: 'validate_expense_report', description: "Valider une note de frais (la soumettre pour approbation)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'approve_expense_report', description: "Approuver une note de frais validée", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'refuse_expense_report', description: "Refuser une note de frais", inputSchema: { type: 'object', properties: { id: { type: 'number' }, detail: { type: 'string', description: 'Motif du refus' } }, required: ['id'] } },
  { name: 'pay_expense_report', description: "Enregistrer le paiement d'une note de frais approuvée", inputSchema: { type: 'object', properties: { id: { type: 'number' }, mode_reglement_id: { type: 'number', description: 'ID mode de paiement (list_payment_methods)' }, date_paye: { type: 'string', description: 'Date de paiement ISO 8601' }, fk_account: { type: 'number', description: 'ID compte bancaire (list_bank_accounts)' }, amount: { type: 'number', description: 'Montant (si vide : total TTC de la note)' } }, required: ['id', 'mode_reglement_id', 'fk_account'] } },
];

export async function handleExpenseReportTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_expense_reports': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) addFilter(params, `(t.fk_statut:=:${Number(args.status)})`);
      if (args.user_id) params.user_ids = args.user_id;
      if (args.sqlfilters) addFilter(params, args.sqlfilters);
      return JSON.stringify(await api.get('/expensereports', params), null, 2);
    }
    case 'get_expense_report':
      return JSON.stringify(await api.get(`/expensereports/${args.id}`), null, 2);
    case 'create_expense_report': {
      const payload = { ...args,
        date_debut: toTimestamp(args.date_debut, 'date_debut'),
        date_fin: toTimestamp(args.date_fin, 'date_fin'),
      };
      const id = await api.post('/expensereports', payload);
      return `✅ Note de frais créée. ID: ${id}\nPériode: ${args.date_debut} → ${args.date_fin}`;
    }
    case 'add_expense_report_line': {
      const { id, ...line } = args;
      line.date = toTimestamp(line.date);
      if (!line.qty) line.qty = 1;
      const lineId = await api.post(`/expensereports/${id}/line`, line);
      return `✅ Dépense de ${args.value_unit} ajoutée à la note #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_expense_report':
      await api.post(`/expensereports/${args.id}/validate`, {});
      return `✅ Note de frais #${args.id} soumise pour validation.`;
    case 'approve_expense_report':
      await api.post(`/expensereports/${args.id}/approve`, {});
      return `✅ Note de frais #${args.id} approuvée.`;
    case 'refuse_expense_report':
      await api.post(`/expensereports/${args.id}/deny`, { details: args.detail || '' });
      return `✅ Note de frais #${args.id} refusée.`;
    case 'pay_expense_report': {
      const report = await api.get<Record<string, unknown>>(`/expensereports/${args.id}`);
      const amount = args.amount ?? Number(report.total_ttc || 0);
      const payload = {
        fk_typepayment: args.mode_reglement_id,
        datep: args.date_paye ? toTimestamp(args.date_paye, 'date_paye') : Math.floor(Date.now() / 1000),
        accountid: args.fk_account,
        // Dolibarr ventile le paiement par utilisateur (auteur de la note)
        amounts: { [String(report.fk_user_author)]: amount },
      };
      const paymentId = await api.post(`/expensereports/${args.id}/payments`, payload);
      return `✅ Paiement de ${amount} enregistré sur la note de frais #${args.id}. ID paiement: ${paymentId}`;
    }
    default: throw new Error(`Outil NDF inconnu: ${name}`);
  }
}
