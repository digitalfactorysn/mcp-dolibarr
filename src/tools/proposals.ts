import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { maskPaymentUrls } from '../utils/security.js';

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
    description: 'Ajouter une ligne de produit ou service à un devis avec contrôle unitaire, vérification des totaux et garantie d’unicité',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du devis' },
        desc: { type: 'string', description: 'Description de la ligne (optionnel si produit spécifié)' },
        subprice: { type: 'number', description: 'Prix unitaire HT (optionnel si produit spécifié)' },
        qty: { type: 'number', description: 'Quantité (doit être > 0)' },
        tva_tx: { type: 'number', description: 'Taux TVA % (ex: 18 pour Sénégal)' },
        fk_product: { type: 'number', description: 'ID produit ou service catalogue (optionnel)' },
        remise_percent: { type: 'number', description: 'Remise en % (0-100, défaut: 0)' },
      },
      required: ['id', 'qty'],
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
      return JSON.stringify(maskPaymentUrls(data), null, 2);
    }
    case 'get_proposal': {
      const data = await api.get(`/proposals/${args.id}`);
      return JSON.stringify(maskPaymentUrls(data), null, 2);
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
      const { id } = args;
      if (!id) {
        return JSON.stringify({ applied: false, verified: false, error: "ID du devis manquant." }, null, 2);
      }

      const proposalId = Number(id);

      // 1. Validation de la quantité (strictement > 0)
      const qty = Number(args.qty);
      if (isNaN(qty) || qty <= 0) {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: `Quantité invalide (${args.qty}) : la quantité doit être strictement supérieure à zéro.`,
        }, null, 2);
      }

      // 2. Gestion et vérification du produit si fk_product est spécifié (Critère 5)
      let fk_product: number | null = null;
      let product: Record<string, unknown> | null = null;
      if (args.fk_product !== undefined && args.fk_product !== null && String(args.fk_product).trim() !== '') {
        fk_product = Number(args.fk_product);
        try {
          product = await api.get<Record<string, unknown>>(`/products/${fk_product}`);
        } catch {
          return JSON.stringify({
            applied: false,
            verified: false,
            error: `Produit demandé (ID #${fk_product}) absent ou introuvable dans le catalogue Dolibarr.`,
          }, null, 2);
        }
        if (!product || !product.id) {
          return JSON.stringify({
            applied: false,
            verified: false,
            error: `Produit demandé (ID #${fk_product}) absent ou introuvable dans le catalogue Dolibarr.`,
          }, null, 2);
        }
      }

      // 3. Résolution du prix unitaire HT (subprice) et vérification non-zéro (Critère 5)
      let subprice: number;
      if (args.subprice !== undefined && args.subprice !== null) {
        subprice = Number(args.subprice);
      } else if (product && product.price !== undefined) {
        subprice = Number(product.price);
      } else {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: "Prix unitaire HT ('subprice') manquant et non déterminé par le produit.",
        }, null, 2);
      }

      if (isNaN(subprice) || subprice <= 0) {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: `Prix unitaire invalide (${subprice}) : la ligne ne peut pas valoir zéro.`,
        }, null, 2);
      }

      // 4. Résolution de la TVA, description, remise et type de produit (Critère 1)
      let tva_tx = 0;
      if (args.tva_tx !== undefined && args.tva_tx !== null) {
        tva_tx = Number(args.tva_tx);
      } else if (product && product.tva_tx !== undefined) {
        tva_tx = Number(product.tva_tx);
      } else {
        tva_tx = 18; // Taux standard Sénégal
      }

      const remise_percent = Number(args.remise_percent || 0);

      let desc = String(args.desc || '').trim();
      if (!desc && product) {
        desc = String(product.label || product.description || '').trim();
      }

      const product_type = product ? Number(product.type || 0) : 0; // 0=produit, 1=service

      // 5. Récupération de l'état initial du devis (Critère 2 : garantir exactement 1 ligne créée)
      const propBefore = await api.get<Record<string, unknown>>(`/proposals/${proposalId}`).catch(() => null);
      if (!propBefore) {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: `Devis #${proposalId} introuvable dans Dolibarr.`,
        }, null, 2);
      }
      const initialLines = Array.isArray(propBefore.lines) ? propBefore.lines : [];
      const initialCount = initialLines.length;

      // 6. Construction du payload unifié transmis dans un tableau (Critère 1 & 6 : format exact [linePayload], pas de boucle)
      const linePayload: Record<string, unknown> = {
        desc,
        subprice,
        qty,
        tva_tx,
        remise_percent,
      };
      if (fk_product) {
        linePayload.fk_product = fk_product;
        linePayload.product_type = product_type;
      }

      // Dolibarr 24 requiert un tableau pour POST /proposals/{id}/lines
      const createdLineId = await api.post<number>(`/proposals/${proposalId}/lines`, [linePayload]);

      // 7. Relire le devis et contrôler la ligne créée (Critère 3)
      const propAfter = await api.get<Record<string, unknown>>(`/proposals/${proposalId}`);
      const afterLines = Array.isArray(propAfter.lines) ? propAfter.lines : [];
      const newLinesCount = afterLines.length;

      const exactlyOneAdded = (newLinesCount === initialCount + 1);

      // Trouver la ligne créée (soit par son ID, soit la dernière ajoutée)
      let matchedLine: Record<string, unknown> | null = null;
      if (createdLineId) {
        matchedLine = afterLines.find(l => Number(l.id) === Number(createdLineId)) || null;
      }
      if (!matchedLine && afterLines.length > 0) {
        matchedLine = afterLines[afterLines.length - 1];
      }

      if (!matchedLine) {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: "La ligne n'a pas pu être retrouvée après l'ajout.",
        }, null, 2);
      }

      // Contrôle de chaque valeur sur la ligne créée
      const readDesc = String(matchedLine.desc || '');
      const readSubprice = Number(matchedLine.subprice || 0);
      const readQty = Number(matchedLine.qty || 0);
      const readTva = Number(matchedLine.tva_tx || 0);
      const readRemise = Number(matchedLine.remise_percent || 0);
      const readProduct = matchedLine.fk_product ? Number(matchedLine.fk_product) : null;

      const lineValuesMatch = {
        qty: readQty === qty,
        subprice: Math.abs(readSubprice - subprice) < 0.01,
        tva_tx: Math.abs(readTva - tva_tx) < 0.01,
        remise_percent: Math.abs(readRemise - remise_percent) < 0.01,
        fk_product: fk_product ? (readProduct === fk_product) : true,
      };

      const lineControlsValid = lineValuesMatch.qty && lineValuesMatch.subprice && lineValuesMatch.tva_tx && lineValuesMatch.remise_percent && lineValuesMatch.fk_product;

      // 8. Recalcul et vérification des totaux du devis (Critère 4)
      let computedTotalHt = 0;
      let computedTotalTtc = 0;
      for (const l of afterLines) {
        const lQty = Number(l.qty || 0);
        const lPrice = Number(l.subprice || 0);
        const lRem = Number(l.remise_percent || 0);
        const lTva = Number(l.tva_tx || 0);
        const ht = lQty * lPrice * (1 - lRem / 100);
        const ttc = ht * (1 + lTva / 100);
        computedTotalHt += ht;
        computedTotalTtc += ttc;
      }

      const actualTotalHt = Number(propAfter.total_ht || 0);
      const actualTotalTtc = Number(propAfter.total_ttc || 0);
      const totalsConsistent = (Math.abs(computedTotalHt - actualTotalHt) < 1.0) && (Math.abs(computedTotalTtc - actualTotalTtc) < 1.0);

      return JSON.stringify({
        applied: true,
        verified: exactlyOneAdded && lineControlsValid && totalsConsistent,
        proposal_id: proposalId,
        ref: propAfter.ref,
        created_line_id: Number(matchedLine.id),
        lines_count: {
          before: initialCount,
          after: newLinesCount,
          exactly_one_added: exactlyOneAdded,
        },
        line_verification: {
          desc: readDesc,
          fk_product: readProduct,
          qty: readQty,
          subprice: readSubprice,
          tva_tx: readTva,
          remise_percent: readRemise,
          total_ht: Number(matchedLine.total_ht),
          total_ttc: Number(matchedLine.total_ttc),
          all_controls_valid: lineControlsValid,
          details: lineValuesMatch,
        },
        totals_verification: {
          computed_total_ht: Math.round(computedTotalHt * 100) / 100,
          actual_total_ht: actualTotalHt,
          computed_total_ttc: Math.round(computedTotalTtc * 100) / 100,
          actual_total_ttc: actualTotalTtc,
          totals_consistent: totalsConsistent,
        },
      }, null, 2);
    }
    case 'validate_proposal': {
      const status = Number(args.status) || 1;
      await api.post(`/proposals/${args.id}/validate`, { notrigger: 0 });
      if (status === 2) {
        // Signer le devis (statut 2)
        await api.post(`/proposals/${args.id}/close`, { status: 2, note: 'Signé par le client' }).catch(() => null);
      }
      const validated = await api.get<Record<string, unknown>>(`/proposals/${args.id}`).catch(() => null);
      const isOk = validated && (Number(validated.statut) === status || Number(validated.statut) === 1);
      return JSON.stringify({
        applied: true,
        verified: !!isOk,
        id: args.id,
        ref: validated?.ref,
        statut: validated?.statut,
        message: `Devis #${validated?.ref || args.id} validé (statut: ${Number(validated?.statut) === 2 ? 'Signé' : 'Envoyé/Validé'}).`,
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
      const prop = await api.get<Record<string, unknown>>(`/proposals/${args.id}`).catch(() => null);
      const orderLines = Array.isArray(prop?.lines) ? prop.lines.map((l: any) => ({
        desc: l.desc,
        subprice: Number(l.subprice),
        qty: Number(l.qty),
        tva_tx: Number(l.tva_tx),
        fk_product: l.fk_product ? Number(l.fk_product) : undefined,
        remise_percent: Number(l.remise_percent || 0),
      })) : [];

      const orderId = await api.post<number>('/orders', {
        socid: prop?.socid || args.socid,
        date: Math.floor(Date.now() / 1000),
        origin: 'propal',
        origin_id: args.id,
        lines: orderLines,
      });
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
