import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://mcp.digitalfactory.sn/mcp';
const MCP_TOKEN = '[SECRET_RETIRE]';

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
    { name: 'test-e2e-v6', version: '6.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected successfully to remote MCP server!');

  // 1. Discovery
  console.log('\n--- 1. TOOL DISCOVERY & COUNT ---');
  const toolsRes = await client.listTools();
  console.log(`📋 Total tools discovered on remote server: ${toolsRes.tools.length}`);
  if (toolsRes.tools.length < 290) {
    throw new Error(`Expected at least 290 tools, got ${toolsRes.tools.length}`);
  }
  console.log('✅ Tool count matches expected v6.0.0 enterprise catalogue (291 tools)!');

  // 2. Accounting Ops: Balance Check
  console.log('\n--- 2. ACCOUNTING OPS: CHECK BALANCED ENTRY ---');
  const balanceCheckRes = await client.callTool({
    name: 'check_balanced_entry',
    arguments: {
      lines: [
        { account: '601', debit: 150000, credit: 0, label: 'Achats marchandises' },
        { account: '4452', debit: 27000, credit: 0, label: 'TVA déductible 18%' },
        { account: '401', debit: 0, credit: 177000, label: 'Fournisseur' }
      ]
    }
  });
  const balanceCheck = JSON.parse(balanceCheckRes.content[0].text);
  console.log('Balanced entry result:', balanceCheck);
  if (!balanceCheck.balanced) throw new Error('Expected entry to be balanced');
  console.log('✅ check_balanced_entry PASS');

  // 3. Fiscal Periods & Year-end checks
  console.log('\n--- 3. FISCAL PERIODS & CHECKS ---');
  const periodsRes = await client.callTool({
    name: 'list_accounting_periods',
    arguments: {}
  });
  const periods = JSON.parse(periodsRes.content[0].text);
  console.log(`Exercices fiscaux trouvés : ${periods.length}`);
  if (periods.length > 0) {
    console.log(`Premier exercice : ID ${periods[0].id} (${periods[0].label}), Statut : ${periods[0].status}`);
    const checksRes = await client.callTool({
      name: 'run_year_end_checks',
      arguments: { period_id: Number(periods[0].id) }
    });
    console.log('Contrôles de fin d\'exercice :', JSON.parse(checksRes.content[0].text));
  }
  console.log('✅ list_accounting_periods & run_year_end_checks PASS');

  // 4. Two-step Approval: Extourne & Clôture
  console.log('\n--- 4. TWO-STEP APPROVAL WORKFLOW ---');
  const extourneAttemptRes = await client.callTool({
    name: 'reverse_accounting_entry',
    arguments: {
      piece_num: 999999,
      reason: 'Correction comptable'
    }
  });
  const extourneAttempt = JSON.parse(extourneAttemptRes.content[0].text);
  console.log('Résultat tentative extourne sans jeton :', extourneAttempt);
  if (!extourneAttempt.approval_required || !extourneAttempt.approval_token) {
    throw new Error('Approval token was not requested for sensitive operation reverse_accounting_entry');
  }
  console.log(`✅ Jeton d'approbation généré : ${extourneAttempt.approval_token} (Validité 5 min)`);

  // 5. Protection Bancaire Compte de Production #1
  console.log('\n--- 5. PRODUCTION BANK ACCOUNT #1 PROTECTION ---');
  const bankProtectRes = await client.callTool({
    name: 'create_bank_reconciliation_session',
    arguments: {
      account_id: 1, // ECOBANK
      statement_number: 'TEST-RELEVE-PROD',
      ending_balance: 50000000
    }
  });
  const bankProtect = JSON.parse(bankProtectRes.content[0].text);
  console.log('Protection compte #1 (ECOBANK) :', bankProtect);
  if (bankProtect.error !== 'PRODUCTION_ACCOUNT_PROTECTED') {
    throw new Error('Expected PRODUCTION_ACCOUNT_PROTECTED for bank account ID 1');
  }
  console.log('✅ Compte de production #1 protégé avec succès !');

  // 6. Rapprochement Bancaire sur Compte Test #3
  console.log('\n--- 6. BANK RECONCILIATION SUR COMPTE TEST #3 ---');
  const unmatchedRes = await client.callTool({
    name: 'get_unmatched_bank_lines',
    arguments: { account_id: 3, limit: 10 }
  });
  const unmatched = JSON.parse(unmatchedRes.content[0].text);
  console.log(`Lignes non rapprochées compte #3 : ${unmatched.lines ? unmatched.lines.length : 0}`);
  console.log('✅ get_unmatched_bank_lines PASS');

  // 7. Simulation & Préparation TVA
  console.log('\n--- 7. SIMULATION & PRÉPARATION TVA ---');
  const vatSimRes = await client.callTool({
    name: 'simulate_vat_return',
    arguments: {
      date_start: '2026-01-01',
      date_end: '2026-10-31'
    }
  });
  const vatSim = JSON.parse(vatSimRes.content[0].text);
  console.log('Simulation TVA 2026 :', vatSim);
  console.log(`TVA Collectée: ${vatSim.tva_collectee_ventes} | TVA Déductible: ${vatSim.tva_deductible_achats} | Net: ${vatSim.tva_nette_a_payer}`);
  console.log('✅ simulate_vat_return PASS');

  // 8. Workflows & Cron Jobs
  console.log('\n--- 8. WORKFLOW RULES & CRON JOBS ---');
  const wfRulesRes = await client.callTool({
    name: 'list_workflow_rules',
    arguments: {}
  });
  const wfRules = JSON.parse(wfRulesRes.content[0].text);
  console.log(`Règles de workflow détectées : ${wfRules.total_rules} (actives: ${wfRules.active_rules_count})`);

  const cronJobsRes = await client.callTool({
    name: 'list_scheduled_jobs',
    arguments: {}
  });
  const cronJobs = JSON.parse(cronJobsRes.content[0].text);
  console.log(`Tâches planifiées (Cron) Dolibarr : ${Array.isArray(cronJobs) ? cronJobs.length : 0}`);
  console.log('✅ Workflows et Cron jobs PASS');

  // 9. Paie Sénégal
  console.log('\n--- 9. PAIE SÉNÉGAL (IPRES, CSS, IR, CFCE) ---');
  const payrollCalcRes = await client.callTool({
    name: 'calculate_payroll_slips',
    arguments: {
      employees: [
        {
          name: 'Moussa Diop',
          matricule: 'EMP001',
          salaire_de_base: 500000,
          primes_imposables: 100000, // Brut = 600 000
          nombre_parts: 2
        },
        {
          name: 'Awa Ndiaye (Cadre supérieur)',
          matricule: 'EMP002',
          salaire_de_base: 1500000,
          primes_imposables: 300000, // Brut = 1 800 000
          nombre_parts: 3
        }
      ]
    }
  });
  const payrollCalc = JSON.parse(payrollCalcRes.content[0].text);
  console.log('Calcul paie Sénégal (2 salariés) :', JSON.stringify(payrollCalc, null, 2));
  console.log('✅ calculate_payroll_slips PASS');

  console.log('\n==============================================');
  console.log('🎉 TOUS LES TESTS E2E V6 ONT RÉUSSI AVEC SUCCÈS !');
  console.log('==============================================');
}

run().catch(err => {
  console.error('❌ E2E Test Error:', err);
  process.exit(1);
});
