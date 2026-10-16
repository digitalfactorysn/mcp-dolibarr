import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const donationTools: Tool[] = [
  { name: 'list_donations', description: "Lister les dons/donations reçus", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_donation', description: "Obtenir les détails d'un don", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_donation', description: "Enregistrer un don", inputSchema: { type: 'object', properties: { socid: { type: 'number' }, date: { type: 'string' }, amount: { type: 'number' }, public: { type: 'number' }, note_public: { type: 'string' } }, required: ['amount', 'date'] } },
];

// Supprimé: loanTools (501 - pas d'API REST dans Dolibarr 23)
export const loanTools: Tool[] = [];

export async function handleDonationTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_donations': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      return JSON.stringify(await api.get('/donations', { ...paging(args), sqlfilters }), null, 2);
    }
    case 'get_donation': {
      return JSON.stringify(await api.get(`/donations/${args.id}`), null, 2);
    }
    case 'create_donation': {
      const id = await api.post('/donations', { ...args, date: toUnix(args.date) });
      return `✅ Don de ${args.amount} enregistré. ID: ${id}`;
    }
    default: throw new Error(`Outil don inconnu: ${name}`);
  }
}
export async function handleLoanTool(name: string, args: Record<string, unknown>, _api: DolibarrAPI): Promise<string> {
  throw new Error(`Le module Prêts n'a pas d'API REST dans Dolibarr 23. Gérez les prêts depuis l'interface web.`);
}
