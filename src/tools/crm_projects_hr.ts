import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

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
        status: { type: 'number', description: '0=Non réalisé, 1=Réalisé' },
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
  {
    name: 'get_contact',
    description: 'Obtenir les détails complets d\'un contact',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du contact' } }, required: ['id'] },
  },
  {
    name: 'update_contact',
    description: 'Modifier les informations d\'un contact',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du contact' },
        lastname: { type: 'string' }, firstname: { type: 'string' }, email: { type: 'string' },
        phone_pro: { type: 'string' }, phone_mobile: { type: 'string' }, job: { type: 'string' },
        note_public: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_contact',
    description: 'Supprimer un contact',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du contact' } }, required: ['id'] },
  },
  {
    name: 'update_agenda_event',
    description: 'Modifier un événement CRM',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'événement' },
        label: { type: 'string' }, datep: { type: 'string' }, datep2: { type: 'string' },
        note: { type: 'string' }, status: { type: 'number', description: '0=A faire, 1=Terminé' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_agenda_event',
    description: 'Supprimer un événement CRM',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de l\'événement' } }, required: ['id'] },
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
        status: { type: 'number', description: '0=En cours, 1=Validé, 2=Fermé. Défaut: tous' },
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
  {
    name: 'update_task',
    description: 'Modifier une tâche (avancement, dates, assignation)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'ID du projet' },
        task_id: { type: 'number', description: 'ID de la tâche' },
        label: { type: 'string' }, description: { type: 'string' },
        progress: { type: 'number', description: 'Avancement 0-100' },
        date_start: { type: 'string' }, date_end: { type: 'string' },
        planned_workload: { type: 'number', description: 'Charge planifiée en heures' },
      },
      required: ['project_id', 'task_id'],
    },
  },
  {
    name: 'add_task_timespent',
    description: 'Enregistrer du temps passé sur une tâche (saisie de temps)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'ID du projet' },
        task_id: { type: 'number', description: 'ID de la tâche' },
        date: { type: 'string', description: 'Date ISO 8601' },
        duration: { type: 'number', description: 'Durée en secondes (ex: 3600 pour 1h)' },
        note: { type: 'string', description: 'Note/commentaire' },
        fk_user: { type: 'number', description: 'ID utilisateur (défaut: utilisateur courant)' },
      },
      required: ['project_id', 'task_id', 'date', 'duration'],
    },
  },
  {
    name: 'list_task_timespents',
    description: 'Lister les saisies de temps d\'une tâche ou d\'un projet',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'ID du projet' },
        task_id: { type: 'number', description: 'ID de la tâche (optionnel)' },
        limit: { type: 'number' },
      },
      required: ['project_id'],
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
        active: { type: 'number', description: '1=Actifs seulement (défaut), 0=Désactivés' },
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
  {
    name: 'get_expense',
    description: 'Obtenir les détails d\'une note de frais',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la note de frais' } }, required: ['id'] },
  },
  {
    name: 'validate_expense',
    description: 'Valider une note de frais (la soumettre pour approbation)',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la note de frais' } }, required: ['id'] },
  },
  {
    name: 'approve_expense',
    description: 'Approuver une note de frais (nécessite les droits RH)',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la note de frais' } }, required: ['id'] },
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
        status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Actif, 3=Expiré' },
      },
    },
  },
  {
    name: 'get_contract',
    description: 'Obtenir les détails d\'un contrat (lignes, services, statut)',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du contrat' } }, required: ['id'] },
  },
  {
    name: 'validate_contract',
    description: 'Valider un contrat brouillon',
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du contrat' } }, required: ['id'] },
  },
  {
    name: 'close_contract',
    description: 'Clôturer un contrat (marquer comme terminé)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du contrat' },
        note_private: { type: 'string', description: 'Note de clôture' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_contract_line',
    description: 'Ajouter une ligne de service à un contrat',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du contrat' },
        fk_product: { type: 'number', description: 'ID produit/service' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        desc: { type: 'string', description: 'Description' },
        date_start: { type: 'string', description: 'Date début service ISO 8601' },
        date_end: { type: 'string', description: 'Date fin service ISO 8601' },
      },
      required: ['id'],
    },
  },
  {
    name: 'activate_contract_line',
    description: 'Activer une ligne de service d\'un contrat (démarre la facturation récurrente)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du contrat' },
        lineid: { type: 'number', description: 'ID de la ligne' },
        date_start: { type: 'string', description: 'Date d\'activation ISO 8601' },
        date_end: { type: 'string', description: 'Date de fin de service ISO 8601' },
        comment: { type: 'string', description: 'Commentaire' },
      },
      required: ['id', 'lineid'],
    },
  },
  {
    name: 'close_contract_line',
    description: 'Clôturer une ligne de service d\'un contrat',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du contrat' },
        lineid: { type: 'number', description: 'ID de la ligne' },
        date_end: { type: 'string', description: 'Date de fin ISO 8601' },
        comment: { type: 'string', description: 'Motif de clôture' },
      },
      required: ['id', 'lineid'],
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
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/contacts', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_contact': {
      const id = await api.post('/contacts', args);
      return `✅ Contact créé. ID: ${id}\nNom: ${args.firstname || ''} ${args.lastname}`;
    }
    case 'list_agenda_events': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.user_id) params.user_ids = args.user_id;
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/agendaevents', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_contact': {
      const data = await api.get(`/contacts/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_contact': {
      const { id, ...rest } = args;
      await api.put(`/contacts/${id}`, rest);
      return `✅ Contact #${id} mis à jour.`;
    }
    case 'delete_contact': {
      await api.delete(`/contacts/${args.id}`);
      return `✅ Contact #${args.id} supprimé.`;
    }
    case 'update_agenda_event': {
      const { id, ...rest } = args;
      if (rest.datep) rest.datep = Math.floor(new Date(rest.datep as string).getTime() / 1000);
      if (rest.datep2) rest.datep2 = Math.floor(new Date(rest.datep2 as string).getTime() / 1000);
      await api.put(`/agendaevents/${id}`, rest);
      return `✅ Événement CRM #${id} mis à jour.`;
    }
    case 'delete_agenda_event': {
      await api.delete(`/agendaevents/${args.id}`);
      return `✅ Événement CRM #${args.id} supprimé.`;
    }
    case 'create_agenda_event': {
      const datep = Math.floor(new Date(args.datep as string).getTime() / 1000);
      const datep2 = args.datep2 ? Math.floor(new Date(args.datep2 as string).getTime() / 1000) : datep + 3600;
      const payload = {
        ...args,
        datep,
        datep2,
        typecode: args.typecode || 'AC_RDV',
        fulldayevent: args.fulldayevent || 0,
      };
      const id = await api.post('/agendaevents', payload);
      return `✅ Événement CRM créé. ID: ${id}\nType: ${payload.typecode} | Label: ${args.label}`;
    }
    default:
      throw new Error(`Outil CRM inconnu: ${name}`);
  }
}

export async function handleProjectTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_projects': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/projects', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_project': {
      const [project, tasks] = await Promise.all([
        api.get(`/projects/${args.id}`),
        api.get(`/projects/${args.id}/tasks`),
      ]);
      return JSON.stringify({ project, tasks }, null, 2);
    }
    case 'create_project': {
      const date_start = args.date_start ? Math.floor(new Date(args.date_start as string).getTime() / 1000) : null;
      const date_end = args.date_end ? Math.floor(new Date(args.date_end as string).getTime() / 1000) : null;
      const payload = { ...args, date_start, date_end, status: args.status ?? 1 };
      const id = await api.post('/projects', payload);
      return `✅ Projet créé. ID: ${id}\nRef: ${args.ref} | Titre: ${args.title}`;
    }
    case 'list_tasks': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.project_id) params.filters = `fk_projet:${args.project_id}`;
      const data = await api.get('/projects/tasks', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_task': {
      const date_start = args.date_start ? Math.floor(new Date(args.date_start as string).getTime() / 1000) : null;
      const date_end = args.date_end ? Math.floor(new Date(args.date_end as string).getTime() / 1000) : null;
      const payload = { ...args, date_start, date_end };
      const id = await api.post(`/projects/${args.project_id}/tasks`, payload);
      return `✅ Tâche créée dans le projet #${args.project_id}. ID tâche: ${id}\nLabel: ${args.label}`;
    }
    case 'update_task': {
      const { project_id, task_id, ...rest } = args;
      if (rest.date_start) rest.date_start = Math.floor(new Date(rest.date_start as string).getTime() / 1000);
      if (rest.date_end) rest.date_end = Math.floor(new Date(rest.date_end as string).getTime() / 1000);
      await api.put(`/projects/${project_id}/tasks/${task_id}`, rest);
      return `✅ Tâche #${task_id} du projet #${project_id} mise à jour.`;
    }
    case 'add_task_timespent': {
      const payload = {
        date: Math.floor(new Date(args.date as string).getTime() / 1000),
        duration: args.duration,
        note: args.note || '',
        fk_user: args.fk_user,
      };
      const id = await api.post(`/projects/${args.project_id}/tasks/${args.task_id}/timespent`, payload);
      const hours = Math.floor(Number(args.duration) / 3600);
      const mins = Math.floor((Number(args.duration) % 3600) / 60);
      return `✅ Temps enregistré: ${hours}h${mins > 0 ? `${mins}m` : ''} sur la tâche #${args.task_id}. ID: ${id}`;
    }
    case 'list_task_timespents': {
      const endpoint = args.task_id
        ? `/projects/${args.project_id}/tasks/${args.task_id}/timespent`
        : `/projects/${args.project_id}/tasks/timespent`;
      const data = await api.get(endpoint, { limit: args.limit || 100 });
      return JSON.stringify(data, null, 2);
    }
    default:
      throw new Error(`Outil Projet inconnu: ${name}`);
  }
}

export async function handleHrTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_users': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.active !== undefined) params.active = args.active;
      else params.active = 1;
      const data = await api.get('/users', params);
      return JSON.stringify(data, null, 2);
    }
    case 'list_expenses': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.user_id) params.user_ids = args.user_id;
      if (args.status !== undefined) params.status = args.status;
      const data = await api.get('/expensereports', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_expense': {
      const data = await api.get(`/expensereports/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'validate_expense': {
      await api.post(`/expensereports/${args.id}/validate`, {});
      return `✅ Note de frais #${args.id} soumise pour validation.`;
    }
    case 'approve_expense': {
      await api.post(`/expensereports/${args.id}/approve`, {});
      return `✅ Note de frais #${args.id} approuvée.`;
    }
    default:
      throw new Error(`Outil RH inconnu: ${name}`);
  }
}

export async function handleContractTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_contracts': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.status !== undefined) params.status = args.status;
      const data = await api.get('/contracts', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_contract': {
      const data = await api.get(`/contracts/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'validate_contract': {
      await api.post(`/contracts/${args.id}/validate`, {});
      return `✅ Contrat #${args.id} validé.`;
    }
    case 'close_contract': {
      await api.post(`/contracts/${args.id}/close`, { note_private: args.note_private || '' });
      return `✅ Contrat #${args.id} clôturé.`;
    }
    case 'add_contract_line': {
      const { id, ...line } = args;
      if (line.date_start) line.date_start = Math.floor(new Date(line.date_start as string).getTime() / 1000);
      if (line.date_end) line.date_end = Math.floor(new Date(line.date_end as string).getTime() / 1000);
      const lineId = await api.post(`/contracts/${id}/lines`, line);
      return `✅ Ligne ajoutée au contrat #${id}. ID ligne: ${lineId}`;
    }
    case 'activate_contract_line': {
      const payload: Record<string, unknown> = {};
      if (args.date_start) payload.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) payload.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.comment) payload.comment = args.comment;
      await api.post(`/contracts/${args.id}/lines/${args.lineid}/activate`, payload);
      return `✅ Ligne #${args.lineid} du contrat #${args.id} activée.`;
    }
    case 'close_contract_line': {
      const payload: Record<string, unknown> = {};
      if (args.date_end) payload.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.comment) payload.comment = args.comment;
      await api.post(`/contracts/${args.id}/lines/${args.lineid}/close`, payload);
      return `✅ Ligne #${args.lineid} du contrat #${args.id} clôturée.`;
    }
    case 'create_contract': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const date_start = args.date_start ? Math.floor(new Date(args.date_start as string).getTime() / 1000) : null;
      const date_end = args.date_end ? Math.floor(new Date(args.date_end as string).getTime() / 1000) : null;
      const payload = { ...args, date, date_start, date_end };
      const id = await api.post('/contracts', payload);
      return `✅ Contrat créé pour le tiers #${args.socid}. ID contrat: ${id}`;
    }
    default:
      throw new Error(`Outil Contrat inconnu: ${name}`);
  }
}
