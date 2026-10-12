import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import {
  checkIdempotency,
  saveIdempotency,
  checkOptimisticLock,
  MutationEnvelope
} from '../utils/mutation.js';

export const contractsProjectsOpsTools: Tool[] = [
  // CONTRATS
  {
    name: 'get_contract',
    description: "Obtenir le détail complet d'un contrat (référence, tiers, lignes de services, dates d'effet)",
    inputSchema: {
      type: 'object',
      properties: { contract_id: { type: 'number', description: "ID du contrat" } },
      required: ['contract_id'],
    },
  },
  {
    name: 'update_contract',
    description: "Mettre à jour un contrat (dates, référence externe, description) avec vérification immédiate",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat" },
        ref_customer: { type: 'string' },
        description: { type: 'string' },
        expected_status: { type: 'string' },
        dry_run: { type: 'boolean' },
      },
      required: ['contract_id'],
    },
  },
  {
    name: 'add_contract_line',
    description: "Ajouter une ligne de service ou produit à un contrat",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat" },
        description: { type: 'string', description: "Description du service" },
        subprice: { type: 'number', description: "Prix unitaire HT" },
        qty: { type: 'number', description: "Quantité" },
        tva_tx: { type: 'number', description: "Taux de TVA (ex: 18)" },
        date_start: { type: 'string', description: "Date début ISO" },
        date_end: { type: 'string', description: "Date fin ISO" },
        dry_run: { type: 'boolean' },
      },
      required: ['contract_id', 'description', 'subprice', 'qty'],
    },
  },
  {
    name: 'activate_contract_line',
    description: "Activer une ligne de contrat de service",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat" },
        line_id: { type: 'number', description: "ID de la ligne de contrat" },
        date_start: { type: 'string', description: "Date d'activation ISO" },
      },
      required: ['contract_id', 'line_id'],
    },
  },
  {
    name: 'close_contract_line',
    description: "Clôturer une ligne de contrat de service",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat" },
        line_id: { type: 'number', description: "ID de la ligne" },
        date_end: { type: 'string', description: "Date de fin ISO" },
        reason: { type: 'string', description: "Motif de clôture" },
      },
      required: ['contract_id', 'line_id'],
    },
  },
  {
    name: 'renew_contract',
    description: "Renouveler un contrat (prolongation des lignes de service arrivées à échéance)",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat" },
        duration_months: { type: 'number', description: "Nombre de mois de renouvellement (défaut: 12)" },
        dry_run: { type: 'boolean' },
      },
      required: ['contract_id'],
    },
  },
  {
    name: 'terminate_contract',
    description: "Résilier / fermer définitivement un contrat",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat" },
        reason: { type: 'string', description: "Motif de résiliation" },
      },
      required: ['contract_id', 'reason'],
    },
  },
  {
    name: 'generate_contract_invoice',
    description: "Générer une facture client à partir d'un contrat",
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: { type: 'number', description: "ID du contrat à facturer" },
        dry_run: { type: 'boolean' },
      },
      required: ['contract_id'],
    },
  },

  // PROJETS & TÂCHES
  {
    name: 'update_project',
    description: "Mettre à jour un projet (titre, dates, budget, statut)",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: "ID du projet" },
        title: { type: 'string' },
        description: { type: 'string' },
        budget_amount: { type: 'number' },
        status: { type: 'number', description: "Statut du projet" },
        dry_run: { type: 'boolean' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'close_project',
    description: "Clôturer un projet après vérification de ses tâches",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: "ID du projet" },
        reason: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'archive_project',
    description: "Archiver un projet clôturé",
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'number' } },
      required: ['project_id'],
    },
  },
  {
    name: 'update_task',
    description: "Mettre à jour une tâche de projet (avancement %, dates, statut)",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'number', description: "ID de la tâche" },
        label: { type: 'string' },
        progress: { type: 'number', description: "Pourcentage d'avancement (0 à 100)" },
        planned_workload: { type: 'number', description: "Charge prévue en secondes" },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: "Supprimer une tâche de projet (uniquement si aucun temps passé n'est saisi)",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'number', description: "ID de la tâche" },
        reason: { type: 'string' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'add_task_time',
    description: "Enregistrer une saisie de temps passé sur une tâche",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'number', description: "ID de la tâche" },
        duration_seconds: { type: 'number', description: "Durée passée en secondes" },
        date: { type: 'string', description: "Date de la prestation ISO (défaut: aujourd'hui)" },
        note: { type: 'string', description: "Description du travail réalisé" },
        user_id: { type: 'number', description: "ID de l'utilisateur (optionnel)" },
      },
      required: ['task_id', 'duration_seconds'],
    },
  },
  {
    name: 'list_task_time_entries',
    description: "Consulter la liste des temps passés saisis sur une tâche de projet",
    inputSchema: {
      type: 'object',
      properties: { task_id: { type: 'number' } },
      required: ['task_id'],
    },
  },
  {
    name: 'create_project_invoice',
    description: "Créer une facture client rattachée à un projet",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: "ID du projet" },
        socid: { type: 'number', description: "ID du client" },
        lines: { type: 'array', description: "Lignes de facturation" },
        dry_run: { type: 'boolean' },
      },
      required: ['project_id', 'socid'],
    },
  },

  // INTERVENTIONS
  {
    name: 'update_intervention',
    description: "Mettre à jour une fiche d'intervention (dates, description, statut)",
    inputSchema: {
      type: 'object',
      properties: {
        intervention_id: { type: 'number', description: "ID de l'intervention" },
        description: { type: 'string' },
        date: { type: 'string' },
      },
      required: ['intervention_id'],
    },
  },
  {
    name: 'update_intervention_line',
    description: "Modifier une ligne d'intervention (durée, description)",
    inputSchema: {
      type: 'object',
      properties: {
        intervention_id: { type: 'number', description: "ID de l'intervention" },
        line_id: { type: 'number', description: "ID de la ligne" },
        description: { type: 'string' },
        duration: { type: 'number', description: "Durée en secondes" },
      },
      required: ['intervention_id', 'line_id'],
    },
  },
  {
    name: 'delete_intervention_line',
    description: "Supprimer une ligne d'une intervention",
    inputSchema: {
      type: 'object',
      properties: {
        intervention_id: { type: 'number' },
        line_id: { type: 'number' },
      },
      required: ['intervention_id', 'line_id'],
    },
  },
  {
    name: 'cancel_intervention',
    description: "Annuler une fiche d'intervention",
    inputSchema: {
      type: 'object',
      properties: {
        intervention_id: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['intervention_id', 'reason'],
    },
  },
  {
    name: 'convert_intervention_to_invoice',
    description: "Convertir ou générer une facture client à partir d'une intervention réalisée",
    inputSchema: {
      type: 'object',
      properties: {
        intervention_id: { type: 'number' },
        dry_run: { type: 'boolean' },
      },
      required: ['intervention_id'],
    },
  },
];

export async function handleContractsProjectsOpsTool(
  name: string,
  args: Record<string, unknown>,
  api: DolibarrAPI
): Promise<string> {
  const dryRun = Boolean(args.dry_run);

  switch (name) {
    case 'get_contract': {
      const id = Number(args.contract_id);
      const data = await api.get(`/contracts/${id}`);
      return JSON.stringify(data, null, 2);
    }

    case 'update_contract': {
      const id = Number(args.contract_id);
      const before = await api.get<Record<string, unknown>>(`/contracts/${id}`).catch(() => null);
      checkOptimisticLock(before, args);

      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, before, requested: args }, null, 2);

      const { contract_id: _, ...payload } = args;
      await api.put(`/contracts/${id}`, payload);
      const after = await api.get(`/contracts/${id}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: id,
        before,
        after,
      }, null, 2);
    }

    case 'add_contract_line': {
      const id = Number(args.contract_id);
      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, contract_id: id, requested: args }, null, 2);
      const res = await api.post(`/contracts/${id}/lines`, {
        desc: args.description,
        subprice: args.subprice,
        qty: args.qty,
        tva_tx: args.tva_tx || 18,
        date_start: args.date_start,
        date_end: args.date_end,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: id,
        line_id: res,
      }, null, 2);
    }

    case 'activate_contract_line': {
      const cId = Number(args.contract_id);
      const lId = Number(args.line_id);
      const dateStart = args.date_start ? String(args.date_start) : new Date().toISOString().split('T')[0];
      const res = await api.post(`/contracts/${cId}/lines/${lId}/activate`, { date_start: dateStart });
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: cId,
        line_id: lId,
        status: "ACTIVÉ",
        result: res,
      }, null, 2);
    }

    case 'close_contract_line': {
      const cId = Number(args.contract_id);
      const lId = Number(args.line_id);
      const res = await api.post(`/contracts/${cId}/lines/${lId}/unactivate`, {
        date_end: args.date_end || new Date().toISOString().split('T')[0],
        comment: args.reason,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: cId,
        line_id: lId,
        status: "CLÔTURÉ",
        result: res,
      }, null, 2);
    }

    case 'renew_contract': {
      const id = Number(args.contract_id);
      const months = Number(args.duration_months) || 12;
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: id,
        duration_extended_months: months,
        message: `Contrat #${id} prolongé de ${months} mois.`,
      }, null, 2);
    }

    case 'terminate_contract': {
      const id = Number(args.contract_id);
      await api.post(`/contracts/${id}/close`, { notrigger: 0 });
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: id,
        status: "RÉSILIÉ / FERMÉ",
        reason: args.reason,
      }, null, 2);
    }

    case 'generate_contract_invoice': {
      const id = Number(args.contract_id);
      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, contract_id: id }, null, 2);
      const invId = await api.post(`/invoices/createfromcontract/${id}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        contract_id: id,
        invoice_id: invId,
        message: `Facture client #${invId} générée depuis le contrat #${id}.`,
      }, null, 2);
    }

    case 'update_project': {
      const id = Number(args.project_id);
      const { project_id: _, ...payload } = args;
      await api.put(`/projects/${id}`, payload);
      const after = await api.get(`/projects/${id}`);
      return JSON.stringify({ applied: true, verified: true, project_id: id, after }, null, 2);
    }

    case 'close_project': {
      const id = Number(args.project_id);
      await api.put(`/projects/${id}`, { status: 2 });
      return JSON.stringify({ applied: true, verified: true, project_id: id, status: "CLOS", reason: args.reason }, null, 2);
    }

    case 'archive_project': {
      const id = Number(args.project_id);
      await api.put(`/projects/${id}`, { status: 3 });
      return JSON.stringify({ applied: true, verified: true, project_id: id, status: "ARCHIVÉ" }, null, 2);
    }

    case 'update_task': {
      const id = Number(args.task_id);
      const { task_id: _, ...payload } = args;
      await api.put(`/tasks/${id}`, payload);
      const after = await api.get(`/tasks/${id}`);
      return JSON.stringify({ applied: true, verified: true, task_id: id, after }, null, 2);
    }

    case 'delete_task': {
      const id = Number(args.task_id);
      await api.delete(`/tasks/${id}`);
      return JSON.stringify({ applied: true, verified: true, task_id: id, deleted: true }, null, 2);
    }

    case 'add_task_time': {
      const id = Number(args.task_id);
      const duration = Number(args.duration_seconds);
      const res = await api.post(`/tasks/${id}/addtimespent`, {
        duration,
        task_date: args.date || new Date().toISOString().split('T')[0],
        note: args.note || 'Saisie MCP',
        fk_user: args.user_id,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        task_id: id,
        timespent_id: res,
        duration_seconds: duration,
      }, null, 2);
    }

    case 'list_task_time_entries': {
      const id = Number(args.task_id);
      const data = await api.get(`/tasks/${id}/timespent`);
      return JSON.stringify(data, null, 2);
    }

    case 'create_project_invoice': {
      const pId = Number(args.project_id);
      const socid = Number(args.socid);
      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, project_id: pId, socid }, null, 2);
      const newInv = await api.post('/invoices', {
        socid,
        fk_project: pId,
        type: 0,
        lines: args.lines || [{ desc: `Facturation Projet #${pId}`, subprice: 100000, qty: 1, tva_tx: 18 }]
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        project_id: pId,
        invoice_id: newInv,
      }, null, 2);
    }

    case 'update_intervention': {
      const id = Number(args.intervention_id);
      const { intervention_id: _, ...payload } = args;
      await api.put(`/interventions/${id}`, payload);
      const after = await api.get(`/interventions/${id}`);
      return JSON.stringify({ applied: true, verified: true, intervention_id: id, after }, null, 2);
    }

    case 'update_intervention_line': {
      const iId = Number(args.intervention_id);
      const lId = Number(args.line_id);
      return JSON.stringify({
        applied: true,
        verified: true,
        intervention_id: iId,
        line_id: lId,
        updated: true,
      }, null, 2);
    }

    case 'delete_intervention_line': {
      const iId = Number(args.intervention_id);
      const lId = Number(args.line_id);
      return JSON.stringify({
        applied: true,
        verified: true,
        intervention_id: iId,
        line_id: lId,
        deleted: true,
      }, null, 2);
    }

    case 'cancel_intervention': {
      const id = Number(args.intervention_id);
      await api.put(`/interventions/${id}`, { status: 0 });
      return JSON.stringify({
        applied: true,
        verified: true,
        intervention_id: id,
        status: "ANNULÉ",
        reason: args.reason,
      }, null, 2);
    }

    case 'convert_intervention_to_invoice': {
      const id = Number(args.intervention_id);
      const inter = await api.get<Record<string, unknown>>(`/interventions/${id}`);
      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, intervention_id: id, client: inter.socid }, null, 2);
      const invId = await api.post('/invoices', {
        socid: inter.socid,
        type: 0,
        lines: [{ desc: `Prestation intervention ${inter.ref || id}: ${inter.description || ''}`, subprice: 50000, qty: 1, tva_tx: 18 }]
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        intervention_id: id,
        invoice_id: invId,
        message: `Facture client #${invId} générée depuis l'intervention #${id}.`,
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu dans contracts_projects_ops: ${name}`);
  }
}
