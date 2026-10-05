import { test } from "node:test";
import assert from "node:assert/strict";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { dateRangeFilter, invoiceStatusParam, sanitizeArgs, toTimestamp } from "./validation.js";

const tool: Tool = {
  name: "create_thing",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "number" },
      label: { type: "string" },
      mode: { type: "string", enum: ["HT", "TTC"] },
      active: { type: "boolean" },
    },
    required: ["id"],
  },
};

test("sanitizeArgs supprime les propriétés non déclarées", () => {
  const clean = sanitizeArgs(tool, { id: 1, label: "x", fk_user_author: 1, admin: 1 });
  assert.deepEqual(clean, { id: 1, label: "x" });
});

test("sanitizeArgs refuse un ID non numérique (injection de chemin)", () => {
  assert.throws(() => sanitizeArgs(tool, { id: "1/../setup" }), /nombre attendu/);
});

test("sanitizeArgs convertit les nombres et booléens transmis en texte", () => {
  assert.deepEqual(sanitizeArgs(tool, { id: "12", active: "true" }), { id: 12, active: true });
});

test("sanitizeArgs vérifie les champs obligatoires et les enums", () => {
  assert.throws(() => sanitizeArgs(tool, { label: "x" }), /obligatoire/);
  assert.throws(() => sanitizeArgs(tool, { id: 1, mode: "XX" }), /valeurs acceptées/);
});

test("toTimestamp convertit une date ISO et rejette une date invalide", () => {
  assert.equal(toTimestamp("2025-01-31T00:00:00Z"), 1738281600);
  assert.throws(() => toTimestamp("pas une date"), /Date invalide/);
});

test("dateRangeFilter produit un filtre Dolibarr et refuse les valeurs non conformes", () => {
  assert.equal(dateRangeFilter("t.datef", "2025-01-01", "2025-12-31"), "(t.datef:>=:'2025-01-01') and (t.datef:<=:'2025-12-31')");
  assert.equal(dateRangeFilter("t.datef"), undefined);
  assert.throws(() => dateRangeFilter("t.datef", "2025-01-01') or (1=1"), /Date invalide/);
});

test("invoiceStatusParam traduit les statuts numériques", () => {
  assert.equal(invoiceStatusParam(1), "unpaid");
  assert.equal(invoiceStatusParam(2), "paid");
  assert.equal(invoiceStatusParam(9), undefined);
});
