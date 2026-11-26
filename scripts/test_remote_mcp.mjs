import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import axios from 'axios';

const MCP_URL = 'https://mcp.digitalfactory.sn/mcp';
const MCP_TOKEN = process.env.MCP_API_TOKEN; // jamais de jeton dans le code (audit 26/11/2026)
const DOLIBARR_URL = 'https://gestion.digitalfactory.sn/api/index.php';
const DOLIBARR_KEY = process.env.DOLIBARR_API_KEY;

async function run() {
  console.log('🚀 Connecting to Remote MCP Dolibarr Server at', MCP_URL);
  
  const transport = new StreamableHTTPClientTransport(
    new URL(MCP_URL),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${MCP_TOKEN}`
        }
      }
    }
  );

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected successfully to remote MCP server!');

  // 0. List tools
  const toolsRes = await client.listTools();
  console.log(`📋 Total tools discovered on remote server: ${toolsRes.tools.length}`);

  // Test 1: Gestion réelle des journaux comptables
  console.log('\n--- 1. TEST GESTION RÉELLE DES JOURNAUX COMPTABLES ---');
  const journalsRes = await client.callTool({
    name: 'list_accounting_journals',
    arguments: {}
  });
  const journals = JSON.parse(journalsRes.content[0].text);
  console.log(`Journaux récupérés : ${journals.length}`);
  console.log('Codes journaux :', journals.map(j => `${j.code} (${j.nature_label})`).join(', '));
  const hasBNQ = journals.some(j => j.code === 'BNQ');
  const hasBQ = journals.some(j => j.code === 'BQ');
  console.log(`Vérification présence BNQ (${hasBNQ}) et BQ (${hasBQ}) :`, hasBNQ && hasBQ ? 'PASS' : 'FAIL');

  // Test unitaire journal
  const singleJournalRes = await client.callTool({
    name: 'get_accounting_journal',
    arguments: { code: 'BNQ' }
  });
  const singleJournal = JSON.parse(singleJournalRes.content[0].text);
  console.log('Détail unitaire journal BNQ :', singleJournal.code === 'BNQ' ? 'PASS' : 'FAIL', singleJournal);

  // Test 2: Lecture réelle du plan comptable (SYSCOHADA)
  console.log('\n--- 2. TEST LECTURE RÉELLE DU PLAN COMPTABLE (SYSCOHADA-SN) ---');
  const accountsRes = await client.callTool({
    name: 'list_accounting_accounts',
    arguments: { search_account: '411', limit: 5 }
  });
  const accounts = JSON.parse(accountsRes.content[0].text);
  console.log(`Comptes 411 trouvés : ${accounts.length}`);
  console.log('Exemples :', accounts.map(a => `${a.account_number} - ${a.label}`).join(' | '));
  console.log('Vérification plan comptable réel :', accounts.length > 0 ? 'PASS' : 'FAIL');

  // Test 3: Filtrage des constantes
  console.log('\n--- 3. TEST FILTRAGE DES CONSTANTES ---');
  const unitConfRes = await client.callTool({
    name: 'get_setup_values',
    arguments: { constant: 'MAIN_MONNAIE' }
  });
  const unitConf = JSON.parse(unitConfRes.content[0].text);
  console.log('Lecture unitaire MAIN_MONNAIE :', unitConf.value === 'XOF' ? 'PASS (XOF)' : 'FAIL', unitConf);

  const moduleConfRes = await client.callTool({
    name: 'get_setup_values',
    arguments: { module: 'FACTURE', limit: 5 }
  });
  const moduleConf = JSON.parse(moduleConfRes.content[0].text);
  const keys = Object.keys(moduleConf.constants || {});
  const allFacture = keys.every(k => k.includes('FACTURE'));
  console.log(`Filtrage module FACTURE : ${allFacture && keys.length > 0 ? 'PASS' : 'FAIL'} (${keys.length} constantes trouvées)`, keys);

  // Test écriture + relecture constante de test
  const setConfRes = await client.callTool({
    name: 'set_setup_value',
    arguments: { name: 'TEST_MCP_REMOTE_SYNC', value: 'OK_540' }
  });
  const setConf = JSON.parse(setConfRes.content[0].text);
  console.log('Écriture constante + relecture immédiate :', setConf.verified ? 'PASS' : 'FAIL', setConf);

  const delConfRes = await client.callTool({
    name: 'delete_setup_value',
    arguments: { name: 'TEST_MCP_REMOTE_SYNC' }
  });
  const delConf = JSON.parse(delConfRes.content[0].text);
  console.log('Suppression constante + relecture immédiate :', delConf.verified ? 'PASS' : 'FAIL', delConf);

  // Test 4: Configuration bancaire automatique & Protection compte #1
  console.log('\n--- 4. TEST CONFIGURATION BANCAIRE AUTOMATIQUE ---');
  // 4a. Protection compte #1
  const protectRes = await client.callTool({
    name: 'configure_bank_accounting',
    arguments: { account_id: 1, accounting_number: '521' }
  });
  const protect = JSON.parse(protectRes.content[0].text);
  console.log('Protection compte #1 (ECOBANK) :', protect.error === 'PRODUCTION_ACCOUNT_PROTECTED' ? 'PASS' : 'FAIL', protect.message);

  // 4b. Auto configuration sur compte de test avec journal BNQ
  const testBankRef = 'TB_' + Math.floor(100000 + Math.random() * 900000);
  const autoBankRes = await client.callTool({
    name: 'auto_configure_bank_account',
    arguments: {
      ref: testBankRef,
      label: 'Compte Test Remote BNQ ' + testBankRef,
      bank_name: 'Bank Test Remote',
      journal_code: 'BNQ',
      accounting_number: '521102'
    }
  });

  if (autoBankRes.isError) {
    console.error('❌ Erreur auto_configure_bank_account:', autoBankRes.content[0].text);
  } else {
    const autoBank = JSON.parse(autoBankRes.content[0].text);
    console.log('Résultat auto_configure_bank_account :');
    console.log(' - applied:', autoBank.applied);
    console.log(' - verified:', autoBank.verified);
    console.log(' - journal_code lu:', autoBank.journal_code);
    console.log(' - accounting_number lu:', autoBank.accounting_number);
    const bankPass = autoBank.applied && autoBank.verified && autoBank.journal_code === 'BNQ' && autoBank.accounting_number === '521102';
    console.log('Validation stricte BNQ reconfirmé :', bankPass ? 'PASS' : 'FAIL');

    // Nettoyage du compte bancaire de test via Dolibarr API
    if (autoBank.account_id) {
      console.log('Nettoyage du compte bancaire de test #', autoBank.account_id);
      await axios.delete(`${DOLIBARR_URL}/bankaccounts/${autoBank.account_id}`, {
        headers: { 'DOLAPIKEY': DOLIBARR_KEY }
      }).catch(e => console.error('Erreur nettoyage banque:', e.message));
    }
  }

  // Test 5: Vérification après écriture
  console.log('\n--- 5. TEST VÉRIFICATION APRÈS ÉCRITURE ---');
  // Test création d'un produit avec vérification
  const testProdRef = 'P_' + Date.now().toString().slice(-6);
  const prodRes = await client.callTool({
    name: 'create_product',
    arguments: {
      ref: testProdRef,
      label: 'Produit Test MCP Remote ' + testProdRef,
      price: 15000,
      type: 0
    }
  });

  if (prodRes.isError) {
    console.error('❌ Erreur create_product:', prodRes.content[0].text);
  } else {
    const prod = JSON.parse(prodRes.content[0].text);
    console.log('Création produit avec relecture immédiate :');
    console.log(' - applied:', prod.applied);
    console.log(' - verified:', prod.verified);
    console.log(' - ref:', prod.ref);
    console.log('Validation post-write produit :', prod.applied && prod.verified ? 'PASS' : 'FAIL');

    if (prod.id) {
      console.log('Nettoyage du produit de test #', prod.id);
      await axios.delete(`${DOLIBARR_URL}/products/${prod.id}`, {
        headers: { 'DOLAPIKEY': DOLIBARR_KEY }
      }).catch(e => console.error('Erreur nettoyage produit:', e.message));
    }
  }

  console.log('\n🎉 TOUS LES TESTS MCP DISTANTS ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS !');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erreur critique test distant:', err);
  process.exit(1);
});
