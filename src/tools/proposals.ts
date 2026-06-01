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
    name: 'delete_proposal_line',
    description: 'Supprimer une ligne d\'un devis (brouillon seulement)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        lineid: { type: 'number', description: 'ID de la ligne à supprimer' },
      },
      required: ['id', 'lineid'],
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
  {
    name: 'update_proposal',
    description: 'Modifier un devis existant (dates, conditions, notes)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        date: { type: 'string', description: 'Date du devis ISO 8601' },
        fin_validite: { type: 'string', description: 'Date de fin de validité ISO 8601' },
        note_public: { type: 'string', description: 'Note publique' },
        note_private: { type: 'string', description: 'Note interne' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement' },
        mode_reglement_id: { type: 'number', description: 'ID mode de paiement' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_proposal',
    description: 'Supprimer un devis (doit être en statut brouillon)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_proposal_line',
    description: 'Modifier une ligne d\'un devis (prix, quantité, remise)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        lineid: { type: 'number', description: 'ID de la ligne' },
        desc: { type: 'string', description: 'Description' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        remise_percent: { type: 'number', description: 'Remise %' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'send_proposal_email',
    description: 'Envoyer un devis par email au client',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        to: { type: 'string', description: 'Email destinataire (défaut: email du tiers)' },
        subject: { type: 'string', description: 'Objet de l\'email' },
        message: { type: 'string', description: 'Corps du message' },
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
    case 'update_proposal': {
      const { id, ...rest } = args;
      if (rest.date) rest.date = Math.floor(new Date(rest.date as string).getTime() / 1000);
      if (rest.fin_validite) rest.fin_validite = Math.floor(new Date(rest.fin_validite as string).getTime() / 1000);
      await api.put(`/proposals/${id}`, rest);
      return `✅ Devis #${id} mis à jour.`;
    }
    case 'delete_proposal': {
      await api.delete(`/proposals/${args.id}`);
      return `✅ Devis #${args.id} supprimé.`;
    }
    case 'delete_proposal_line': {
      await api.delete(`/proposals/${args.id}/lines/${args.lineid}`);
      return `✅ Ligne #${args.lineid} supprimée du devis #${args.id}.`;
    }
    case 'update_proposal_line': {
      const { id, lineid, ...rest } = args;
      await api.put(`/proposals/${id}/lines/${lineid}`, rest);
      return `✅ Ligne #${lineid} du devis #${id} mise à jour.`;
    }
    case 'send_proposal_email': {
      const payload = {
        sendto: args.to || '',
        subject: args.subject || '',
        message: args.message || '',
      };
      await api.post(`/proposals/${args.id}/sendbyemail`, payload);
      return `✅ Devis #${args.id} envoyé par email${args.to ? ` à ${args.to}` : ''}.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
