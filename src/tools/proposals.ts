import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { addFilter, toTimestamp } from '../validation.js';

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
    description: 'Valider un devis brouillon (le rend officiel et envoyable au client). Pour le marquer signé, utiliser close_proposal avec status=2.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
      },
      required: ['id'],
    },
  },
  {
    name: 'close_proposal',
    description: "Clôturer un devis validé : signé (accepté) ou refusé",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        status: { type: 'number', description: '2=Signé, 3=Refusé. Défaut: 3' },
        note: { type: 'string', description: 'Raison de la clôture (ajoutée à la note privée)' },
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
      if (args.status !== undefined) addFilter(params, `(t.fk_statut:=:${Number(args.status)})`);
      if (args.sqlfilters) addFilter(params, args.sqlfilters);
      const data = await api.get('/proposals', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_proposal': {
      const data = await api.get(`/proposals/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_proposal': {
      const payload: Record<string, unknown> = { ...args, date: args.date ? toTimestamp(args.date) : Math.floor(Date.now() / 1000) };
      if (args.fin_validite) payload.fin_validite = toTimestamp(args.fin_validite, 'fin_validite');
      const id = await api.post('/proposals', payload);
      return `✅ Devis créé avec succès. ID: ${id}\nProchaine étape: Ajoutez des lignes avec 'add_proposal_line', puis validez avec 'validate_proposal'.`;
    }
    case 'add_proposal_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/proposals/${id}/lines`, line);
      return `✅ Ligne ajoutée au devis #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_proposal': {
      await api.post(`/proposals/${args.id}/validate`, {});
      return `✅ Devis #${args.id} validé.`;
    }
    case 'close_proposal': {
      const status = args.status ?? 3;
      if (status !== 2 && status !== 3) throw new Error('status doit valoir 2 (signé) ou 3 (refusé).');
      await api.post(`/proposals/${args.id}/close`, { status, note_private: args.note || '' });
      return `✅ Devis #${args.id} clôturé (statut: ${status === 2 ? 'Signé' : 'Refusé'}).`;
    }
    case 'convert_proposal_to_order': {
      const proposal = await api.get<Record<string, unknown>>(`/proposals/${args.id}`);
      if (Number(proposal.statut ?? proposal.status) !== 2) {
        throw new Error(`Le devis #${args.id} n'est pas signé. Clôturez-le d'abord avec close_proposal (status=2).`);
      }
      const orderId = await api.post(`/orders/createfromproposal/${args.id}`, {});
      return `✅ Devis #${args.id} converti en commande client. ID commande: ${orderId}`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
