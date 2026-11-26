import subprocess

methods_to_add = '''
        /**
         * Delete an accounting journal by ID
         *
         * @url DELETE journals/{id}
         * @param int $id ID of accounting journal
         * @return array
         * @throws RestException
         */
        public function deleteJournal($id)
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin && !DolibarrApiAccess::$user->hasRight('accounting', 'comptabilite', 'supprimer')) {
                        throw new RestException(403);
                }

                $sql = "DELETE FROM " . MAIN_DB_PREFIX . "accounting_journal";
                $sql .= " WHERE rowid = " . ((int) $id) . " AND entity IN (" . getEntity('accounting_journal') . ")";

                $resql = $this->db->query($sql);
                if (!$resql) {
                        throw new RestException(500, 'Error deleting journal: ' . $this->db->lasterror());
                }

                return array('success' => true, 'id' => (int) $id, 'deleted' => true);
        }

        /**
         * Delete an accounting account by ID
         *
         * @url DELETE accounts/{id}
         * @param int $id ID of accounting account
         * @return array
         * @throws RestException
         */
        public function deleteAccount($id)
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin && !DolibarrApiAccess::$user->hasRight('accounting', 'comptabilite', 'supprimer')) {
                        throw new RestException(403);
                }

                $sql = "DELETE FROM " . MAIN_DB_PREFIX . "accounting_account";
                $sql .= " WHERE rowid = " . ((int) $id) . " AND entity IN (" . getEntity('accounting_account') . ")";

                $resql = $this->db->query($sql);
                if (!$resql) {
                        throw new RestException(500, 'Error deleting account: ' . $this->db->lasterror());
                }

                return array('success' => true, 'id' => (int) $id, 'deleted' => true);
        }

        /**
         * Get accounting entries from bookkeeping
         *
         * @url GET bookkeeping
         * @param string $sortfield Sort field
         * @param string $sortorder Sort order (ASC, DESC)
         * @param int $limit Number of entries
         * @param int $page Page number
         * @param string $journal_code Journal code
         * @param string $account_number Account number
         * @param string $date_start Start date (YYYY-MM-DD or timestamp)
         * @param string $date_end End date (YYYY-MM-DD or timestamp)
         * @return array
         * @throws RestException
         */
        public function getBookkeeping($sortfield = 't.rowid', $sortorder = 'ASC', $limit = 100, $page = 0, $journal_code = '', $account_number = '', $date_start = '', $date_end = '')
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin && !DolibarrApiAccess::$user->hasRight('accounting', 'comptabilite', 'lire')) {
                        throw new RestException(403);
                }

                $sql = "SELECT t.rowid as id, t.piece_num, t.doc_date, t.doc_type, t.doc_ref, t.fk_doc,";
                $sql .= " t.numero_compte, t.label_compte, t.label_operation, t.debit, t.credit, t.montant,";
                $sql .= " t.code_journal, t.journal_label";
                $sql .= " FROM " . MAIN_DB_PREFIX . "accounting_bookkeeping as t";
                $sql .= " WHERE t.entity IN (" . getEntity('accounting_bookkeeping') . ")";

                if (!empty($journal_code)) {
                        $sql .= " AND t.code_journal = '" . $this->db->escape(trim($journal_code)) . "'";
                }
                if (!empty($account_number)) {
                        $sql .= " AND t.numero_compte LIKE '" . $this->db->escape(trim($account_number)) . "%'";
                }
                if (!empty($date_start)) {
                        $ds = is_numeric($date_start) ? date('Y-m-d', $date_start) : $date_start;
                        $sql .= " AND t.doc_date >= '" . $this->db->escape($ds) . "'";
                }
                if (!empty($date_end)) {
                        $de = is_numeric($date_end) ? date('Y-m-d', $date_end) : $date_end;
                        $sql .= " AND t.doc_date <= '" . $this->db->escape($de) . "'";
                }

                $sql .= " ORDER BY " . $this->db->escape($sortfield) . " " . $this->db->escape($sortorder);
                if ($limit > 0) {
                        $sql .= $this->db->plimit((int)$limit, (int)$page * (int)$limit);
                }

                $resql = $this->db->query($sql);
                if (!$resql) {
                        throw new RestException(500, 'Error querying bookkeeping: ' . $this->db->lasterror());
                }

                $list = array();
                while ($obj = $this->db->fetch_object($resql)) {
                        $list[] = $obj;
                }
                return $list;
        }

        /**
         * Add an accounting entry to bookkeeping (OD or manual)
         *
         * @url POST bookkeeping
         * @param array $request_data Entry details
         * @return array
         * @throws RestException
         */
        public function postBookkeeping($request_data = null)
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin && !DolibarrApiAccess::$user->hasRight('accounting', 'comptabilite', 'creer')) {
                        throw new RestException(403);
                }

                if (empty($request_data)) {
                        throw new RestException(400, 'Request data empty');
                }

                $doc_date = !empty($request_data['doc_date']) ? (is_numeric($request_data['doc_date']) ? date('Y-m-d', $request_data['doc_date']) : $request_data['doc_date']) : date('Y-m-d');
                $code_journal = !empty($request_data['code_journal']) ? trim($request_data['code_journal']) : 'OD';
                $piece_num = !empty($request_data['piece_num']) ? (int)$request_data['piece_num'] : time();
                $doc_ref = !empty($request_data['doc_ref']) ? trim($request_data['doc_ref']) : 'OD-'.date('Ymd-His');
                $label = !empty($request_data['label']) ? trim($request_data['label']) : 'Ecriture OD MCP';

                $lines = !empty($request_data['lines']) && is_array($request_data['lines']) ? $request_data['lines'] : array();
                if (empty($lines)) {
                        // Single line entry
                        $lines[] = array(
                                'numero_compte' => !empty($request_data['numero_compte']) ? $request_data['numero_compte'] : '471',
                                'label_compte' => !empty($request_data['label_compte']) ? $request_data['label_compte'] : $label,
                                'debit' => !empty($request_data['debit']) ? (float)$request_data['debit'] : 0,
                                'credit' => !empty($request_data['credit']) ? (float)$request_data['credit'] : 0,
                        );
                }

                $inserted_ids = array();
                foreach ($lines as $line) {
                        $acc = !empty($line['numero_compte']) ? trim($line['numero_compte']) : '471';
                        $lbl_compte = !empty($line['label_compte']) ? trim($line['label_compte']) : $label;
                        $debit = !empty($line['debit']) ? (float)$line['debit'] : 0;
                        $credit = !empty($line['credit']) ? (float)$line['credit'] : 0;
                        $montant = $debit > 0 ? $debit : $credit;
                        $sens = $debit > 0 ? 'D' : 'C';

                        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "accounting_bookkeeping (";
                        $sql .= "entity, piece_num, doc_date, doc_type, doc_ref, fk_doc, numero_compte, label_compte, label_operation,";
                        $sql .= "debit, credit, montant, sens, fk_user_author, date_creation, code_journal";
                        $sql .= ") VALUES (";
                        $sql .= (int)$conf->entity . ", " . (int)$piece_num . ", '" . $this->db->escape($doc_date) . "', 'OD', '" . $this->db->escape($doc_ref) . "', 0, ";
                        $sql .= "'" . $this->db->escape($acc) . "', '" . $this->db->escape($lbl_compte) . "', '" . $this->db->escape($label) . "', ";
                        $sql .= $debit . ", " . $credit . ", " . $montant . ", '" . $sens . "', " . (int)DolibarrApiAccess::$user->id . ", '" . $this->db->idate(time()) . "', '" . $this->db->escape($code_journal) . "'";
                        $sql .= ")";

                        $resql = $this->db->query($sql);
                        if (!$resql) {
                                throw new RestException(500, 'Error inserting bookkeeping entry: ' . $this->db->lasterror());
                        }
                        $inserted_ids[] = $this->db->last_insert_id(MAIN_DB_PREFIX . "accounting_bookkeeping");
                }

                return array('success' => true, 'piece_num' => $piece_num, 'doc_ref' => $doc_ref, 'line_ids' => $inserted_ids);
        }
'''

def main():
    cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@108.175.11.116', 'cat /var/www/vhosts/digitalfactory.sn/httpdocs/DIGITALFACTORY/GESTIONDIGITALFACTORY/accountancy/class/api_accountancy.class.php']
    content = subprocess.check_output(cmd).decode('utf-8')

    # Update getJournals signature to support $code and $nature filtering
    old_sig = 'public function getJournals($active = 1)'
    new_sig = 'public function getJournals($active = 1, $code = \'\', $nature = 0)'
    if old_sig in content:
        content = content.replace(old_sig, new_sig, 1)
        # Also add SQL conditions inside getJournals
        target_sql = 'if ($active !== -1 && $active !== null && $active !== \'\') {'
        replacement_sql = '''if (!empty($code)) {
                        $sql .= " AND code = '" . $this->db->escape(trim($code)) . "'";
                }
                if (!empty($nature)) {
                        $sql .= " AND nature = " . ((int) $nature);
                }
                if ($active !== -1 && $active !== null && $active !== '') {'''
        content = content.replace(target_sql, replacement_sql, 1)

    # Insert methods before the last closing brace
    last_brace_idx = content.rfind('}')
    if last_brace_idx == -1:
        print('Error: closing brace not found')
        return

    new_content = content[:last_brace_idx] + methods_to_add + '\n}\n'

    p = subprocess.Popen(['ssh', '-o', 'StrictHostKeyChecking=no', 'root@108.175.11.116', 'cat > /var/www/vhosts/digitalfactory.sn/httpdocs/DIGITALFACTORY/GESTIONDIGITALFACTORY/accountancy/class/api_accountancy.class.php'], stdin=subprocess.PIPE)
    p.communicate(new_content.encode('utf-8'))
    if p.returncode == 0:
        print('api_accountancy.class.php successfully patched on Dolibarr VPS!')
    else:
        print('Failed to patch api_accountancy.class.php')

if __name__ == '__main__':
    main()
