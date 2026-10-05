import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRegistry, isReadOnlyTool, policyFromEnv } from "./server.js";

test("aucun outil n'est déclaré deux fois", () => {
  assert.doesNotThrow(() => buildRegistry({ readOnly: false, disabled: new Set() }));
});

test("le mode lecture seule n'expose que des outils de consultation", () => {
  const registry = buildRegistry({ readOnly: true, disabled: new Set() });
  assert.ok(registry.size > 0);
  for (const name of registry.keys()) assert.ok(isReadOnlyTool(name), name);
  assert.ok(!registry.has("create_invoice"));
  assert.ok(!registry.has("delete_document"));
});

test("les outils listés dans DOLIBARR_DISABLED_TOOLS sont retirés", () => {
  const policy = policyFromEnv({ DOLIBARR_DISABLED_TOOLS: "delete_document, delete_invoice_line" });
  const registry = buildRegistry(policy);
  assert.ok(!registry.has("delete_document"));
  assert.ok(!registry.has("delete_invoice_line"));
  assert.ok(registry.has("create_invoice"));
});

test("les outils portent des annotations lecture seule / destructif", () => {
  const registry = buildRegistry({ readOnly: false, disabled: new Set() });
  assert.equal(registry.get("list_invoices")?.tool.annotations?.readOnlyHint, true);
  assert.equal(registry.get("create_invoice")?.tool.annotations?.readOnlyHint, false);
  assert.equal(registry.get("delete_document")?.tool.annotations?.destructiveHint, true);
});

test("policyFromEnv lit DOLIBARR_READ_ONLY", () => {
  assert.equal(policyFromEnv({ DOLIBARR_READ_ONLY: "true" }).readOnly, true);
  assert.equal(policyFromEnv({}).readOnly, false);
});
