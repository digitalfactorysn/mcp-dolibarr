import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const proposalTools: Tool[] = [
  {
    name: 'list_proposals',
    description: 'Lister les devis/propositions commerciales. Statut: 0=Brouillon, 1=Validé, 2=Signé, 3=Refusé, 4=Expiré',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max de résultats' },
        page: { type: 'number', description: 'Page de pagination' },
        status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Signé, 3=Refusé, 4=Expiré' },
        sqlfilters: { type: 'string', description: 'Filtre SQL avancé' },
      },
    },
  },
  {
    name: 'get_proposal',
    description: "Obtenir les détails complets d'un devis",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_proposal',
    description: 'Créer un nouveau devis commercial pour un tiers',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du tiers' },
        date: { type: 'string', description: "Date du devis ISO 8601 (ex: '2025-01-31')" },
        fin_validite: { type: 'string', description: "Date de fin de validité ISO 8601" },
        note_public: { type: 'string', description: 'Note visible sur le PDF' },
        note_private: { type: 'string', description: 'Note interne' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement' },
        mode_reglement_id: { type: 'number', description: 'ID mode de paiement' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_proposal_line',
    description: 'Ajouter une ligne de produit ou service à un devis',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        desc: { type: 'string', description: 'Description de la ligne' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        fk_product: { type: 'number', description: 'ID produit catalogue (optionnel)' },
        remise_percent: { type: 'number', description: 'Remise en %' },
      },
      required: ['id', 'subprice', 'qty', 'tva_tx'],
    },
  },
  {
    name: 'validate_proposal',
    description: 'Valider un devis brouillon (le rend visible et envoyable au client)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        status: { type: 'number', description: '1=Validé/Envoyé, 2=Signé. Défaut: 1' },
      },
      required: ['id'],
    },
  },
  {
    name: 'close_proposal',
    description: "Clôturer un devis (marquer comme refusé ou expiré sans conversion)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        status: { type: 'number', description: '3=Refusé, 4=Expiré. Défaut: 3' },
        note: { type: 'string', description: 'Raison de la clôture' },
      },
      required: ['id'],
    },
  },
  {
    name: 'convert_proposal_to_order',
    description: 'Convertir un devis signé en commande client',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis (doit être signé - statut 2)' },
      },
      required: ['id'],
    },
  },
];

export async function handleProposalTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_proposals': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/proposals', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_proposal': {
      const data = await api.get(`/proposals/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_proposal': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const fin_validite = args.fin_validite ? Math.floor(new Date(args.fin_validite as string).getTime() / 1000) : null;
      const payload = { ...args, date, fin_validite };
      delete (payload as Record<string, unknown>).fin_validite;
      const id = await api.post('/proposals', payload);
      return `✅ Devis créé avec succès. ID: ${id}\nProchaine étape: Ajoutez des lignes avec 'add_proposal_line', puis validez avec 'validate_proposal'.`;
    }
    case 'add_proposal_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/proposals/${id}/lines`, line);
      return `✅ Ligne ajoutée au devis #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_proposal': {
      const status = args.status || 1;
      await api.post(`/proposals/${args.id}/validate`, { status });
      return `✅ Devis #${args.id} validé (statut: ${status === 2 ? 'Signé' : 'Envoyé'}).`;
    }
    case 'close_proposal': {
      const status = args.status || 3;
      await api.post(`/proposals/${args.id}/close`, { status, note: args.note || '' });
      return `✅ Devis #${args.id} clôturé (statut: ${status === 4 ? 'Expiré' : 'Refusé'}).`;
    }
    case 'convert_proposal_to_order': {
      const data = await api.post(`/proposals/${args.id}/close`, { status: 2 });
      // Then create order from proposal
      const orderId = await api.post('/orders', { origin: 'propal', origin_id: args.id });
      return `✅ Devis #${args.id} converti en commande client. ID commande: ${orderId}`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
