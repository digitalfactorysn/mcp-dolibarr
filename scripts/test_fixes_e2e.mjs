import { createServer } from '../build/server.js';
import dotenv from 'dotenv';
dotenv.config();

// We can test the tools directly by instantiating the API and invoking handlers, or using the server request handlers.
import { DolibarrAPI } from '../build/api.js';
import { handleShipmentTool } from '../build/tools/shipments.js';
import { handleSupplierInvoiceTool } from '../build/tools/supplier_invoices.js';
import { handleContractsProjectsOpsTool } from '../build/tools/contracts_projects_ops.js';
import { handleInterventionTool } from '../build/tools/interventions.js';
import { handleContractTool } from '../build/tools/crm_projects_hr.js';
import { handleTicketTool } from '../build/tools/tickets.js';
import { handleAccountingAdvancedTool } from '../build/tools/accounting_advanced.js';
import { handleAccountingTool } from '../build/tools/accounting.js';

const api = new DolibarrAPI(process.env.DOLIBARR_URL, process.env.DOLIBARR_API_KEY);

async function runTests() {
  console.log("=== STARTING RE-TEST OF FIXED TOOLS ===");

  // 1. Test Task Time Spent
  console.log("\n--- 1. Testing add_task_time ---");
  try {
    const resTaskTime = await handleContractsProjectsOpsTool('add_task_time', {
      task_id: 10,
      duration_seconds: 1800,
      date: '2026-10-12',
      note: 'Test validation MCP',
      user_id: 1,
    }, api);
    console.log("Result add_task_time:", resTaskTime);
    const parsed = JSON.parse(resTaskTime);
    if (!parsed.verified) throw new Error("add_task_time not verified!");

    // Clean up timespent entries created
    const timespentList = await api.get('/tasks/10/timespent');
    if (Array.isArray(timespentList)) {
      for (const entry of timespentList) {
        if (entry.timespent_line_note === 'Test validation MCP') {
          await api.delete(`/tasks/10/timespent/${entry.timespent_line_id}`);
          console.log(`Cleaned up test timespent line ${entry.timespent_line_id}`);
        }
      }
    }
  } catch (err) {
    console.error("FAIL 1. add_task_time:", err.message);
  }

  // 2. Test Intervention Line
  console.log("\n--- 2. Testing add_intervention_line ---");
  try {
    const resIntervLine = await handleInterventionTool('add_intervention_line', {
      id: 3,
      desc: 'Maintenance serveur test MCP',
      duree: 3600,
      date: '2026-10-12',
    }, api);
    console.log("Result add_intervention_line:", resIntervLine);
    const parsed = JSON.parse(resIntervLine);
    if (!parsed.verified) throw new Error("add_intervention_line not verified!");

    // Clean up intervention line
    if (parsed.line_id) {
      await api.delete(`/interventions/3/lines/${parsed.line_id}`);
      console.log(`Cleaned up test intervention line ${parsed.line_id}`);
    }
  } catch (err) {
    console.error("FAIL 2. add_intervention_line:", err.message);
  }

  // 3. Test Contract Creation
  console.log("\n--- 3. Testing create_contract ---");
  try {
    const resContract = await handleContractTool('create_contract', {
      socid: 117,
      date: '2026-10-12',
      note_public: 'Contrat infogérance test MCP',
    }, api);
    console.log("Result create_contract:", resContract);
    const parsed = JSON.parse(resContract);
    if (!parsed.verified) throw new Error("create_contract not verified!");

    // Clean up contract
    if (parsed.contract_id) {
      await api.delete(`/contracts/${parsed.contract_id}`);
      console.log(`Cleaned up test contract ${parsed.contract_id}`);
    }
  } catch (err) {
    console.error("FAIL 3. create_contract:", err.message);
  }

  // 4. Test Supplier Invoice Line
  console.log("\n--- 4. Testing add_supplier_invoice_line & delete_supplier_invoice_line ---");
  try {
    const resSupLine = await handleSupplierInvoiceTool('add_supplier_invoice_line', {
      id: 4,
      desc: 'Licence logicielle Cloud Test',
      subprice: 15000,
      qty: 1,
      tva_tx: 18,
    }, api);
    console.log("Result add_supplier_invoice_line:", resSupLine);
    const parsed = JSON.parse(resSupLine);
    if (!parsed.verified) throw new Error("add_supplier_invoice_line not verified!");

    // Delete it using the new tool
    if (parsed.line_id) {
      const resDel = await handleSupplierInvoiceTool('delete_supplier_invoice_line', {
        id: 4,
        line_id: parsed.line_id,
      }, api);
      console.log("Result delete_supplier_invoice_line:", resDel);
    }
  } catch (err) {
    console.error("FAIL 4. add_supplier_invoice_line:", err.message);
  }

  // 5. Test Close Ticket
  console.log("\n--- 5. Testing close_ticket ---");
  try {
    const resTicket = await handleTicketTool('close_ticket', { id: 2 }, api);
    console.log("Result close_ticket:", resTicket);
    const parsed = JSON.parse(resTicket);
    if (!parsed.verified || !parsed.date_close) throw new Error("close_ticket missing date_close or unverified!");
  } catch (err) {
    console.error("FAIL 5. close_ticket:", err.message);
  }

  // 6. Test Shipment Creation on Order 113
  console.log("\n--- 6. Testing create_shipment on Order 113 ---");
  try {
    // Check order 113 lines first
    const order113 = await api.get('/orders/113');
    console.log("Order 113 ref:", order113.ref, "status:", order113.statut, "lines count:", order113.lines?.length);

    // Try shipment creation dry_run first or live
    const resShipment = await handleShipmentTool('create_shipment', {
      origin_id: 113,
      origin_type: 'commande',
      dry_run: true,
    }, api);
    console.log("Result create_shipment dry_run:", resShipment);
  } catch (err) {
    console.error("FAIL 6. create_shipment:", err.message);
  }

  // 7. Test VAT report and Financial Summary
  console.log("\n--- 7. Testing get_vat_report & get_financial_summary ---");
  try {
    const resVat = await handleAccountingAdvancedTool('get_vat_report', { year: 2026, month: 10 }, api);
    console.log("Result get_vat_report:", resVat);
    const parsedVat = JSON.parse(resVat);
    if (parsedVat.certified !== false) throw new Error("VAT report should be certified: false");

    const resFin = await handleAccountingTool('get_financial_summary', { year: 2026 }, api);
    console.log("Result get_financial_summary:", resFin);
    const parsedFin = JSON.parse(resFin);
    if (parsedFin.certified !== false) throw new Error("Financial summary should be certified: false");
  } catch (err) {
    console.error("FAIL 7. accounting:", err.message);
  }

  console.log("\n=== RE-TEST COMPLETED ===");
}

runTests().catch(console.error);
