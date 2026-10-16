import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix, withAuthor } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const proposalTools: Tool[] = [
  {
    name: 'list_proposals',
    description: 'Lister les devis/propositions commerciales. Statut : 0=Brouillon, 1=Validé (ouvert), 2=Signé, 3=Non signé (refusé), 4=Facturé',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max de résultats' },
        page: { type: 'number', description: 'Page de pagination' },
        status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Signé, 3=Non signé, 4=Facturé' },
        thirdparty_ids: { type: 'string', description: 'ID(s) tiers, séparés par virgule' },
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
      },
      required: ['id'],
    },
  },
  {
    name: 'close_proposal',
    description: "Clôturer un devis validé : signé/accepté (2) ou refusé (3)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        status: { type: 'number', enum: [2, 3], description: '2=Signé/accepté, 3=Refusé' },
        note: { type: 'string', description: 'Raison de la clôture (note privée)' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'convert_proposal_to_order',
    description: 'Convertir un devis signé en commande client',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis (validé ou signé)' },
      },
      required: ['id'],
    },
  },
];

export async function handleProposalTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_proposals': {
      // Dolibarr n'a pas de paramètre « status » sur /proposals : on filtre via USF (fk_statut).
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/proposals', { ...paging(args), thirdparty_ids: args.thirdparty_ids, sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_proposal': {
      const data = await api.get(`/proposals/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_proposal': {
      const { fin_validite, ...rest } = args;
      const payload = await withAuthor(
        api,
        { ...rest, date: toUnix(args.date), ...(fin_validite ? { fin_validite: toUnix(fin_validite) } : {}) },
        'user_author_id',
      );
      const id = await api.post('/proposals', payload);
      return `✅ Devis créé avec succès. ID: ${id}\nProchaine étape: Ajoutez des lignes avec 'add_proposal_line', puis validez avec 'validate_proposal'.`;
    }
    case 'add_proposal_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/proposals/${id}/lines`, line);
      return `✅ Ligne ajoutée au devis #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_proposal': {
      await api.post(`/proposals/${args.id}/validate`, { notrigger: 0 });
      return `✅ Devis #${args.id} validé (statut : ouvert / à envoyer).`;
    }
    case 'close_proposal': {
      const status = Number(args.status);
      await api.post(`/proposals/${args.id}/close`, {
        status,
        note_private: args.note ?? '',
        notrigger: 0,
      });
      return `✅ Devis #${args.id} clôturé (statut : ${status === 2 ? 'signé / accepté' : 'refusé'}).`;
    }
    case 'convert_proposal_to_order': {
      // Dolibarr crée la commande à partir d'un devis validé ou signé.
      const orderId = await api.post(`/orders/createfromproposal/${args.id}`);
      return `✅ Commande client créée à partir du devis #${args.id}. ID commande: ${orderId}`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
