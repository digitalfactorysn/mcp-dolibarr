import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://mcp.digitalfactory.sn/mcp';
const MCP_TOKEN = process.env.MCP_API_TOKEN; // jamais de jeton dans le code (audit 26/11/2026)

async function main() {
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
    { name: 'validator-user-anomalies', version: '6.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected successfully to remote MCP server!\n');

  let testPassed = 0;
  let testTotal = 0;

  // 1. TEST create_thirdparty (name only)
  testTotal++;
  console.log('=================================================================');
  console.log(`TEST ${testTotal}: create_thirdparty avec SEULEMENT 'name'`);
  console.log('=================================================================');
  let thirdpartyNameOnlyId = null;
  try {
    const res = await client.callTool({
      name: 'create_thirdparty',
      arguments: { name: 'TEST_TIERS_NOM_SEUL_AUTO' }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat create_thirdparty (nom seul) :', {
      applied: data.applied,
      verified: data.verified,
      circuit_breaker: data.circuit_breaker,
      route_used: data.route_used,
      id: data.id,
      name: data.name
    });
    if (data.applied && data.verified && data.id && data.circuit_breaker === 'NORMAL') {
      thirdpartyNameOnlyId = data.id;
      console.log('✅ PASS: Tiers créé avec seulement name et relecture vérifiée.');
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  // 2. TEST create_thirdparty (name + client: 1 + fournisseur: 1)
  testTotal++;
  console.log('\n=================================================================');
  console.log(`TEST ${testTotal}: create_thirdparty avec name, client: 1, fournisseur: 1`);
  console.log('=================================================================');
  let thirdpartyCommercialId = null;
  try {
    const res = await client.callTool({
      name: 'create_thirdparty',
      arguments: {
        name: `TIERS_TEST_COMMERCIAL_${Date.now()}`,
        client: 1,
        fournisseur: 1,
        email: `contact_${Date.now()}@test-e2e.sn`
      }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat create_thirdparty (client + fournisseur) :', {
      applied: data.applied,
      verified: data.verified,
      id: data.id,
      code_client: data.code_client,
      code_fournisseur: data.code_fournisseur,
      circuit_breaker: data.circuit_breaker
    });
    if (data.applied && data.verified && data.id && data.code_client && data.code_fournisseur) {
      thirdpartyCommercialId = data.id;
      console.log(`✅ PASS: Tiers commercial créé (ID #${data.id}), code_client=${data.code_client}, code_fournisseur=${data.code_fournisseur}`);
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  // 3. TEST create_task (avec génération automatique de ref)
  testTotal++;
  console.log('\n=================================================================');
  console.log(`TEST ${testTotal}: create_task avec génération automatique de ref sur projet ID 10`);
  console.log('=================================================================');
  let createdTaskId1 = null;
  try {
    const res = await client.callTool({
      name: 'create_task',
      arguments: {
        project_id: 10,
        label: 'Tâche de test auto-ref'
      }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat create_task (auto-ref) :', {
      applied: data.applied,
      verified: data.verified,
      id: data.id,
      ref: data.ref,
      parent_project: data.parent_project,
      verification_status: data.verification_status
    });
    if (data.applied && data.verified && data.id && data.ref && data.parent_project?.id === 10) {
      createdTaskId1 = data.id;
      console.log(`✅ PASS: Tâche créée (ID #${data.id}, Ref: ${data.ref}) et vérifiée par relecture dans le projet #${data.parent_project.id}`);
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  // 4. TEST create_task (avec ref manuelle fournie)
  testTotal++;
  console.log('\n=================================================================');
  console.log(`TEST ${testTotal}: create_task avec ref manuelle sur projet ID 10`);
  console.log('=================================================================');
  let createdTaskId2 = null;
  try {
    const manualRef = `TK2610-MAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await client.callTool({
      name: 'create_task',
      arguments: {
        project_id: 10,
        ref: manualRef,
        label: 'Tâche de test ref manuelle'
      }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat create_task (ref manuelle) :', {
      applied: data.applied,
      verified: data.verified,
      id: data.id,
      ref: data.ref,
      parent_project: data.parent_project
    });
    if (data.applied && data.verified && data.ref === manualRef) {
      createdTaskId2 = data.id;
      console.log(`✅ PASS: Tâche créée avec ref manuelle ${data.ref} (ID #${data.id})`);
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  // 5. TEST add_ticket_message sur ticket TS2610-0002
  testTotal++;
  console.log('\n=================================================================');
  console.log(`TEST ${testTotal}: add_ticket_message sur ticket TS2610-0002 (ID 2)`);
  console.log('=================================================================');
  try {
    const res = await client.callTool({
      name: 'add_ticket_message',
      arguments: {
        id: 2,
        message: 'Message de test automatisé MCP - résolution 404 confirmée.',
        private_message: 1
      }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat add_ticket_message :', {
      applied: data.applied,
      verified: data.verified,
      route_used: data.route_used,
      ticket_id: data.ticket_id,
      ref: data.ref,
      track_id: data.track_id
    });
    if (data.applied && data.verified && data.route_used === 'POST /tickets/newmessage') {
      console.log(`✅ PASS: Message ajouté au ticket ${data.ref} via la route officielle /tickets/newmessage.`);
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  // 6. TEST create_ticket (vérification de la résilience)
  testTotal++;
  console.log('\n=================================================================');
  console.log(`TEST ${testTotal}: create_ticket résilience et relecture`);
  console.log('=================================================================');
  try {
    const res = await client.callTool({
      name: 'create_ticket',
      arguments: {
        subject: `TEST_RESILIENCE_${Date.now()}`,
        message: 'Ticket créé pour valider la robustesse réseau de create_ticket',
        severity_code: 'LOW'
      }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat create_ticket :', {
      applied: data.applied,
      verified: data.verified,
      id: data.id,
      ref: data.ref,
      network_retry_recovered: data.network_retry_recovered
    });
    if (data.applied && data.verified && data.id && data.ref) {
      console.log(`✅ PASS: Ticket créé et vérifié avec succès (ID #${data.id}, Ref: ${data.ref})`);
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  // 7. TEST Anti-doublon Facturation dans le Workflow
  testTotal++;
  console.log('\n=================================================================');
  console.log(`TEST ${testTotal}: Empêcher les factures en double dans le workflow`);
  console.log('=================================================================');
  try {
    const res = await client.callTool({
      name: 'test_workflow_rule',
      arguments: {
        rule_code: 'WORKFLOW_ORDER_AUTOCREATE_INVOICE',
        target_object_type: 'order',
        target_object_id: 4
      }
    });
    const data = JSON.parse(res.content[0].text);
    console.log('Résultat test_workflow_rule anti-doublon :', {
      rule_code: data.rule_code,
      conditions: data.conditions_evaluees?.map(c => ({ cond: c.condition, valide: c.valide })),
      action_attendue: data.action_attendue,
      verdict: data.verdict
    });
    const hasAntiDupCond = data.conditions_evaluees?.some(c => c.condition.includes('Anti-doublon'));
    if (hasAntiDupCond && data.verifiable) {
      console.log('✅ PASS: Règle de classification et anti-doublon de facturation vérifiés.');
      testPassed++;
    } else {
      console.error('❌ FAIL:', data);
    }
  } catch (err) {
    console.error('❌ FAIL Error:', err.message);
  }

  console.log('\n=================================================================');
  console.log(`RÉSULTAT DES TESTS : ${testPassed}/${testTotal} RÉUSSIS`);
  console.log('=================================================================');

  process.exit(testPassed === testTotal ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
