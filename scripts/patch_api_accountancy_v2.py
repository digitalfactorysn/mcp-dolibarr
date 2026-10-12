import paramiko

def patch_accountancy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('108.175.11.116', username='root', key_filename='/Users/daoudafall/.ssh/id_ed25519_secure')

    sftp = ssh.open_sftp()
    remote_path = '/var/www/vhosts/digitalfactory.sn/httpdocs/DIGITALFACTORY/GESTIONDIGITALFACTORY/accountancy/class/api_accountancy.class.php'
    
    with sftp.open(remote_path, 'r') as f:
        content = f.read().decode('utf-8')

    # Code to append before the last closing brace
    extension_code = """
	/**
	 * Reverse / Extourner une écriture comptable validée
	 *
	 * @param int $id ID de la ligne (rowid) ou numéro de pièce (piece_num)
	 * @return array
	 * @url POST reverseentry/{id}
	 * @throws RestException
	 */
	public function reverseEntry($id)
	{
		global $conf;
		if (!DolibarrApiAccess::$user->rights->accounting->comptabilite->creer) {
			throw new RestException(403, 'Permission denied');
		}

		// Recherche par piece_num ou par rowid
		$sql = "SELECT * FROM " . MAIN_DB_PREFIX . "accounting_bookkeeping WHERE entity = " . (int)$conf->entity;
		$sql .= " AND (piece_num = " . (int)$id . " OR rowid = " . (int)$id . ")";
		$resql = $this->db->query($sql);
		if (!$resql || $this->db->num_rows($resql) == 0) {
			throw new RestException(404, 'Accounting entry not found');
		}

		$lines = array();
		while ($obj = $this->db->fetch_object($resql)) {
			$lines[] = $obj;
		}

		// Trouver le prochain piece_num
		$sqlMax = "SELECT MAX(piece_num) as max_num FROM " . MAIN_DB_PREFIX . "accounting_bookkeeping WHERE entity = " . (int)$conf->entity;
		$resMax = $this->db->query($sqlMax);
		$maxObj = $this->db->fetch_object($resMax);
		$new_piece_num = ($maxObj && $maxObj->max_num) ? ((int)$maxObj->max_num + 1) : 1;

		$inserted_ids = array();
		$reversal_doc_ref = 'EXT-' . ($lines[0]->doc_ref ? $lines[0]->doc_ref : $lines[0]->piece_num);
		$now = time();

		foreach ($lines as $line) {
			// Inversion stricte: débit <-> crédit
			$new_debit = (float)$line->credit;
			$new_credit = (float)$line->debit;
			$new_montant = $new_debit > 0 ? $new_debit : $new_credit;
			$new_sens = $new_debit > 0 ? 'D' : 'C';
			$new_label = 'EXTOURNE: ' . $line->label_operation;

			$insSql = "INSERT INTO " . MAIN_DB_PREFIX . "accounting_bookkeeping (";
			$insSql .= "entity, piece_num, doc_date, doc_type, doc_ref, fk_doc, numero_compte, label_compte, label_operation,";
			$insSql .= "debit, credit, montant, sens, fk_user_author, date_creation, code_journal";
			$insSql .= ") VALUES (";
			$insSql .= (int)$conf->entity . ", " . (int)$new_piece_num . ", '" . $this->db->idate($now) . "', 'OD', '" . $this->db->escape($reversal_doc_ref) . "', " . (int)$line->rowid . ", ";
			$insSql .= "'" . $this->db->escape($line->numero_compte) . "', '" . $this->db->escape($line->label_compte) . "', '" . $this->db->escape($new_label) . "', ";
			$insSql .= $new_debit . ", " . $new_credit . ", " . $new_montant . ", '" . $new_sens . "', " . (int)DolibarrApiAccess::$user->id . ", '" . $this->db->idate($now) . "', '" . $this->db->escape($line->code_journal) . "'";
			$insSql .= ")";

			$resIns = $this->db->query($insSql);
			if (!$resIns) {
				throw new RestException(500, 'Error writing reversal entry: ' . $this->db->lasterror());
			}
			$inserted_ids[] = $this->db->last_insert_id(MAIN_DB_PREFIX . "accounting_bookkeeping");
		}

		return array(
			'reversed' => true,
			'original_piece_num' => $lines[0]->piece_num,
			'new_piece_num' => $new_piece_num,
			'doc_ref' => $reversal_doc_ref,
			'line_ids' => $inserted_ids,
			'message' => 'Écriture comptable extournée avec succès (extourne équilibrée).'
		);
	}

	/**
	 * Liste des exercices comptables
	 *
	 * @param int $status Filtre statut (0=ouvert, 1=clos)
	 * @return array
	 * @url GET fiscalyears
	 */
	public function getFiscalyears($status = null)
	{
		global $conf;
		$sql = "SELECT rowid, label, date_start, date_end, statut, entity, datec, tms FROM " . MAIN_DB_PREFIX . "accounting_fiscalyear WHERE entity = " . (int)$conf->entity;
		if ($status !== null) {
			$sql .= " AND statut = " . (int)$status;
		}
		$sql .= " ORDER BY date_start DESC";

		$resql = $this->db->query($sql);
		$result = array();
		if ($resql) {
			while ($obj = $this->db->fetch_object($resql)) {
				$result[] = array(
					'id' => (int)$obj->rowid,
					'label' => $obj->label,
					'date_start' => $obj->date_start,
					'date_end' => $obj->date_end,
					'status' => (int)$obj->statut,
					'status_label' => (int)$obj->statut === 1 ? 'CLOS' : ((int)$obj->statut === 2 ? 'PRÉ-CLOS' : 'OUVERT'),
					'entity' => (int)$obj->entity,
				);
			}
		}
		return $result;
	}

	/**
	 * Créer un exercice comptable
	 *
	 * @param array $request_data
	 * @return array
	 * @url POST fiscalyears
	 * @throws RestException
	 */
	public function postFiscalyear($request_data = null)
	{
		global $conf;
		if (!DolibarrApiAccess::$user->rights->accounting->comptabilite->creer) {
			throw new RestException(403, 'Permission denied');
		}
		if (empty($request_data['label']) || empty($request_data['date_start']) || empty($request_data['date_end'])) {
			throw new RestException(400, 'label, date_start and date_end are required');
		}

		$label = trim($request_data['label']);
		$date_start = trim($request_data['date_start']);
		$date_end = trim($request_data['date_end']);
		$status = isset($request_data['status']) ? (int)$request_data['status'] : 0;

		$sql = "INSERT INTO " . MAIN_DB_PREFIX . "accounting_fiscalyear (label, date_start, date_end, statut, entity, datec, fk_user_author)";
		$sql .= " VALUES ('" . $this->db->escape($label) . "', '" . $this->db->escape($date_start) . "', '" . $this->db->escape($date_end) . "', " . $status . ", " . (int)$conf->entity . ", '" . $this->db->idate(time()) . "', " . (int)DolibarrApiAccess::$user->id . ")";

		$resql = $this->db->query($sql);
		if (!$resql) {
			throw new RestException(500, 'Error creating fiscal year: ' . $this->db->lasterror());
		}
		$id = $this->db->last_insert_id(MAIN_DB_PREFIX . "accounting_fiscalyear");
		return array('id' => $id, 'label' => $label, 'status' => $status, 'created' => true);
	}

	/**
	 * Mettre à jour un exercice comptable (ouverture, pré-clôture, etc.)
	 *
	 * @param int $id
	 * @param array $request_data
	 * @return array
	 * @url PUT fiscalyears/{id}
	 * @throws RestException
	 */
	public function putFiscalyear($id, $request_data = null)
	{
		global $conf;
		if (!DolibarrApiAccess::$user->rights->accounting->comptabilite->creer) {
			throw new RestException(403, 'Permission denied');
		}

		$updates = array();
		if (isset($request_data['label'])) $updates[] = "label = '" . $this->db->escape(trim($request_data['label'])) . "'";
		if (isset($request_data['status'])) $updates[] = "statut = " . (int)$request_data['status'];
		if (isset($request_data['date_start'])) $updates[] = "date_start = '" . $this->db->escape(trim($request_data['date_start'])) . "'";
		if (isset($request_data['date_end'])) $updates[] = "date_end = '" . $this->db->escape(trim($request_data['date_end'])) . "'";
		$updates[] = "fk_user_modif = " . (int)DolibarrApiAccess::$user->id;

		if (empty($updates)) {
			throw new RestException(400, 'No fields to update');
		}

		$sql = "UPDATE " . MAIN_DB_PREFIX . "accounting_fiscalyear SET " . implode(', ', $updates) . " WHERE rowid = " . (int)$id . " AND entity = " . (int)$conf->entity;
		$resql = $this->db->query($sql);
		if (!$resql) {
			throw new RestException(500, 'Error updating fiscal year: ' . $this->db->lasterror());
		}

		return array('id' => (int)$id, 'updated' => true);
	}

	/**
	 * Contrôles de fin d'exercice comptable
	 *
	 * @param int $id ID de l'exercice
	 * @return array
	 * @url GET fiscalyears/{id}/checks
	 * @throws RestException
	 */
	public function checkFiscalyear($id)
	{
		global $conf;
		$sqlFY = "SELECT * FROM " . MAIN_DB_PREFIX . "accounting_fiscalyear WHERE rowid = " . (int)$id . " AND entity = " . (int)$conf->entity;
		$resFY = $this->db->query($sqlFY);
		if (!$resFY || $this->db->num_rows($resFY) == 0) {
			throw new RestException(404, 'Fiscal year not found');
		}
		$fy = $this->db->fetch_object($resFY);

		// 1. Total Débit vs Total Crédit sur l'exercice
		$sqlTot = "SELECT SUM(debit) as tot_debit, SUM(credit) as tot_credit, COUNT(*) as nb_lines FROM " . MAIN_DB_PREFIX . "accounting_bookkeeping";
		$sqlTot .= " WHERE entity = " . (int)$conf->entity . " AND doc_date >= '" . $fy->date_start . "' AND doc_date <= '" . $fy->date_end . "'";
		$resTot = $this->db->query($sqlTot);
		$tot = $this->db->fetch_object($resTot);

		$totDebit = (float)($tot ? $tot->tot_debit : 0);
		$totCredit = (float)($tot ? $tot->tot_credit : 0);
		$diff = round(abs($totDebit - $totCredit), 2);
		$balanced = ($diff === 0.0);

		// 2. Factures non comptabilisées sur la période
		$sqlUnposted = "SELECT COUNT(*) as nb FROM " . MAIN_DB_PREFIX . "facture WHERE entity = " . (int)$conf->entity . " AND fk_statut > 0 AND datef >= '" . $fy->date_start . "' AND datef <= '" . $fy->date_end . "' AND rowid NOT IN (SELECT DISTINCT fk_doc FROM " . MAIN_DB_PREFIX . "accounting_bookkeeping WHERE entity = " . (int)$conf->entity . " AND doc_type = 'customer_invoice')";
		$resUnposted = $this->db->query($sqlUnposted);
		$unposted = $this->db->fetch_object($resUnposted);

		return array(
			'fiscal_year' => $fy->label,
			'date_start' => $fy->date_start,
			'date_end' => $fy->date_end,
			'total_debit' => $totDebit,
			'total_credit' => $totCredit,
			'difference' => $diff,
			'balance_equilibrée' => $balanced,
			'nb_ecritures' => (int)($tot ? $tot->nb_lines : 0),
			'factures_ventes_en_attente_ventilation' => (int)($unposted ? $unposted->nb : 0),
			'pret_pour_cloture' => ($balanced && (int)($unposted ? $unposted->nb : 0) === 0),
		);
	}

	/**
	 * Lignes bancaires non rapprochées
	 *
	 * @param int $account_id
	 * @param int $limit
	 * @return array
	 * @url GET reconciliation/{account_id}/unmatched
	 */
	public function getUnmatchedBankLines($account_id, $limit = 100)
	{
		$sql = "SELECT rowid, datev, dateo, amount, label, rappro, num_releve, fk_type FROM " . MAIN_DB_PREFIX . "bank";
		$sql .= " WHERE fk_account = " . (int)$account_id . " AND (rappro IS NULL OR rappro = 0)";
		$sql .= " ORDER BY datev DESC LIMIT " . (int)$limit;

		$resql = $this->db->query($sql);
		$lines = array();
		if ($resql) {
			while ($obj = $this->db->fetch_object($resql)) {
				$lines[] = array(
					'id' => (int)$obj->rowid,
					'date' => $obj->datev,
					'amount' => (float)$obj->amount,
					'label' => $obj->label,
					'type' => $obj->fk_type,
					'rappro' => 0,
				);
			}
		}
		return $lines;
	}

	/**
	 * Rapprocher des lignes bancaires
	 *
	 * @param int $account_id
	 * @param array $request_data
	 * @return array
	 * @url POST reconciliation/{account_id}/match
	 * @throws RestException
	 */
	public function matchBankLines($account_id, $request_data = null)
	{
		if (!DolibarrApiAccess::$user->rights->banque->consolidate) {
			throw new RestException(403, 'Permission denied');
		}
		if (empty($request_data['line_ids']) || empty($request_data['num_releve'])) {
			throw new RestException(400, 'line_ids and num_releve are required');
		}

		$releve = trim($request_data['num_releve']);
		$lineIds = array_map('intval', (array)$request_data['line_ids']);

		$sql = "UPDATE " . MAIN_DB_PREFIX . "bank SET rappro = 1, num_releve = '" . $this->db->escape($releve) . "'";
		$sql .= " WHERE fk_account = " . (int)$account_id . " AND rowid IN (" . implode(',', $lineIds) . ")";

		$resql = $this->db->query($sql);
		if (!$resql) {
			throw new RestException(500, 'Error matching bank lines: ' . $this->db->lasterror());
		}

		return array(
			'matched' => true,
			'num_releve' => $releve,
			'nb_lines' => count($lineIds),
			'account_id' => (int)$account_id,
		);
	}

	/**
	 * Dé-rapprocher une ligne bancaire
	 *
	 * @param int $account_id
	 * @param int $line_id
	 * @return array
	 * @url POST reconciliation/{account_id}/unreconcile/{line_id}
	 * @throws RestException
	 */
	public function unreconcileBankLine($account_id, $line_id)
	{
		if (!DolibarrApiAccess::$user->rights->banque->consolidate) {
			throw new RestException(403, 'Permission denied');
		}

		$sql = "UPDATE " . MAIN_DB_PREFIX . "bank SET rappro = 0, num_releve = ''";
		$sql .= " WHERE fk_account = " . (int)$account_id . " AND rowid = " . (int)$line_id;

		$resql = $this->db->query($sql);
		if (!$resql) {
			throw new RestException(500, 'Error unreconciling bank line: ' . $this->db->lasterror());
		}

		return array(
			'unreconciled' => true,
			'line_id' => (int)$line_id,
			'account_id' => (int)$account_id,
		);
	}
"""

    # Check if not already added
    if 'reverseEntry' not in content:
        # Find the last closing brace
        last_brace = content.rfind('}')
        if last_brace != -1:
            new_content = content[:last_brace] + extension_code + "\n}\n"
            with sftp.open(remote_path, 'w') as f:
                f.write(new_content)
            print("Successfully patched api_accountancy.class.php with fiscal years, reversal, and bank reconciliation!")
        else:
            print("Could not find closing brace")
    else:
        print("Already contains reverseEntry")

    sftp.close()
    ssh.close()

if __name__ == '__main__':
    patch_accountancy()
