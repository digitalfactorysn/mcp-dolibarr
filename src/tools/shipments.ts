import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const shipmentTools: Tool[] = [
  { name: 'list_shipments', description: "Lister les expéditions/bons de livraison. Statut: 0=Brouillon, 1=Validé, 2=Livré, 3=Annulé", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_shipment', description: "Obtenir les détails d'une expédition", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_shipment', description: "Créer un bon de livraison/expédition depuis une commande avec ses lignes et son entrepôt", inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du client' }, origin_id: { type: 'number', description: 'ID de la commande source' }, order_id: { type: 'number', description: 'Alias pour ID de la commande source' }, origin_type: { type: 'string', description: "Type d'origine ('commande' par défaut)" }, warehouse_id: { type: 'number', description: "ID de l'entrepôt (1 par défaut)" }, date_delivery: { type: 'string', description: 'Date de livraison ISO 8601' }, note_public: { type: 'string' }, tracking_number: { type: 'string', description: 'Numéro de suivi transporteur' }, shipping_method_id: { type: 'number', description: 'ID du mode de transport' }, dry_run: { type: 'boolean', description: 'Mode simulation sans écriture' } } } },
  { name: 'validate_shipment', description: "Valider une expédition (la rend officielle)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'deliver_shipment', description: "Marquer une expédition comme livrée (clôture)", inputSchema: { type: 'object', properties: { id: { type: 'number' }, date_delivery: { type: 'string', description: 'Date de livraison effective ISO 8601' } }, required: ['id'] } },
];

export const receptionTools: Tool[] = [
  { name: 'list_receptions', description: "Lister les réceptions fournisseurs", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_reception', description: "Obtenir les détails d'une réception fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export async function handleShipmentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_shipments': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/shipments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_shipment': {
      const data = await api.get(`/shipments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_shipment': {
      const originId = Number(args.origin_id || args.order_id || 0);
      const originType = String(args.origin_type || 'commande');
      let socid = Number(args.socid || 0);
      let orderLines: any[] = [];

      if (originId > 0) {
        const order = await api.get<any>(`/orders/${originId}`).catch(() => null);
        if (order) {
          if (!socid) socid = Number(order.socid);
          if (Array.isArray(order.lines)) {
            orderLines = order.lines;
          }
        }
      }

      if (!socid) {
        return JSON.stringify({ applied: false, verified: false, error: "socid (ID client) requis ou commande source introuvable." }, null, 2);
      }

      const warehouseId = Number(args.warehouse_id || args.entrepot_id || 1);
      const lines = Array.isArray(args.lines) && args.lines.length > 0
        ? args.lines
        : orderLines.map((l: any) => ({
            origin_line_id: Number(l.id),
            qty: Number(l.qty || 1),
            entrepot_id: warehouseId,
          }));

      const dateDelivery = args.date_delivery
        ? Math.floor(new Date(args.date_delivery as string).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const payload: Record<string, unknown> = {
        socid,
        origin_id: originId || undefined,
        origin_type: originType,
        entrepot_id: warehouseId,
        date_delivery: dateDelivery,
        lines,
      };
      if (args.note_public) payload.note_public = args.note_public;
      if (args.tracking_number) payload.tracking_number = args.tracking_number;
      if (args.shipping_method_id) payload.shipping_method_id = args.shipping_method_id;

      if (args.dry_run) {
        return JSON.stringify({
          applied: false,
          dry_run: true,
          socid,
          origin_id: originId,
          origin_type: originType,
          warehouse_id: warehouseId,
          lines_count: lines.length,
          payload,
          message: "Simulation de création d'expédition validée.",
        }, null, 2);
      }

      const id = await api.post<number>('/shipments', payload);
      const created = await api.get<any>(`/shipments/${id}`).catch(() => null);
      const hasLines = Array.isArray(created?.lines) && created.lines.length > 0;

      return JSON.stringify({
        applied: true,
        verified: !!created && (lines.length === 0 || hasLines),
        id,
        ref: created?.ref,
        origin_id: originId,
        origin_type: originType,
        warehouse_id: warehouseId,
        lines_count: created?.lines?.length || 0,
        total_ht: created?.total_ht,
        total_ttc: created?.total_ttc,
        shipment: created,
      }, null, 2);
    }
    case 'validate_shipment':
    case 'deliver_shipment': {
      const id = Number(args.id);
      const isValidate = name === 'validate_shipment';
      const closeMode = String(await api.get<any>('/setup/conf/STOCK_CALCULATE_ON_SHIPMENT_CLOSE').catch(() => '0')) === '1';
      const stockMode = closeMode ? 'on_close' : 'on_validate';
      const expectDecrement = isValidate ? !closeMode : closeMode;
      const before = await api.get<any>(`/shipments/${id}`);
      const productQty: Record<string, number> = {};
      for (const l of (before?.lines || [])) {
        if (l.fk_product && String(l.product_type) === '0') productQty[l.fk_product] = (productQty[l.fk_product] || 0) + Number(l.qty_shipped || l.qty || 0);
      }
      const readStock = async () => {
        const r: Record<string, number> = {};
        for (const pid of Object.keys(productQty)) {
          const prod = await api.get<any>(`/products/${pid}`).catch(() => null);
          r[pid] = Number(prod?.stock_reel || 0);
        }
        return r;
      };
      const stockBefore = await readStock();
      if (isValidate) await api.post(`/shipments/${id}/validate`, { notrigger: 0 });
      else await api.post(`/shipments/${id}/close`, { notrigger: 0 });
      const check = await api.get<any>(`/shipments/${id}`).catch(() => null);
      const stockAfter = await readStock();
      const stock_checks = Object.keys(productQty).map(pid => {
        const delta = stockAfter[pid] - stockBefore[pid];
        const expected = expectDecrement ? -productQty[pid] : 0;
        return { product_id: Number(pid), qty: productQty[pid], stock_before: stockBefore[pid], stock_after: stockAfter[pid], delta, expected_delta: expected, ok: delta === expected };
      });
      const statusOk = isValidate ? String(check?.statut) === '1' : String(check?.statut) === '2';
      const stockOk = stock_checks.every(c => c.ok);
      return JSON.stringify({
        applied: true,
        verified: statusOk && stockOk,
        id, ref: check?.ref, statut: check?.statut,
        stock_mode: stockMode,
        stock_decrement_expected_now: expectDecrement,
        stock_checks,
        message: !statusOk ? `Statut attendu non atteint (statut=${check?.statut}).`
          : !stockOk ? `Statut OK mais mouvement de stock incohérent avec le mode ${stockMode}.`
          : expectDecrement ? `Statut OK et stock décrémenté.`
          : `Statut OK. Stock NON décrémenté à cette étape : Dolibarr est configuré pour décrémenter à la clôture (deliver_shipment).`,
      }, null, 2);
    }
    case 'list_receptions': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/receptions', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_reception': {
      const data = await api.get(`/receptions/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
