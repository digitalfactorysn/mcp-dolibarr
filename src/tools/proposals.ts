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
      const payload = { ...args, date, fin_validite, user_author_id: Number(args.user_author_id) || 1 };
      delete (payload as Record<string, unknown>).fin_validite;
      const id = await api.post<number>('/proposals', payload);
      const created = await api.get<Record<string, unknown>>(`/proposals/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!created,
        id,
        ref: created?.ref || `(ID #${id})`,
        statut: created?.statut,
        socid: args.socid,
        proposal: created || { id, ...payload },
      }, null, 2);
    }
    case 'add_proposal_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/proposals/${id}/lines`, line);
      const proposal = await api.get<Record<string, unknown>>(`/proposals/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!proposal,
        proposal_id: id,
        line_id: lineId,
        total_ht: proposal?.total_ht,
        total_ttc: proposal?.total_ttc,
        lines_count: Array.isArray(proposal?.lines) ? proposal.lines.length : undefined,
      }, null, 2);
    }
    case 'validate_proposal': {
      const status = args.status || 1;
      await api.post(`/proposals/${args.id}/validate`, { status });
      const validated = await api.get<Record<string, unknown>>(`/proposals/${args.id}`).catch(() => null);
      const isOk = validated && (Number(validated.statut) === Number(status));
      return JSON.stringify({
        applied: true,
        verified: !!isOk,
        id: args.id,
        ref: validated?.ref,
        statut: validated?.statut,
        message: `Devis #${validated?.ref || args.id} validé (statut: ${status === 2 ? 'Signé' : 'Envoyé'}).`,
      }, null, 2);
    }
    case 'close_proposal': {
      const status = args.status || 3;
      await api.post(`/proposals/${args.id}/close`, { status, note: args.note || '' });
      const closed = await api.get<Record<string, unknown>>(`/proposals/${args.id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!closed,
        id: args.id,
        ref: closed?.ref,
        statut: closed?.statut,
        message: `Devis #${closed?.ref || args.id} clôturé (statut: ${status === 4 ? 'Expiré' : 'Refusé'}).`,
      }, null, 2);
    }
    case 'convert_proposal_to_order': {
      await api.post(`/proposals/${args.id}/close`, { status: 2 });
      const orderId = await api.post<number>('/orders', { origin: 'propal', origin_id: args.id });
      const order = await api.get<Record<string, unknown>>(`/orders/${orderId}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!order,
        proposal_id: args.id,
        order_id: orderId,
        order_ref: order?.ref,
        total_ttc: order?.total_ttc,
        details: order,
      }, null, 2);
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
