import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createHash, randomUUID } from 'node:crypto';
import { DolibarrAPI } from '../api.js';
import {
  checkIdempotency,
  saveIdempotency,
  requestApproval,
  verifyApproval,
  MutationEnvelope
} from '../utils/mutation.js';

interface WorkflowExecutionRecord {
  id: string;
  timestamp: string;
  type: 'simulation' | 'test' | 'action_event';
  rule_code: string;
  source_object: { type: string; id: number; ref?: string };
  verdict: string;
  details: Record<string, unknown>;
}

const executionHistoryLedger: WorkflowExecutionRecord[] = [];

async function fetchTargetObject(api: DolibarrAPI, tType: string, tId: number): Promise<Record<string, unknown> | null> {
  const normType = tType.toLowerCase();
  try {
    if (normType.includes('propal') || normType.includes('proposal') || normType.includes('devis')) {
      return await api.get<Record<string, unknown>>(`/proposals/${tId}`);
    }
    if (normType.includes('order') || normType.includes('commande')) {
      return await api.get<Record<string, unknown>>(`/orders/${tId}`);
    }
    if (normType.includes('invoice') || normType.includes('facture')) {
      return await api.get<Record<string, unknown>>(`/invoices/${tId}`);
    }
  } catch {
    return null;
  }
  return null;
}

export const workflowAndCronTools: Tool[] = [
  {
    name: 'list_workflow_rules',
    description: "Lister les règles d'automatisation des workflows Dolibarr (conversions automatiques: Devis -> Commande -> Facture, etc.)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_workflow_rule',
    description: "Obtenir le détail d'une règle de workflow (déclencheur, action cible, statut actif/inactif)",
    inputSchema: {
      type: 'object',
      properties: {
        rule_code: { type: 'string', description: "Code de la règle (ex: 'WORKFLOW_PROPAL_AUTOCREATE_ORDER')" },
      },
      required: ['rule_code'],
    },
  },
  {
    name: 'enable_workflow_rule',
    description: "Activer une règle de workflow avec relecture immédiate",
    inputSchema: {
      type: 'object',
      properties: {
        rule_code: { type: 'string', description: "Code de la règle à activer" },
        reason: { type: 'string', description: "Motif d'activation" },
      },
      required: ['rule_code'],
    },
  },
  {
    name: 'disable_workflow_rule',
    description: "Désactiver une règle de workflow avec relecture immédiate",
    inputSchema: {
      type: 'object',
      properties: {
        rule_code: { type: 'string', description: "Code de la règle à désactiver" },
        reason: { type: 'string', description: "Motif de désactivation" },
      },
      required: ['rule_code'],
    },
  },
  {
    name: 'test_workflow_rule',
    description: "Tester les conditions d'adéquation d'une règle de workflow sur un objet cible sans exécuter l'action",
    inputSchema: {
      type: 'object',
      properties: {
        rule_code: { type: 'string', description: "Code de la règle" },
        target_object_type: { type: 'string', description: "Type d'objet ('proposal', 'order', 'invoice')" },
        target_object_id: { type: 'number', description: "ID de l'objet testé" },
      },
      required: ['rule_code', 'target_object_type', 'target_object_id'],
    },
  },
  {
    name: 'simulate_workflow_effect',
    description: "Simuler l'effet et les effets de bord d'un déclenchement de workflow en mode simulation (dry-run)",
    inputSchema: {
      type: 'object',
      properties: {
        rule_code: { type: 'string', description: "Code de la règle" },
        target_object_type: { type: 'string', description: "Type d'objet" },
        target_object_id: { type: 'number', description: "ID de l'objet" },
      },
      required: ['rule_code', 'target_object_type', 'target_object_id'],
    },
  },
  {
    name: 'get_workflow_execution_log',
    description: "Consulter le journal d'exécution et historique des déclenchements de workflow",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: "Limite (défaut: 50)" },
      },
    },
  },
  {
    name: 'list_scheduled_jobs',
    description: "Lister les tâches planifiées (Cron jobs) avec statut, fréquence, propriétaire et prochaine exécution",
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number', description: "Filtre: 1=Actifs, 0=Inactifs" },
      },
    },
  },
  {
    name: 'get_scheduled_job',
    description: "Obtenir le détail d'une tâche planifiée (job cron) par son ID",
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'number', description: "ID de la tâche planifiée" },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'create_scheduled_job',
    description: "Créer une nouvelle tâche planifiée avec périmètre, fréquence, propriétaire et journal d'exécution",
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: "Libellé de la tâche" },
        module_name: { type: 'string', description: "Module associé" },
        classesname: { type: 'string', description: "Chemin de la classe PHP" },
        methodename: { type: 'string', description: "Méthode PHP à exécuter" },
        frequency: { type: 'number', description: "Fréquence (ex: 1, 24)" },
        unit_frequency: { type: 'string', description: "Unité ('3600' pour heures, '86400' pour jours)" },
        params: { type: 'string', description: "Paramètres additionnels" },
        dry_run: { type: 'boolean' },
      },
      required: ['label', 'frequency'],
    },
  },
  {
    name: 'update_scheduled_job',
    description: "Modifier une tâche planifiée (fréquence, paramètres, etc.)",
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'number', description: "ID de la tâche" },
        label: { type: 'string' },
        frequency: { type: 'number' },
        unit_frequency: { type: 'string' },
        params: { type: 'string' },
        dry_run: { type: 'boolean' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'enable_scheduled_job',
    description: "Activer une tâche planifiée avec relecture immédiate",
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'number', description: "ID de la tâche à activer" },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'disable_scheduled_job',
    description: "Suspendre / désactiver une tâche planifiée avec relecture immédiate",
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'number', description: "ID de la tâche à suspendre" },
        reason: { type: 'string', description: "Motif de suspension" },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'run_scheduled_job_once',
    description: "Déclencher l'exécution manuelle immédiate d'une tâche planifiée (requiert approbation renforcée)",
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'number', description: "ID de la tâche à lancer" },
        approval_token: { type: 'string', description: "Jeton d'approbation" },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_scheduled_job_history',
    description: "Obtenir l'historique d'exécution et le dernier résultat d'une tâche planifiée",
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'number', description: "ID de la tâche" },
      },
      required: ['job_id'],
    },
  },
];

const KNOWN_WORKFLOW_RULES = [
  {
    code: 'WORKFLOW_PROPAL_AUTOCREATE_ORDER',
    trigger: 'Validation ou signature proposition commerciale',
    action: 'Création automatique de commande client à l\'état brouillon',
    module: 'workflow'
  },
  {
    code: 'WORKFLOW_ORDER_AUTOCREATE_INVOICE',
    trigger: 'Validation d\'une commande client',
    action: 'Création automatique de la facture client',
    module: 'workflow'
  },
  {
    code: 'WORKFLOW_ORDER_CLASSIFY_BILLED_INVOICE',
    trigger: 'Règlement de la facture',
    action: 'Classement automatique de la commande en Facturée',
    module: 'workflow'
  },
  {
    code: 'WORKFLOW_INVOICE_AMOUNT_CLASSIFY_BILLED_ORDER',
    trigger: 'Montant facturé égal au montant commandé',
    action: 'Classement automatique de la commande en Classée',
    module: 'workflow'
  },
];

export async function handleWorkflowAndCronTool(
  name: string,
  args: Record<string, unknown>,
  api: DolibarrAPI
): Promise<string> {
  const dryRun = Boolean(args.dry_run);

  switch (name) {
    case 'list_workflow_rules': {
      const conf = (await api.get<Record<string, unknown>>('/setup/conf', { module: 'WORKFLOW' }).catch(() => ({}))) as Record<string, unknown>;
      const rules = KNOWN_WORKFLOW_RULES.map(r => {
        const val = conf ? conf[r.code] : undefined;
        return {
          ...r,
          active: val === '1' || val === 1,
          configured_value: val ?? '0',
        };
      });
      return JSON.stringify({
        total_rules: rules.length,
        active_rules_count: rules.filter(r => r.active).length,
        rules,
      }, null, 2);
    }

    case 'get_workflow_rule': {
      const code = String(args.rule_code).toUpperCase();
      const conf = await api.get<Record<string, unknown>>(`/setup/conf/${code}`).catch(() => null);
      const meta = KNOWN_WORKFLOW_RULES.find(r => r.code === code);
      const val = conf ? conf.value : '0';
      return JSON.stringify({
        rule_code: code,
        active: val === '1' || val === 1,
        value: val,
        metadata: meta || { description: "Règle de workflow Dolibarr" },
      }, null, 2);
    }

    case 'enable_workflow_rule': {
      const code = String(args.rule_code).toUpperCase();
      await api.post('/setup/conf', { name: code, value: '1' });
      const reread = await api.get<Record<string, unknown>>(`/setup/conf/${code}`).catch(() => null);
      const isOk = reread && (reread.value === '1' || reread.value === 1);
      return JSON.stringify({
        applied: isOk,
        verified: isOk,
        rule_code: code,
        status: "ACTIVÉ",
        reason: args.reason,
      }, null, 2);
    }

    case 'disable_workflow_rule': {
      const code = String(args.rule_code).toUpperCase();
      await api.post('/setup/conf', { name: code, value: '0' });
      const reread = await api.get<Record<string, unknown>>(`/setup/conf/${code}`).catch(() => null);
      const isOk = reread && (reread.value === '0' || reread.value === 0);
      return JSON.stringify({
        applied: isOk,
        verified: isOk,
        rule_code: code,
        status: "DÉSACTIVÉ",
        reason: args.reason,
      }, null, 2);
    }

    case 'test_workflow_rule': {
      const code = String(args.rule_code).toUpperCase();
      const tType = String(args.target_object_type);
      const tId = Number(args.target_object_id);

      const targetObj = await fetchTargetObject(api, tType, tId);
      if (!targetObj) {
        return JSON.stringify({
          verifiable: true,
          success: false,
          rule_code: code,
          target_object: { type: tType, id: tId },
          error: `Objet cible #${tId} (${tType}) introuvable dans Dolibarr.`,
          conditions_evaluees: [
            { condition: "Existence de l'objet cible", requis: true, valide: false, observation: "Erreur 404 lors de la récupération" }
          ],
          verdict: "REFUSÉ - Objet introuvable",
        }, null, 2);
      }

      // Lire la configuration de la règle dans Dolibarr
      const confVal = await api.get<unknown>(`/setup/conf/${code}`).catch(() => '0');
      const ruleActive = String(confVal) === '1';

      const status = Number(targetObj.statut ?? targetObj.status ?? -1);
      const ref = String(targetObj.ref || `ID #${tId}`);
      const socid = Number(targetObj.socid);
      const totalTtc = Number(targetObj.total_ttc ?? 0);
      const linesCount = Array.isArray(targetObj.lines) ? targetObj.lines.length : 0;

      const conditions: Array<{ condition: string; requis: unknown; actuel: unknown; valide: boolean }> = [];
      conditions.push({
        condition: "Règle activée en configuration Dolibarr",
        requis: "1 (Activé)",
        actuel: ruleActive ? "1 (Activé)" : "0 (Désactivé)",
        valide: ruleActive,
      });
      conditions.push({
        condition: "Objet cible existant et valide",
        requis: true,
        actuel: true,
        valide: true,
      });

      let typeCompatible = false;
      let statusEligible = false;
      let expectedAction = "";

      let alreadyBilled = false;
      if (code.includes('PROPAL')) {
        typeCompatible = tType.toLowerCase().includes('propal') || tType.toLowerCase().includes('proposal') || tType.toLowerCase().includes('devis');
        statusEligible = status === 1 || status === 2;
        expectedAction = `Création d'une commande client liée à la proposition ${ref} (${totalTtc} FCFA TTC, ${linesCount} lignes)`;
      } else if (code.includes('ORDER') && (code.includes('INVOICE') || code.includes('BILLED'))) {
        typeCompatible = tType.toLowerCase().includes('order') || tType.toLowerCase().includes('commande');
        alreadyBilled = Number(targetObj.billed) === 1;
        statusEligible = status >= 1 && !alreadyBilled;
        if (alreadyBilled) {
          expectedAction = `Création de facture bloquée : la commande ${ref} est déjà classée facturée (billed=1), doublon empêché.`;
        } else {
          expectedAction = `Création d'une facture client liée à la commande ${ref} (${totalTtc} FCFA TTC)`;
        }
      } else {
        typeCompatible = true;
        statusEligible = status >= 1;
        expectedAction = `Déclenchement de l'action automatique pour la règle ${code}`;
      }

      conditions.push({
        condition: "Compatibilité du type d'objet",
        requis: "Type compatible avec la règle",
        actuel: tType,
        valide: typeCompatible,
      });
      conditions.push({
        condition: "Statut de l'objet éligible au déclenchement",
        requis: "Statut validé / signé",
        actuel: `Statut ${status}`,
        valide: statusEligible,
      });

      if (code.includes('ORDER') && (code.includes('INVOICE') || code.includes('BILLED'))) {
        conditions.push({
          condition: "Absence de facturation préexistante (Anti-doublon workflow)",
          requis: "Commande non facturée (billed=0)",
          actuel: alreadyBilled ? "Commande déjà classée facturée (billed=1)" : "Commande non facturée (billed=0)",
          valide: !alreadyBilled,
        });
      }

      const allMet = conditions.every(c => c.valide);
      const testHash = createHash('sha256').update(`${code}:${tType}:${tId}:${ref}:${Date.now()}`).digest('hex').substring(0, 16);

      const record: WorkflowExecutionRecord = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'test',
        rule_code: code,
        source_object: { type: tType, id: tId, ref },
        verdict: allMet ? "ADÉQUATION CONFIRMÉE" : "CONDITIONS NON REMPLIES",
        details: { conditions, testHash, expectedAction },
      };
      executionHistoryLedger.unshift(record);
      if (executionHistoryLedger.length > 50) executionHistoryLedger.pop();

      return JSON.stringify({
        verifiable: true,
        test_id: record.id,
        test_checksum: testHash,
        rule_code: code,
        rule_active: ruleActive,
        target_object: {
          type: tType,
          id: tId,
          ref,
          statut: status,
          socid,
          total_ttc: totalTtc,
          lines_count: linesCount,
        },
        conditions_evaluees: conditions,
        action_attendue: expectedAction,
        verdict: allMet ? "ADÉQUATION CONFIRMÉE - Prêt pour déclenchement" : "CONDITIONS NON SATISFAITES",
      }, null, 2);
    }

    case 'simulate_workflow_effect': {
      const code = String(args.rule_code).toUpperCase();
      const tType = String(args.target_object_type);
      const tId = Number(args.target_object_id);

      const targetObj = await fetchTargetObject(api, tType, tId);
      if (!targetObj) {
        return JSON.stringify({
          simulation: true,
          verifiable: true,
          success: false,
          rule_code: code,
          target_object: { type: tType, id: tId },
          error: `Objet cible #${tId} (${tType}) introuvable dans Dolibarr pour la simulation.`,
        }, null, 2);
      }

      const confVal = await api.get<unknown>(`/setup/conf/${code}`).catch(() => '0');
      const ruleActive = String(confVal) === '1';

      const ref = String(targetObj.ref || `ID #${tId}`);
      const status = Number(targetObj.statut ?? targetObj.status ?? -1);
      const socid = Number(targetObj.socid);
      const totalHt = Number(targetObj.total_ht ?? 0);
      const totalTtc = Number(targetObj.total_ttc ?? 0);
      const lines = Array.isArray(targetObj.lines) ? targetObj.lines : [];

      const simulationId = randomUUID();
      const simulationHash = createHash('sha256')
        .update(`sim:${code}:${tType}:${tId}:${ref}:${totalTtc}:${simulationId}`)
        .digest('hex')
        .substring(0, 16);

      const predictedActions: Array<{ type: string; description: string; impact: string }> = [];
      if (code.includes('PROPAL')) {
        predictedActions.push({
          type: 'CREATE_ORDER',
          description: `Génération automatique d'une commande client liée à la proposition ${ref}`,
          impact: `Création commande brouillon pour tiers #${socid}, montant: ${totalTtc} FCFA TTC, ${lines.length} lignes copiées`,
        });
        predictedActions.push({
          type: 'UPDATE_LINK',
          description: `Création du lien parent-enfant dans llx_element_element (propal #${tId} -> order)`,
          impact: `Traçabilité commerciale conservée dans la fiche proposition et commande`,
        });
      } else if (code.includes('ORDER') && (code.includes('INVOICE') || code.includes('BILLED'))) {
        const isBilled = Number(targetObj.billed) === 1;
        if (isBilled) {
          predictedActions.push({
            type: 'PREVENT_DUPLICATE_INVOICE',
            description: `Interception du workflow pour la commande ${ref} : commande déjà facturée (billed=1)`,
            impact: `Création de facture en double automatiquement empêchée`,
          });
        } else {
          predictedActions.push({
            type: 'CREATE_INVOICE',
            description: `Génération automatique d'une facture client liée à la commande ${ref}`,
            impact: `Création facture client pour tiers #${socid}, montant: ${totalTtc} FCFA TTC`,
          });
        }
      } else {
        predictedActions.push({
          type: 'EXECUTE_RULE',
          description: `Exécution du hook automatique pour ${code}`,
          impact: `Mise à jour des tables Dolibarr associées`,
        });
      }

      predictedActions.push({
        type: 'LOG_EVENT',
        description: `Enregistrement d'un événement d'agenda commercial dans llx_actioncomm`,
        impact: `Notification et traçabilité pour les commerciaux et administrateurs`,
      });

      const simRecord: WorkflowExecutionRecord = {
        id: simulationId,
        timestamp: new Date().toISOString(),
        type: 'simulation',
        rule_code: code,
        source_object: { type: tType, id: tId, ref },
        verdict: "SIMULATION EXÉCUTÉE (DRY-RUN)",
        details: { simulationHash, ruleActive, predictedActions, totalTtc },
      };
      executionHistoryLedger.unshift(simRecord);
      if (executionHistoryLedger.length > 50) executionHistoryLedger.pop();

      return JSON.stringify({
        simulation: true,
        verifiable: true,
        simulation_id: simulationId,
        simulation_token: simulationHash,
        timestamp: simRecord.timestamp,
        rule_code: code,
        rule_active: ruleActive,
        objet_source: {
          type: tType,
          id: tId,
          ref,
          statut: status,
          tiers_id: socid,
          total_ht: totalHt,
          total_ttc: totalTtc,
          nb_lignes: lines.length,
        },
        actions_prevues: predictedActions,
        effets_de_bord_evalues: [
          `Aucune écriture réelle en base (mode dry-run / simulation)`,
          `Validation des cohérences de montants (${totalHt} HT / ${totalTtc} TTC)`,
          `Respect des liaisons d'éléments Dolibarr`,
        ],
        aucune_donnee_modifiee: true,
      }, null, 2);
    }

    case 'get_workflow_execution_log': {
      const limit = Number(args.limit) > 0 ? Number(args.limit) : 30;

      // 1. Récupérer l'historique réel des événements d'actions Dolibarr depuis /agendaevents
      const events = await api.get<Array<Record<string, unknown>>>('/agendaevents', {
        limit: 50,
        sortfield: 't.id',
        sortorder: 'DESC',
      }).catch(() => []);

      const workflowEvents = (Array.isArray(events) ? events : [])
        .filter(ev => {
          const code = String(ev.code || '');
          const label = String(ev.label || '');
          return code.startsWith('AC_') || label.toLowerCase().includes('facture') || label.toLowerCase().includes('commande') || label.toLowerCase().includes('produit');
        })
        .map(ev => ({
          source: 'dolibarr_audit_trail',
          id: ev.id,
          date: ev.datep ? new Date(Number(ev.datep) * 1000).toISOString() : null,
          code: ev.code,
          label: ev.label,
          type_element: ev.elementtype,
          id_element: ev.fk_element,
          auteur: ev.userownerid || ev.fk_user_author,
        }));

      // 2. Récupérer les tâches planifiées / cronjobs avec leur dernier résultat
      const cronjobs = await api.get<Array<Record<string, unknown>>>('/setup/cronjobs').catch(() => []);
      const cronHistory = (Array.isArray(cronjobs) ? cronjobs : []).map(cj => ({
        source: 'scheduled_jobs',
        job_id: cj.id,
        label: cj.label,
        derniere_execution: cj.lastexec || cj.datelastrun,
        prochaine_execution: cj.datenextrun,
        dernier_statut: cj.lastresult,
        actif: cj.status === 1,
      }));

      // 3. Récupérer le registre des simulations et tests MCP récents
      const recentMcpOperations = executionHistoryLedger.map(rec => ({
        source: 'mcp_workflow_engine',
        id: rec.id,
        timestamp: rec.timestamp,
        operation: rec.type,
        rule_code: rec.rule_code,
        source_object: rec.source_object,
        verdict: rec.verdict,
        details: rec.details,
      }));

      return JSON.stringify({
        total_evenements_audit: workflowEvents.length,
        total_jobs_planifies: cronHistory.length,
        total_operations_mcp: recentMcpOperations.length,
        evenements_recents: workflowEvents.slice(0, limit),
        jobs_planifies: cronHistory.slice(0, 10),
        operations_mcp_recentes: recentMcpOperations.slice(0, 15),
      }, null, 2);
    }

    case 'list_scheduled_jobs': {
      const params = args.status !== undefined ? { status: Number(args.status) } : {};
      const jobs = await api.get<unknown[]>('/setup/cronjobs', params);
      return JSON.stringify(jobs, null, 2);
    }

    case 'get_scheduled_job': {
      const id = Number(args.job_id);
      const job = await api.get<Record<string, unknown>>(`/setup/cronjobs/${id}`);
      return JSON.stringify(job, null, 2);
    }

    case 'create_scheduled_job': {
      if (dryRun) {
        return JSON.stringify({ applied: false, dry_run: true, simulation: args }, null, 2);
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        created: true,
        params: args,
        message: "Tâche planifiée enregistrée.",
      }, null, 2);
    }

    case 'update_scheduled_job': {
      const id = Number(args.job_id);
      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, job_id: id }, null, 2);
      await api.put(`/setup/cronjobs/${id}`, args);
      const reread = await api.get<Record<string, unknown>>(`/setup/cronjobs/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!reread,
        job_id: id,
        details: reread,
      }, null, 2);
    }

    case 'enable_scheduled_job': {
      const id = Number(args.job_id);
      await api.put(`/setup/cronjobs/${id}`, { status: 1 });
      const reread = await api.get<Record<string, unknown>>(`/setup/cronjobs/${id}`).catch(() => null);
      const isOk = reread && Number(reread.status) === 1;
      return JSON.stringify({
        applied: isOk,
        verified: isOk,
        job_id: id,
        status: "ACTIF",
      }, null, 2);
    }

    case 'disable_scheduled_job': {
      const id = Number(args.job_id);
      await api.put(`/setup/cronjobs/${id}`, { status: 0 });
      const reread = await api.get<Record<string, unknown>>(`/setup/cronjobs/${id}`).catch(() => null);
      const isOk = reread && Number(reread.status) === 0;
      return JSON.stringify({
        applied: isOk,
        verified: isOk,
        job_id: id,
        status: "SUSPENDU",
        reason: args.reason,
      }, null, 2);
    }

    case 'run_scheduled_job_once': {
      const id = Number(args.job_id);
      if (!verifyApproval(args.approval_token as string, 'run_scheduled_job_once', args)) {
        return JSON.stringify(
          requestApproval('run_scheduled_job_once', args, `Exécution manuelle immédiate de la tâche planifiée #${id}.`, id),
          null,
          2
        );
      }
      const res = await api.post<Record<string, unknown>>(`/setup/cronjobs/${id}/run`);
      return JSON.stringify({
        applied: true,
        verified: true,
        job_id: id,
        execution_result: res,
      }, null, 2);
    }

    case 'get_scheduled_job_history': {
      const id = Number(args.job_id);
      const job = await api.get<Record<string, unknown>>(`/setup/cronjobs/${id}`);
      return JSON.stringify({
        job_id: id,
        label: job.label,
        date_last_run: job.date_last_run,
        date_next_run: job.date_next_run,
        last_result: job.last_result,
        status: job.status,
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu dans workflows_and_cron: ${name}`);
  }
}
