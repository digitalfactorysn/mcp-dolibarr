import subprocess

patch_code = '''        /**
         * Get all setup variables with optional filtering
         *
         * @param string        $module         Filter by module prefix (e.g. FACTURE, MAIN)
         * @param string        $search         Filter by keyword in name or value
         * @param int           $limit          Limit results (0 for all)
         * @param int           $page           Page index
         * @return array        List of constants
         *
         * @url     GET conf/
         *
         * @throws RestException 400 Error Bad or unknown value for constantname
         * @throws RestException 403 Forbidden
         */
        public function getConfs($module = '', $search = '', $limit = 0, $page = 0)
        {
                $list = array();

                if (!DolibarrApiAccess::$user->admin
                        && (!getDolGlobalString('API_LOGINS_ALLOWED_FOR_CONST_READ') || DolibarrApiAccess::$user->login != getDolGlobalString('API_LOGINS_ALLOWED_FOR_CONST_READ'))) {
                        throw new RestException(403, 'Error API open to admin users only or to the users with logins defined into constant API_LOGINS_ALLOWED_FOR_CONST_READ');
                }

                $sql = "select name, value";
                $sql .= " FROM ".MAIN_DB_PREFIX."const";
                $sql .= " WHERE entity IN (".getEntity('const').')';

                if (!empty($module)) {
                        $modClean = preg_replace('/[^a-zA-Z0-9_]/', '', $module);
                        $sql .= " AND name LIKE '".$this->db->escape($modClean)."%'";
                }
                if (!empty($search)) {
                        $sql .= " AND (name LIKE '%".$this->db->escape($search)."%' OR value LIKE '%".$this->db->escape($search)."%')";
                }
                $sql .= " ORDER BY name ASC";
                if ($limit > 0) {
                        $sql .= $this->db->plimit((int)$limit, (int)$page * (int)$limit);
                }

                $result = $this->db->query($sql);

                if ($result) {
                        $num = $this->db->num_rows($result);
                        for ($i = 0; $i < $num; $i++) {
                                $obj = $this->db->fetch_object($result);
                                if (!isASecretKey($obj->name)) {
                                        // We do not return secret keys
                                        $list[$obj->name] = $obj->value;
                                }
                        }
                } else {
                        throw new RestException(503, 'Error when retrieving list of const : '.$this->db->lasterror());
                }

                return $list;
        }

        /**
         * Set or update a setup variable
         *
         * @param array $request_data Request data containing constname and constvalue
         * @return array Result of operation
         *
         * @url POST conf/
         *
         * @throws RestException 400 Bad request
         * @throws RestException 403 Forbidden
         */
        public function postConf($request_data = null)
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin) {
                        throw new RestException(403, 'Error API open to admin users only');
                }

                $name = isset($request_data['constname']) ? $request_data['constname'] : (isset($request_data['name']) ? $request_data['name'] : (isset($request_data['constant']) ? $request_data['constant'] : ''));
                $value = isset($request_data['constvalue']) ? $request_data['constvalue'] : (isset($request_data['value']) ? $request_data['value'] : '');

                if (empty($name) || !preg_match('/^[a-zA-Z0-9_]+$/', $name)) {
                        throw new RestException(400, 'Error Bad or unknown value for constantname');
                }

                require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
                $res = dolibarr_set_const($this->db, $name, $value, 'chaine', 0, '', $conf->entity);
                if ($res < 0) {
                        throw new RestException(500, 'Error writing constant: '.$this->db->lasterror());
                }

                return array('success' => true, 'constant' => $name, 'value' => $value);
        }

        /**
         * Update a setup variable
         *
         * @param string $constantname Constant name
         * @param array $request_data Request data containing value
         * @return array Result of operation
         *
         * @url PUT conf/{constantname}
         *
         * @throws RestException 400 Bad request
         * @throws RestException 403 Forbidden
         */
        public function putConf($constantname, $request_data = null)
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin) {
                        throw new RestException(403, 'Error API open to admin users only');
                }

                if (empty($constantname) || !preg_match('/^[a-zA-Z0-9_]+$/', $constantname)) {
                        throw new RestException(400, 'Error Bad or unknown value for constantname');
                }

                $value = isset($request_data['value']) ? $request_data['value'] : (isset($request_data['constvalue']) ? $request_data['constvalue'] : '');

                require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
                $res = dolibarr_set_const($this->db, $constantname, $value, 'chaine', 0, '', $conf->entity);
                if ($res < 0) {
                        throw new RestException(500, 'Error writing constant: '.$this->db->lasterror());
                }

                return array('success' => true, 'constant' => $constantname, 'value' => $value);
        }

        /**
         * Delete a setup variable
         *
         * @param string $constantname Constant name
         * @return array Result of operation
         *
         * @url DELETE conf/{constantname}
         *
         * @throws RestException 400 Bad request
         * @throws RestException 403 Forbidden
         */
        public function deleteConf($constantname)
        {
                global $conf;

                if (!DolibarrApiAccess::$user->admin) {
                        throw new RestException(403, 'Error API open to admin users only');
                }

                if (empty($constantname) || !preg_match('/^[a-zA-Z0-9_]+$/', $constantname)) {
                        throw new RestException(400, 'Error Bad or unknown value for constantname');
                }

                require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
                $res = dolibarr_del_const($this->db, $constantname, $conf->entity);
                if ($res < 0) {
                        throw new RestException(500, 'Error deleting constant: '.$this->db->lasterror());
                }

                return array('success' => true, 'constant' => $constantname, 'deleted' => true);
        }
'''

def main():
    cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@108.175.11.116', 'cat /var/www/vhosts/digitalfactory.sn/httpdocs/DIGITALFACTORY/GESTIONDIGITALFACTORY/api/class/api_setup.class.php']
    content = subprocess.check_output(cmd).decode('utf-8')

    start_idx = content.find('public function getConfs()')
    if start_idx == -1:
        print('Error: getConfs() not found')
        return

    comment_start = content.rfind('/**', 0, start_idx)
    brace_count = 0
    open_brace_idx = content.find('{', start_idx)
    end_idx = open_brace_idx
    for i in range(open_brace_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break

    print(f'Replacing from {comment_start} to {end_idx}')
    new_content = content[:comment_start] + patch_code.strip() + '\n\n' + content[end_idx:]

    p = subprocess.Popen(['ssh', '-o', 'StrictHostKeyChecking=no', 'root@108.175.11.116', 'cat > /var/www/vhosts/digitalfactory.sn/httpdocs/DIGITALFACTORY/GESTIONDIGITALFACTORY/api/class/api_setup.class.php'], stdin=subprocess.PIPE)
    p.communicate(new_content.encode('utf-8'))
    if p.returncode == 0:
        print('api_setup.class.php successfully patched on Dolibarr VPS!')
    else:
        print('Failed to patch api_setup.class.php')

if __name__ == '__main__':
    main()
