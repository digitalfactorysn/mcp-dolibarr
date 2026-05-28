import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const donationTools: Tool[] = [
  { name: 'list_donations', description: "Lister les dons/donations reçus", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Payé, 3=Annulé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_donation', description: "Obtenir les détails d'un don", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_donation', description: "Enregistrer un don/donation", inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du donateur (tiers)' }, date: { type: 'string', description: 'Date du don ISO 8601' }, amount: { type: 'number', description: 'Montant du don' }, public: { type: 'number', description: '1=Don public, 0=Privé' }, fk_project: { type: 'number', description: 'ID projet associé' }, note_public: { type: 'string' } }, required: ['amount', 'date'] } },
];

export const loanTools: Tool[] = [
  { name: 'list_loans', description: "Lister les prêts/emprunts", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=En cours, 2=Clôturé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_loan', description: "Obtenir les détails d'un prêt avec le tableau d'amortissement", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_loan', description: "Enregistrer un prêt/emprunt bancaire", inputSchema: { type: 'object', properties: { label: { type: 'string', description: "Libellé du prêt (ex: 'Prêt BNP 2025')" }, capital: { type: 'number', description: 'Montant emprunté (capital)' }, datestart: { type: 'string', description: 'Date de début ISO 8601' }, dateend: { type: 'string', description: 'Date de fin ISO 8601' }, nbterm: { type: 'number', description: "Nombre d'échéances" }, rate: { type: 'number', description: 'Taux annuel en % (ex: 5.5)' }, fk_account: { type: 'number', description: 'ID compte bancaire' }, note: { type: 'string' } }, required: ['label', 'capital', 'datestart', 'dateend', 'nbterm', 'rate'] } },
  { name: 'get_loan_schedule', description: "Obtenir le tableau d'amortissement d'un prêt", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du prêt' } }, required: ['id'] } },
];

export async function handleDonationTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_donations': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/donations', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_donation': {
      const data = await api.get(`/donations/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_donation': {
      const date = Math.floor(new Date(args.date as string).getTime() / 1000);
      const id = await api.post('/donations', { ...args, date });
      return `✅ Don de ${args.amount} FCFA enregistré. ID: ${id}`;
    }
    default: throw new Error(`Outil don inconnu: ${name}`);
  }
}

export async function handleLoanTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_loans': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/loans', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_loan': {
      const data = await api.get(`/loans/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_loan': {
      const datestart = Math.floor(new Date(args.datestart as string).getTime() / 1000);
      const dateend = Math.floor(new Date(args.dateend as string).getTime() / 1000);
      const id = await api.post('/loans', { ...args, datestart, dateend });
      return `✅ Prêt "${args.label}" enregistré. Capital: ${args.capital} FCFA. ID: ${id}`;
    }
    case 'get_loan_schedule': {
      const data = await api.get(`/loans/${args.id}/schedule`);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil prêt inconnu: ${name}`);
  }
}
