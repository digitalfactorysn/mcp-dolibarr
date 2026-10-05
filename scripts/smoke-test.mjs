// Test de bout en bout : lance le serveur MCP (stdio) contre un faux Dolibarr local
// et affiche les requêtes HTTP réellement envoyées à Dolibarr.
// Usage : npm run build && node scripts/smoke-test.mjs
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const requests = [];
const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", c => (body += c));
  req.on("end", () => {
    requests.push({ method: req.method, url: decodeURIComponent(req.url), key: req.headers.dolapikey, body: body ? JSON.parse(body) : undefined });
    res.setHeader("Content-Type", "application/json");
    const url = req.url ?? "";
    if (url.startsWith("/api/index.php/invoices?")) {
      res.end(JSON.stringify(url.includes("page=0") ? [
        { id: 1, ref: "FA1", status: "1", total_ht: "100", total_tva: "20", total_ttc: "120", date: 1735689600 },
        { id: 2, ref: "FA2", status: "0", total_ht: "999", total_tva: "199.8", total_ttc: "1198.8", date: 1735689600 },
      ] : []));
    } else if (url.startsWith("/api/index.php/supplierinvoices?")) {
      res.end("[]");
    } else if (url.startsWith("/api/index.php/invoices/1")) {
      res.end(JSON.stringify({ id: 1, ref: "FA1", socid: 7 }));
    } else if (url.startsWith("/api/index.php/documents/builddoc")) {
      res.end(JSON.stringify({ filename: "FA1.pdf", filesize: 1234, content: "..." }));
    } else {
      res.end("42");
    }
  });
});
await new Promise(r => mock.listen(0, "127.0.0.1", r));
const port = mock.address().port;

const transport = new StdioClientTransport({
  command: "node",
  args: ["build/index.js"],
  env: { ...process.env, DOLIBARR_URL: `http://127.0.0.1:${port}`, DOLIBARR_API_KEY: "test-key" },
});
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`Outils exposés : ${tools.length}`);

async function call(name, args) {
  requests.length = 0;
  const r = await client.callTool({ name, arguments: args });
  console.log(`\n▶ ${name} ${JSON.stringify(args)}\n  résultat : ${r.content[0].text.split("\n").slice(0, 12).join("\n  ")}`);
  for (const q of requests) console.log(`  → ${q.method} ${q.url}${q.body ? " " + JSON.stringify(q.body) : ""}`);
}

await call("list_invoices", { status: 1 });
await call("create_invoice", { socid: 7, date: "2025-03-15", fk_user_author: 1, entity: 2 });
await call("get_invoice", { id: "1/../../setup/company" });
await call("get_vat_report", { year: 2025, month: 1 });
await call("generate_document_pdf", { modulepart: "invoice", id: 1 });
await call("create_credit_note", { source_invoice_id: 1 });

await client.close();
mock.close();
