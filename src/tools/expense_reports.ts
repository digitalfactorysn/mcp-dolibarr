import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const expenseReportTools: Tool[] = [
  { name: 'list_expense_reports', description: "Lister les notes de frais. Statut: 0=Brouillon, 2=Validée, 4=Approuvée, 5=Payée, 6=Refusée, 99=Annulée", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number' }, user_id: { type: 'number', description: 'Filtrer par employé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_expense_report', description: "Obtenir les détails d'une note de frais (lignes, montants, statut)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_expense_report', description: "Créer une note de frais", inputSchema: { type: 'object', properties: { fk_user_author: { type: 'number', description: 'ID utilisateur (employé)' }, date_debut: { type: 'string', description: 'Date début période ISO 8601' }, date_fin: { type: 'string', description: 'Date fin période ISO 8601' }, note_public: { type: 'string', description: 'Objet de la note de frais' }, fk_project: { type: 'number', description: 'ID projet associé (optionnel)' } }, required: ['fk_user_author', 'date_debut', 'date_fin'] } },
  { name: 'add_expense_report_line', description: "Ajouter une ligne de dépense à une note de frais brouillon", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la note de frais' }, fk_c_type_fees: { type: 'number', description: "ID du type de frais (utiliser list_expense_fee_types pour les IDs réels de l'instance)" }, date: { type: 'string', description: 'Date de la dépense ISO 8601' }, comments: { type: 'string', description: 'Description de la dépense' }, value_unit: { type: 'number', description: 'Montant unitaire HT' }, qty: { type: 'number', description: 'Quantité (défaut: 1)' }, vatrate: { type: 'number', description: 'Taux TVA % (ex: 20)' }, fk_project: { type: 'number' } }, required: ['id', 'fk_c_type_fees', 'date', 'value_unit', 'vatrate'] } },
  { name: 'update_expense_report_line', description: "Modifier une ligne existante d'une note de frais (brouillon seulement)", inputSchema: { type: 'object', properties: { expense_id: { type: 'number', description: 'ID de la note de frais' }, line_id: { type: 'number', description: 'ID de la ligne à modifier' }, fk_c_type_fees: { type: 'number', description: 'ID du type de frais' }, date: { type: 'string', description: 'Nouvelle date ISO 8601' }, comments: { type: 'string' }, value_unit: { type: 'number' }, qty: { type: 'number' }, vatrate: { type: 'number' }, fk_project: { type: 'number' } }, required: ['expense_id', 'line_id'] } },
  { name: 'delete_expense_report_line', description: "Supprimer une ligne d'une note de frais brouillon", inputSchema: { type: 'object', properties: { expense_id: { type: 'number', description: 'ID de la note de frais' }, line_id: { type: 'number', description: 'ID de la ligne à supprimer' } }, required: ['expense_id', 'line_id'] } },
  { name: 'list_expense_fee_types', description: "Lister les types de frais disponibles (dictionnaire) avec leurs IDs, pour renseigner fk_c_type_fees", inputSchema: { type: 'object', properties: {} } },
  { name: 'validate_expense_report', description: "Valider une note de frais (la soumettre pour approbation)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'approve_expense_report', description: "Approuver une note de frais validée", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'refuse_expense_report', description: "Refuser une note de frais", inputSchema: { type: 'object', properties: { id: { type: 'number' }, detail: { type: 'string', description: 'Motif du refus' } }, required: ['id'] } },
  { name: 'pay_expense_report', description: "Enregistrer le paiement d'une note de frais approuvée puis la marquer payée", inputSchema: { type: 'object', properties: { id: { type: 'number' }, fk_typepayment: { type: 'number', description: 'ID du mode de paiement (utiliser list_payment_methods)' }, date_paye: { type: 'string', description: 'Date de paiement ISO 8601' }, amount: { type: 'number', description: 'Montant payé (si omis: montant total TTC de la note)' }, accountid: { type: 'number', description: 'ID compte bancaire (utiliser list_bank_accounts)' } }, required: ['id', 'fk_typepayment', 'accountid'] } },
];

export async function handleExpenseReportTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_expense_reports': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.user_id) params.user_ids = args.user_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return JSON.stringify(await api.get('/expensereports', params), null, 2);
    }
    case 'get_expense_report':
      return JSON.stringify(await api.get(`/expensereports/${args.id}`), null, 2);
    case 'create_expense_report': {
      const payload = { ...args,
        date_debut: Math.floor(new Date(args.date_debut as string).getTime() / 1000),
        date_fin: Math.floor(new Date(args.date_fin as string).getTime() / 1000),
      };
      const id = await api.post('/expensereports', payload);
      return `✅ Note de frais créée. ID: ${id}\nPériode: ${args.date_debut} → ${args.date_fin}`;
    }
    case 'add_expense_report_line': {
      const { id, ...line } = args;
      line.date = Math.floor(new Date(line.date as string).getTime() / 1000);
      if (!line.qty) line.qty = 1;
      // Route réelle Dolibarr: POST {id}/line (singulier), pas /lines.
      const lineId = await api.post(`/expensereports/${id}/line`, line);
      return `✅ Dépense de ${args.value_unit} ajoutée à la note #${id}. ID ligne: ${lineId}`;
    }
    case 'update_expense_report_line': {
      const { expense_id, line_id, ...line } = args;
      if (line.date) line.date = Math.floor(new Date(line.date as string).getTime() / 1000);
      await api.put(`/expensereports/${expense_id}/lines/${line_id}`, line);
      return `✅ Ligne #${line_id} de la note de frais #${expense_id} mise à jour.`;
    }
    case 'delete_expense_report_line': {
      await api.delete(`/expensereports/${args.expense_id}/lines/${args.line_id}`);
      return `✅ Ligne #${args.line_id} supprimée de la note de frais #${args.expense_id}.`;
    }
    case 'list_expense_fee_types': {
      const data = await api.get('/setup/dictionary/expensereport_types');
      return JSON.stringify(data, null, 2);
    }
    case 'validate_expense_report':
      await api.post(`/expensereports/${args.id}/validate`, {});
      return `✅ Note de frais #${args.id} soumise pour validation.`;
    case 'approve_expense_report':
      await api.post(`/expensereports/${args.id}/approve`, {});
      return `✅ Note de frais #${args.id} approuvée.`;
    case 'refuse_expense_report':
      // Route réelle Dolibarr: POST {id}/deny avec champ "details" (pas /refuse ni "detail").
      await api.post(`/expensereports/${args.id}/deny`, { details: args.detail || '' });
      return `✅ Note de frais #${args.id} refusée.`;
    case 'pay_expense_report': {
      const expense = await api.get<Record<string, unknown>>(`/expensereports/${args.id}`);
      const amount = args.amount || (expense.total_ttc as number);
      const datep = args.date_paye ? Math.floor(new Date(args.date_paye as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const paymentPayload = {
        fk_typepayment: args.fk_typepayment,
        datep,
        amounts: { [args.id as string]: amount },
        accountid: args.accountid,
      };
      const paymentId = await api.post(`/expensereports/${args.id}/payments`, paymentPayload);
      await api.post(`/expensereports/${args.id}/setpaid`, {});
      return `✅ Paiement de ${amount} enregistré (ID ${paymentId}) et note de frais #${args.id} marquée payée.`;
    }
    default: throw new Error(`Outil NDF inconnu: ${name}`);
  }
}
