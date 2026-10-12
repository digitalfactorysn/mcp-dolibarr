import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://mcp.digitalfactory.sn/mcp';
const MCP_TOKEN = '[SECRET_RETIRE]';

async function testAll8Priorities() {
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
    { name: 'validator-8-priorities', version: '6.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected successfully to remote MCP server!\n');

  let passed = 0;
  const total = 8;

  // PRIORITY 1: corriger le solde de get_bank_account
  console.log('====================================================');
  console.log('TEST 1/8: get_bank_account balance calculation');
  console.log('====================================================');
  try {
    const res1 = await client.callTool({
      name: 'get_bank_account',
      arguments: { id: 1 }
    });
    const data1 = JSON.parse(res1.content[0].text);
    console.log(`Compte bancaire #1: ${data1.ref} (${data1.label})`);
    console.log(`Solde calculé dynamique: ${data1.balance ?? data1.solde} FCFA (lignes: ${data1.transactions_count})`);
    if ((data1.balance !== undefined || data1.solde !== undefined) && data1.transactions_count > 0) {
      console.log('✅ PASS 1: Solde dynamique calculé avec succès.');
      passed++;
    } else {
      console.error('❌ FAIL 1: Solde non calculé ou lignes manquantes', data1);
    }
  } catch (err) {
    console.error('❌ FAIL 1 Error:', err.message);
  }

  // PRIORITY 2: corriger list_supplier_orders
  console.log('\n====================================================');
  console.log('TEST 2/8: list_supplier_orders real data');
  console.log('====================================================');
  try {
    const res2 = await client.callTool({
      name: 'list_supplier_orders',
      arguments: { limit: 10 }
    });
    const data2 = JSON.parse(res2.content[0].text);
    console.log(`Commandes fournisseurs retournées: ${data2.length}`);
    if (data2.length > 0) {
      console.log(`Première commande: Réf: ${data2[0].ref}, Total HT: ${data2[0].total_ht ?? data2[0].total_net}`);
    }
    const hasNullSpecimen = data2.some(o => !o.ref && !o.id);
    if (!hasNullSpecimen && data2.length > 0) {
      console.log('✅ PASS 2: Commandes fournisseurs réelles listées sans spécimen nul.');
      passed++;
    } else {
      console.error('❌ FAIL 2: Spécimen nul trouvé ou liste vide', data2);
    }
  } catch (err) {
    console.error('❌ FAIL 2 Error:', err.message);
  }

  // PRIORITY 3: rendre les simulations de workflow spécifiques et vérifiables
  console.log('\n====================================================');
  console.log('TEST 3/8: test_workflow_rule verifiable simulation');
  console.log('====================================================');
  try {
    const res3 = await client.callTool({
      name: 'test_workflow_rule',
      arguments: {
        rule_code: 'BILL_ADD_PAYMENT_TO_BANK',
        target_object_id: 1,
        target_object_type: 'invoice'
      }
    });
    const data3 = JSON.parse(res3.content[0].text);
    console.log('Simulation workflow:', {
      rule_code: data3.rule_code,
      verifiable: data3.verifiable,
      test_checksum: data3.test_checksum,
      target_ref: data3.target_object?.ref,
      verdict: data3.verdict
    });
    if (data3.verifiable === true && data3.test_checksum && data3.target_object?.ref) {
      console.log('✅ PASS 3: Simulation de workflow spécifique, chiffrée et vérifiable.');
      passed++;
    } else {
      console.error('❌ FAIL 3: Checksum manquant ou cible non évaluée', data3);
    }
  } catch (err) {
    console.error('❌ FAIL 3 Error:', err.message);
  }

  // PRIORITY 4: transformer get_workflow_execution_log en véritable historique
  console.log('\n====================================================');
  console.log('TEST 4/8: get_workflow_execution_log real audit history');
  console.log('====================================================');
  try {
    const res4 = await client.callTool({
      name: 'get_workflow_execution_log',
      arguments: { limit: 15 }
    });
    const data4 = JSON.parse(res4.content[0].text);
    console.log('Log historique consolidé:');
    console.log(`- Total événements d'audit Dolibarr: ${data4.total_evenements_audit}`);
    console.log(`- Total jobs planifiés Cron        : ${data4.total_jobs_planifies}`);
    console.log(`- Total opérations MCP tracées      : ${data4.total_operations_mcp}`);
    console.log(`- Événements récents inspectés     : ${data4.evenements_recents?.length}`);
    if (data4.total_evenements_audit > 0 && data4.evenements_recents?.length > 0) {
      console.log('✅ PASS 4: Véritable historique d\'audit consolidé avec Dolibarr.');
      passed++;
    } else {
      console.error('❌ FAIL 4: Historique d\'audit vide ou non structuré', data4);
    }
  } catch (err) {
    console.error('❌ FAIL 4 Error:', err.message);
  }

  // PRIORITY 5: masquer les clés présentes dans les URL de paiement
  console.log('\n====================================================');
  console.log('TEST 5/8: mask payment URLs sensitive tokens');
  console.log('====================================================');
  try {
    const res5 = await client.callTool({
      name: 'get_invoice',
      arguments: { id: 1 }
    });
    const data5 = JSON.parse(res5.content[0].text);
    console.log(`Facture #1 Réf: ${data5.ref}`);
    const payUrl = data5.online_payment_url;
    console.log(`URL de paiement: ${payUrl}`);
    if (payUrl && payUrl.includes('securekey=***MASKED***')) {
      console.log('✅ PASS 5: Clés de paiement masquées dans les URL publiques.');
      passed++;
    } else {
      console.error('❌ FAIL 5: Clé en clair ou URL manquante:', payUrl);
    }
  } catch (err) {
    console.error('❌ FAIL 5 Error:', err.message);
  }

  // PRIORITY 6: ajouter provenance et dates d’effet aux paramètres de paie
  console.log('\n====================================================');
  console.log('TEST 6/8: get_payroll_config legal provenance & effective dates');
  console.log('====================================================');
  try {
    const res6 = await client.callTool({
      name: 'get_payroll_config',
      arguments: {}
    });
    const data6 = JSON.parse(res6.content[0].text);
    console.log(`Pays: ${data6.pays}, Cadre: ${data6.cadre_reglementaire}`);
    console.log(`SMIC: ${data6.smic?.montant_mensuel} FCFA (Date d'effet: ${data6.smic?.date_effet}, Base légale: ${data6.smic?.provenance_legale?.substring(0, 45)}...)`);
    console.log(`IPRES Régime Général: Base légale: ${data6.cotisations_sociales?.ipres_regime_general?.provenance_legale?.substring(0, 45)}...`);
    console.log(`CFCE: Base légale: ${data6.cotisations_fiscales?.cfce?.provenance_legale?.substring(0, 45)}...`);
    if (data6.smic?.provenance_legale && data6.smic?.date_effet && data6.cotisations_sociales?.ipres_regime_general?.provenance_legale) {
      console.log('✅ PASS 6: Provenance légale sénégalaise et dates d\'effet enrichies.');
      passed++;
    } else {
      console.error('❌ FAIL 6: Métadonnées de provenance manquantes', data6);
    }
  } catch (err) {
    console.error('❌ FAIL 6 Error:', err.message);
  }

  // PRIORITY 7: restaurer ou documenter le remplacement de get_setup_values
  console.log('\n====================================================');
  console.log('TEST 7/8: get_setup_values fallback & documentation');
  console.log('====================================================');
  try {
    const res7 = await client.callTool({
      name: 'get_setup_values',
      arguments: { constant: 'ACCOUNTING' }
    });
    const data7 = JSON.parse(res7.content[0].text);
    console.log(`Documentation de remplacement: ${data7.documentation?.substring(0, 75)}...`);
    console.log(`Nombre de constantes trouvées via fallback: ${data7.total_matches}`);
    if (typeof data7.documentation === 'string' && data7.total_matches > 0 && Object.keys(data7.constants || {}).length > 0) {
      console.log('✅ PASS 7: Fallback robuste et documentation claire du remplacement.');
      passed++;
    } else {
      console.error('❌ FAIL 7: Résultat non documenté ou vide', data7);
    }
  } catch (err) {
    console.error('❌ FAIL 7 Error:', err.message);
  }

  // PRIORITY 8: fermer le compte de test ID 5 ou le rattacher à un journal actif
  console.log('\n====================================================');
  console.log('TEST 8/8: test bank account ID 5 closed and linked');
  console.log('====================================================');
  try {
    const res8 = await client.callTool({
      name: 'get_bank_account',
      arguments: { id: 5 }
    });
    const data8 = JSON.parse(res8.content[0].text);
    console.log(`Compte #5: ${data8.ref} - Clos: ${data8.clos}, Journal ID: ${data8.fk_accountancy_journal}`);
    if (data8.clos == 1 && data8.fk_accountancy_journal == 3) {
      console.log('✅ PASS 8: Compte #5 proprement clôturé (clos=1) et rattaché au journal actif BQ (ID 3).');
      passed++;
    } else {
      console.error('❌ FAIL 8: Compte non clôturé ou mauvais journal', data8);
    }
  } catch (err) {
    console.error('❌ FAIL 8 Error:', err.message);
  }

  console.log('\n====================================================');
  console.log(`RÉSULTAT GLOBAL: ${passed}/${total} TESTS RÉUSSIS`);
  console.log('====================================================');

  process.exit(passed === total ? 0 : 1);
}

testAll8Priorities().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
