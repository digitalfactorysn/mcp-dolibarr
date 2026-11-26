import paramiko

def patch_setup():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('108.175.11.116', username='root', key_filename='/Users/daoudafall/.ssh/id_ed25519_secure')

    sftp = ssh.open_sftp()
    remote_path = '/var/www/vhosts/digitalfactory.sn/httpdocs/DIGITALFACTORY/GESTIONDIGITALFACTORY/api/class/api_setup.class.php'
    
    with sftp.open(remote_path, 'r') as f:
        content = f.read().decode('utf-8')

    extension_code = """
	/**
	 * Liste des tâches planifiées (Cron jobs)
	 *
	 * @param int $status Filtre statut (1=actif, 0=inactif)
	 * @return array
	 * @url GET cronjobs
	 */
	public function getCronjobs($status = null)
	{
		global $conf;
		$sql = "SELECT rowid, label, jobtype, status, datelastrun, datenextrun, unitfrequency, frequency, priority, test, module_name, classesname, objectname, methodename, params, lastresult";
		$sql .= " FROM " . MAIN_DB_PREFIX . "cronjob WHERE entity IN (0, " . (int)$conf->entity . ")";
		if ($status !== null) {
			$sql .= " AND status = " . (int)$status;
		}
		$sql .= " ORDER BY datenextrun ASC, rowid ASC";

		$resql = $this->db->query($sql);
		$jobs = array();
		if ($resql) {
			while ($obj = $this->db->fetch_object($resql)) {
				$jobs[] = array(
					'id' => (int)$obj->rowid,
					'label' => $obj->label,
					'status' => (int)$obj->status,
					'status_label' => (int)$obj->status === 1 ? 'ACTIF' : 'INACTIF',
					'module' => $obj->module_name,
					'frequency' => (int)$obj->frequency,
					'unit_frequency' => $obj->unitfrequency,
					'date_last_run' => $obj->datelastrun,
					'date_next_run' => $obj->datenextrun,
					'last_result' => $obj->lastresult,
					'classesname' => $obj->classesname,
					'methodename' => $obj->methodename,
					'params' => $obj->params,
				);
			}
		}
		return $jobs;
	}

	/**
	 * Détail d'une tâche planifiée
	 *
	 * @param int $id ID de la tâche
	 * @return array
	 * @url GET cronjobs/{id}
	 * @throws RestException
	 */
	public function getCronjob($id)
	{
		global $conf;
		$sql = "SELECT * FROM " . MAIN_DB_PREFIX . "cronjob WHERE rowid = " . (int)$id . " AND entity IN (0, " . (int)$conf->entity . ")";
		$resql = $this->db->query($sql);
		if (!$resql || $this->db->num_rows($resql) == 0) {
			throw new RestException(404, 'Cronjob not found');
		}
		$obj = $this->db->fetch_object($resql);
		return array(
			'id' => (int)$obj->rowid,
			'label' => $obj->label,
			'status' => (int)$obj->status,
			'module' => $obj->module_name,
			'frequency' => (int)$obj->frequency,
			'unit_frequency' => $obj->unitfrequency,
			'date_last_run' => $obj->datelastrun,
			'date_next_run' => $obj->datenextrun,
			'last_result' => $obj->lastresult,
			'classesname' => $obj->classesname,
			'methodename' => $obj->methodename,
			'params' => $obj->params,
			'note' => $obj->note,
		);
	}

	/**
	 * Mettre à jour une tâche planifiée (activer, désactiver, fréquence)
	 *
	 * @param int $id ID de la tâche
	 * @param array $request_data Données à modifier
	 * @return array
	 * @url PUT cronjobs/{id}
	 * @throws RestException
	 */
	public function putCronjob($id, $request_data = null)
	{
		global $conf;
		if (!DolibarrApiAccess::$user->admin) {
			throw new RestException(403, 'Permission denied (admin required)');
		}

		$updates = array();
		if (isset($request_data['status'])) $updates[] = "status = " . (int)$request_data['status'];
		if (isset($request_data['label'])) $updates[] = "label = '" . $this->db->escape(trim($request_data['label'])) . "'";
		if (isset($request_data['frequency'])) $updates[] = "frequency = " . (int)$request_data['frequency'];
		if (isset($request_data['unit_frequency'])) $updates[] = "unitfrequency = '" . $this->db->escape(trim($request_data['unit_frequency'])) . "'";
		if (isset($request_data['params'])) $updates[] = "params = '" . $this->db->escape(trim($request_data['params'])) . "'";

		if (empty($updates)) {
			throw new RestException(400, 'No fields to update');
		}

		$sql = "UPDATE " . MAIN_DB_PREFIX . "cronjob SET " . implode(', ', $updates) . " WHERE rowid = " . (int)$id . " AND entity IN (0, " . (int)$conf->entity . ")";
		$resql = $this->db->query($sql);
		if (!$resql) {
			throw new RestException(500, 'Error updating cronjob: ' . $this->db->lasterror());
		}

		return array('id' => (int)$id, 'updated' => true);
	}

	/**
	 * Exécuter manuellement une tâche planifiée
	 *
	 * @param int $id ID de la tâche
	 * @return array
	 * @url POST cronjobs/{id}/run
	 * @throws RestException
	 */
	public function runCronjob($id)
	{
		global $conf, $langs;
		if (!DolibarrApiAccess::$user->admin) {
			throw new RestException(403, 'Permission denied (admin required)');
		}

		require_once DOL_DOCUMENT_ROOT . '/cron/class/cronjob.class.php';
		$cronjob = new Cronjob($this->db);
		$result = $cronjob->fetch((int)$id);
		if ($result <= 0) {
			throw new RestException(404, 'Cronjob not found');
		}

		$now = time();
		$exec_res = $cronjob->run_jobs(DolibarrApiAccess::$user->login);

		// Relecture pour récupérer le résultat et statut mis à jour
		$cronjob->fetch((int)$id);

		return array(
			'executed' => true,
			'job_id' => (int)$id,
			'job_label' => $cronjob->label,
			'execution_code' => $exec_res,
			'last_result' => $cronjob->lastresult,
			'last_run' => $cronjob->datelastrun ? $this->db->jdate($cronjob->datelastrun) : date('Y-m-d H:i:s', $now),
		);
	}
"""

    if 'getCronjobs' not in content:
        last_brace = content.rfind('}')
        if last_brace != -1:
            new_content = content[:last_brace] + extension_code + "\n}\n"
            with sftp.open(remote_path, 'w') as f:
                f.write(new_content)
            print("Successfully patched api_setup.class.php with cronjobs endpoints!")
        else:
            print("Could not find closing brace")
    else:
        print("Already contains getCronjobs")

    sftp.close()
    ssh.close()

if __name__ == '__main__':
    patch_setup()
