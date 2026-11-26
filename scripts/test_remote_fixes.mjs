import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import axios from 'axios';

const MCP_URL = 'https://mcp.digitalfactory.sn/mcp';
const MCP_TOKEN = process.env.MCP_API_TOKEN; // jamais de jeton dans le code (audit 26/11/2026)
const DOLIBARR_URL = 'https://gestion.digitalfactory.sn/api/index.php';
const DOLIBARR_KEY = process.env.DOLIBARR_API_KEY;

async function testRemoteFixes() {
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

  const toolsRes = await client.listTools();
  console.log(`📋 Total tools discovered on remote server: ${toolsRes.tools.length}`);

  const hasDeleteSupLine = toolsRes.tools.some(t => t.name === 'delete_supplier_invoice_line');
  console.log('Tool delete_supplier_invoice_line present:', hasDeleteSupLine);

  // 1. Task time
  console.log('\n--- 1. Testing remote add_task_time ---');
  const resTime = await client.callTool({
    name: 'add_task_time',
    arguments: {
      task_id: 10,
      duration_seconds: 1800,
      date: '2026-10-12',
      note: 'Remote MCP test validation',
      user_id: 1
    }
  });
  console.log('add_task_time response:', resTime.content[0].text);
  const timeParsed = JSON.parse(resTime.content[0].text);
  if (!timeParsed.verified) throw new Error('add_task_time failed verification!');

  // Cleanup timespent
  const tsList = (await axios.get(`${DOLIBARR_URL}/tasks/10/timespent`, { headers: { DOLAPIKEY: DOLIBARR_KEY } })).data;
  if (Array.isArray(tsList)) {
    for (const item of tsList) {
      if (item.timespent_line_note === 'Remote MCP test validation') {
        await axios.delete(`${DOLIBARR_URL}/tasks/10/timespent/${item.timespent_line_id}`, { headers: { DOLAPIKEY: DOLIBARR_KEY } });
        console.log('Cleaned up remote timespent line', item.timespent_line_id);
      }
    }
  }

  // 2. Intervention line
  console.log('\n--- 2. Testing remote add_intervention_line ---');
  const resInterv = await client.callTool({
    name: 'add_intervention_line',
    arguments: {
      id: 3,
      desc: 'Remote test prestation',
      duree: 3600,
      date: '2026-10-12'
    }
  });
  console.log('add_intervention_line response:', resInterv.content[0].text);
  const intervParsed = JSON.parse(resInterv.content[0].text);
  if (!intervParsed.verified) throw new Error('add_intervention_line failed verification!');

  // Cleanup intervention line
  if (intervParsed.line_id) {
    await axios.delete(`${DOLIBARR_URL}/interventions/3/lines/${intervParsed.line_id}`, { headers: { DOLAPIKEY: DOLIBARR_KEY } });
    console.log('Cleaned up remote intervention line', intervParsed.line_id);
  }

  // 3. Contract creation
  console.log('\n--- 3. Testing remote create_contract ---');
  const resContract = await client.callTool({
    name: 'create_contract',
    arguments: {
      socid: 117,
      date: '2026-10-12',
      note_public: 'Remote contract test'
    }
  });
  console.log('create_contract response:', resContract.content[0].text);
  const contractParsed = JSON.parse(resContract.content[0].text);
  if (!contractParsed.verified) throw new Error('create_contract failed verification!');

  // Cleanup contract
  if (contractParsed.contract_id) {
    await axios.delete(`${DOLIBARR_URL}/contracts/${contractParsed.contract_id}`, { headers: { DOLAPIKEY: DOLIBARR_KEY } });
    console.log('Cleaned up remote contract', contractParsed.contract_id);
  }

  // 4. Supplier invoice line and delete
  console.log('\n--- 4. Testing remote add & delete supplier invoice line ---');
  const resSupAdd = await client.callTool({
    name: 'add_supplier_invoice_line',
    arguments: {
      id: 4,
      desc: 'Remote test supplier line',
      subprice: 25000,
      qty: 1,
      tva_tx: 18
    }
  });
  console.log('add_supplier_invoice_line response:', resSupAdd.content[0].text);
  const supAddParsed = JSON.parse(resSupAdd.content[0].text);
  if (!supAddParsed.verified) throw new Error('add_supplier_invoice_line failed verification!');

  const resSupDel = await client.callTool({
    name: 'delete_supplier_invoice_line',
    arguments: {
      invoice_id: 4,
      line_id: supAddParsed.line_id
    }
  });
  console.log('delete_supplier_invoice_line response:', resSupDel.content[0].text);
  const supDelParsed = JSON.parse(resSupDel.content[0].text);
  if (!supDelParsed.verified) throw new Error('delete_supplier_invoice_line failed verification!');

  // 5. Close ticket
  console.log('\n--- 5. Testing remote close_ticket ---');
  const resTicket = await client.callTool({
    name: 'close_ticket',
    arguments: { id: 2 }
  });
  console.log('close_ticket response:', resTicket.content[0].text);
  const ticketParsed = JSON.parse(resTicket.content[0].text);
  if (!ticketParsed.verified || !ticketParsed.date_close) throw new Error('close_ticket missing date_close!');

  // 6. Shipment dry-run
  console.log('\n--- 6. Testing remote create_shipment dry-run ---');
  const resShipment = await client.callTool({
    name: 'create_shipment',
    arguments: {
      origin_id: 113,
      origin_type: 'commande',
      dry_run: true
    }
  });
  console.log('create_shipment response:', resShipment.content[0].text);
  const shipmentParsed = JSON.parse(resShipment.content[0].text);
  if (!shipmentParsed.dry_run) throw new Error('Shipment dry_run failed!');

  // 7. VAT report & Financial summary
  console.log('\n--- 7. Testing remote get_vat_report & get_financial_summary ---');
  const resVat = await client.callTool({
    name: 'get_vat_report',
    arguments: { year: 2026, month: 10 }
  });
  console.log('get_vat_report response:', resVat.content[0].text);
  const vatParsed = JSON.parse(resVat.content[0].text);
  if (vatParsed.certified !== false) throw new Error('get_vat_report must be certified: false');

  const resFin = await client.callTool({
    name: 'get_financial_summary',
    arguments: { year: 2026 }
  });
  console.log('get_financial_summary response:', resFin.content[0].text);
  const finParsed = JSON.parse(resFin.content[0].text);
  if (finParsed.certified !== false) throw new Error('get_financial_summary must be certified: false');

  console.log('\n🎉 ALL REMOTE TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL!');
  process.exit(0);
}

testRemoteFixes().catch(err => {
  console.error('❌ REMOTE TEST FAILED:', err);
  process.exit(1);
});
