/**
 * Journal structuré des appels d'outils (audit 26/11/2026, F-09 / OWASP MCP08).
 * Une ligne JSON par appel d'outil sur stderr : horodatage, outil, identifiants d'objets, issue, durée. Jamais de contenu métier ni de texte libre (montants, e-mails, notes…) : seules les valeurs
 * des paramètres d'identifiant (id, *_id, socid, fk_*) sont gardées, et seulement si elles sont courtes.
 */

const ID_KEY = /^(id|ref|socid|fk_[a-z_]+|[a-z_]+_id)$/;
const MAX_ID_LENGTH = 40;

function identifiers(args: unknown): Record<string, string | number> {
  if (!args || typeof args !== "object") return {};
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (!ID_KEY.test(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string" && value.length <= MAX_ID_LENGTH) out[key] = value;
    else out[key] = "[ignoré]";
  }
  return out;
}

/** Une ligne JSON par appel d'outil (stdio et HTTP). */
export function logToolCall(tool: string, args: unknown, outcome: "ok" | "error" | "refused", durationMs: number): void {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    event: "tools_call",
    tool: tool.slice(0, 80),
    ids: identifiers(args),
    outcome,
    duration_ms: durationMs,
  }));
}
