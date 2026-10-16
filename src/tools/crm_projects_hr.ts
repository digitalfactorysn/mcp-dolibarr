import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const crmTools: Tool[] = [
  {
    name: 'list_contacts',
    description: 'Lister les contacts individuels (personnes physiques, distinctes des tiers/sociétés)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        page: { type: 'number' },
        thirdparty_id: { type: 'number', description: 'Filtrer les contacts liés à un tiers spécifique' },
        sqlfilters: { type: 'string', description: "ex: (t.lastname:like:'%Diop%')" },
      },
    },
  },
  {
    name: 'create_contact',
    description: 'Créer un nouveau contact individuel',
    inputSchema: {
      type: 'object',
      properties: {
        lastname: { type: 'string', description: 'Nom de famille' },
        firstname: { type: 'string', description: 'Prénom' },
        email: { type: 'string', description: 'Email' },
        phone_pro: { type: 'string', description: 'Téléphone professionnel' },
        phone_mobile: { type: 'string', description: 'Mobile' },
        job: { type: 'string', description: 'Fonction/poste' },
        socid: { type: 'number', description: 'ID du tiers (société) auquel rattacher ce contact' },
        note_public: { type: 'string', description: 'Note publique' },
      },
      required: ['lastname'],
    },
  },
  {
    name: 'list_agenda_events',
    description: "Lister les événements de l'agenda CRM (appels, réunions, emails, tâches)",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        thirdparty_id: { type: 'number', description: 'Filtrer les événements liés à un tiers' },
        user_id: { type: 'number', description: "Filtrer les événements d'un utilisateur" },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'create_agenda_event',
    description: "Créer un événement CRM dans l'agenda (appel, réunion, email, action commerciale)",
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: "Libellé de l'évènement" },
        datep: { type: 'string', description: "Date/heure de début ISO 8601 (ex: '2025-01-31T10:00:00')" },
        datep2: { type: 'string', description: "Date/heure de fin ISO 8601" },
        fulldayevent: { type: 'number', description: '1=Journée entière, 0=Avec horaires. Défaut: 0' },
        typecode: { type: 'string', description: "Type: 'AC_RDV', 'AC_TEL', 'AC_EMAIL', 'AC_PROP', 'AC_DEVIS'. Défaut: 'AC_RDV'" },
        note: { type: 'string', description: "Notes de l'événement" },
        fk_soc: { type: 'number', description: 'ID du tiers lié' },
        fk_contact: { type: 'number', description: 'ID du contact lié' },
        userownerid: { type: 'number', description: "ID de l'utilisateur responsable" },
        status: { type: 'number', description: '0=A faire, 1=Terminé' },
      },
      required: ['label', 'datep'],
    },
  },
];

export const projectTools: Tool[] = [
  {
    name: 'list_projects',
    description: 'Lister les projets Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        status: { type: 'number', description: '0=Brouillon, 1=Ouvert, 2=Fermé. Défaut: tous' },
        thirdparty_id: { type: 'number', description: 'Filtrer par tiers client' },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'get_project',
    description: "Obtenir les détails d'un projet et ses tâches",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du projet' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_project',
    description: 'Créer un nouveau projet',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence unique du projet (ex: PROJ-2025-001)' },
        title: { type: 'string', description: 'Titre du projet' },
        description: { type: 'string', description: 'Description détaillée' },
        date_start: { type: 'string', description: 'Date de début ISO 8601' },
        date_end: { type: 'string', description: 'Date de fin prévue ISO 8601' },
        budget_amount: { type: 'number', description: 'Budget alloué (en devise de base)' },
        socid: { type: 'number', description: 'ID du tiers client associé' },
        status: { type: 'number', description: '0=Brouillon, 1=Ouvert. Défaut: 1' },
      },
      required: ['ref', 'title'],
    },
  },
  {
    name: 'list_tasks',
    description: "Lister les tâches d'un projet",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'ID du projet (si omis, toutes les tâches)' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'create_task',
    description: "Créer une tâche dans un projet",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'ID du projet parent' },
        label: { type: 'string', description: 'Titre de la tâche' },
        description: { type: 'string', description: 'Description de la tâche' },
        date_start: { type: 'string', description: 'Date de début ISO 8601' },
        date_end: { type: 'string', description: 'Date de fin prévue ISO 8601' },
        planned_workload: { type: 'number', description: 'Charge plannifiée en heures' },
        progress: { type: 'number', description: 'Avancement en % (0-100)' },
        priority: { type: 'number', description: '0=Normale, 1=Urgent' },
        assigned_user_id: { type: 'number', description: "ID de l'utilisateur assigné" },
      },
      required: ['project_id', 'label'],
    },
  },
];

export const hrTools: Tool[] = [
  {
    name: 'list_users',
    description: 'Lister les utilisateurs Dolibarr (employés, commerciaux, admins)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        active: { type: 'number', description: '1=Actifs (défaut), 0=Désactivés' },
      },
    },
  },
  {
    name: 'list_expenses',
    description: 'Lister les notes de frais',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        user_id: { type: 'number', description: "Filtrer par utilisateur" },
        status: { type: 'number', description: '0=Brouillon, 1=Validée, 2=Approuvée, 3=Payée, 4=Refusée' },
      },
    },
  },
];

export const contractTools: Tool[] = [
  {
    name: 'list_contracts',
    description: 'Lister les contrats/abonnements clients',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        thirdparty_id: { type: 'number', description: 'Filtrer par tiers' },
        status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Clôturé' },
      },
    },
  },
  {
    name: 'create_contract',
    description: 'Créer un nouveau contrat client',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du tiers' },
        date: { type: 'string', description: 'Date du contrat ISO 8601' },
        date_start: { type: 'string', description: 'Date de début de service ISO 8601' },
        date_end: { type: 'string', description: "Date de fin de contrat ISO 8601" },
        note_public: { type: 'string', description: 'Description / objet du contrat' },
      },
      required: ['socid'],
    },
  },
];

export async function handleCrmTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_contacts': {
      const data = await api.get('/contacts', { ...paging(args), thirdparty_ids: args.thirdparty_id === undefined ? undefined : String(args.thirdparty_id), sqlfilters: args.sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'create_contact': {
      const id = await api.post('/contacts', args);
      return `✅ Contact créé. ID: ${id}\nNom: ${args.firstname || ''} ${args.lastname}`;
    }
    case 'list_agenda_events': {
      const sqlfilters = andFilters(eqNum('t.fk_soc', args.thirdparty_id), args.sqlfilters as string | undefined);
      const data = await api.get('/agendaevents', { ...paging(args), user_ids: args.user_id === undefined ? undefined : String(args.user_id), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'create_agenda_event': {
      const datep = toUnix(args.datep);
      const { datep2, typecode, ...rest } = args;
      const owner = args.userownerid ?? (await api.currentUserId());
      const code = typecode ?? 'AC_RDV';
      const payload = {
        ...rest,
        datep,
        datef: datep2 ? toUnix(datep2) : datep + 3600,
        type_code: code,
        fulldayevent: args.fulldayevent ?? 0,
        ...(owner ? { userownerid: owner } : {}),
      };
      const id = await api.post('/agendaevents', payload);
      return `✅ Événement CRM créé. ID: ${id}\nType: ${code} | Label: ${args.label}`;
    }
    default:
      throw new Error(`Outil CRM inconnu: ${name}`);
  }
}

export async function handleProjectTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_projects': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/projects', { ...paging(args), thirdparty_ids: args.thirdparty_id === undefined ? undefined : String(args.thirdparty_id), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_project': {
      const [project, tasks] = await Promise.all([api.get(`/projects/${args.id}`), api.get(`/projects/${args.id}/tasks`)]);
      return JSON.stringify({ project, tasks }, null, 2);
    }
    case 'create_project': {
      const payload = {
        ...args,
        ...(args.date_start ? { date_start: toUnix(args.date_start) } : {}),
        ...(args.date_end ? { date_end: toUnix(args.date_end) } : {}),
        status: args.status ?? 1,
      };
      const id = await api.post('/projects', payload);
      return `✅ Projet créé. ID: ${id}\nRef: ${args.ref} | Titre: ${args.title}`;
    }
    case 'list_tasks': {
      if (args.project_id !== undefined) return JSON.stringify(await api.get(`/projects/${args.project_id}/tasks`), null, 2);
      return JSON.stringify(await api.get('/tasks', paging(args)), null, 2);
    }
    case 'create_task': {
      const { project_id, ...rest } = args;
      const payload = {
        ...rest,
        fk_project: project_id,
        ...(args.date_start ? { date_start: toUnix(args.date_start) } : {}),
        ...(args.date_end ? { date_end: toUnix(args.date_end) } : {}),
      };
      const id = await api.post('/tasks', payload);
      return `✅ Tâche créée dans le projet #${project_id}. ID tâche: ${id}\nLabel: ${args.label}`;
    }
    default:
      throw new Error(`Outil Projet inconnu: ${name}`);
  }
}

export async function handleHrTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_users': {
      const active = args.active === undefined ? 1 : Number(args.active);
      const data = await api.get('/users', { ...paging(args), sqlfilters: eqNum('t.statut', active) });
      return JSON.stringify(data, null, 2);
    }
    case 'list_expenses': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/expensereports', { ...paging(args), user_ids: args.user_id === undefined ? undefined : String(args.user_id), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    default:
      throw new Error(`Outil RH inconnu: ${name}`);
  }
}

export async function handleContractTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_contracts': {
      const sqlfilters = andFilters(eqNum('t.statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/contracts', { ...paging(args), thirdparty_ids: args.thirdparty_id === undefined ? undefined : String(args.thirdparty_id), sqlfilters, withLines: false });
      return JSON.stringify(data, null, 2);
    }
    case 'create_contract': {
      const payload = {
        ...args,
        date: toUnix(args.date),
        ...(args.date_start ? { date_start: toUnix(args.date_start) } : {}),
        ...(args.date_end ? { date_end: toUnix(args.date_end) } : {}),
      };
      const id = await api.post('/contracts', payload);
      return `✅ Contrat créé pour le tiers #${args.socid}. ID contrat: ${id}`;
    }
    default:
      throw new Error(`Outil Contrat inconnu: ${name}`);
  }
}



