// Conformité : chaque outil, avec tous ses arguments, n'émet que des requêtes (route + paramètres)
// présentes dans les sources de Dolibarr 24 ; et 23.0.3 pour tout sauf les routes introduites en 24.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TOOLS, makeApi, sampleArgs, allArgs, validator, handlerFor, cfg } from './helpers.mjs';

const SKIP_23 = new Set(['validate_manufacturing_order']); // POST /mos/{id}/validate n'existe qu'en 24
const NEEDS_ARG = new Set(['list_notifications']); // exige user_id ou thirdparty_id

for (const version of ['24.0.1', '23.0.3']) {
  for (const mode of ['required', 'all']) {
    test(`tous les outils respectent l'API Dolibarr ${version} (arguments ${mode})`, async () => {
      const failures = [];
      for (const t of ALL_TOOLS) {
        if (version === '23.0.3' && SKIP_23.has(t.name)) continue;
        if (mode === 'required' && NEEDS_ARG.has(t.name)) continue;
        const args = validator.validate(t.name, mode === 'all' ? allArgs(t) : sampleArgs(t));
        const { api, calls } = makeApi({ version });
        try {
          await handlerFor(t.name)(t.name, args, api, cfg);
          assert.ok(calls.length >= 0);
        } catch (e) {
          failures.push(`${t.name}: ${e.message}`);
        }
      }
      assert.deepEqual(failures, []);
    });
  }
}

test('les outils ont des noms uniques et un schéma objet', () => {
  const names = ALL_TOOLS.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  for (const t of ALL_TOOLS) assert.equal(t.inputSchema.type, 'object', t.name);
});

test('aucun outil fantôme : plus de grand livre, d’e-mail ni de configuration à distance', () => {
  const names = new Set(ALL_TOOLS.map((t) => t.name));
  for (const gone of ['send_invoice_email', 'set_setup_value', 'update_company_info', 'create_misc_journal_entry', 'get_trial_balance', 'reconcile_bank_line', 'send_mailing']) {
    assert.ok(!names.has(gone), gone);
  }
});

test('aucune valeur propre à l’auteur d’origine (URL, banque, devise, TVA) ne subsiste', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../src/tools/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const bad of ['digitalfactory.sn', 'ECOBANK', 'FCFA', 'SYSCOHADA', 'tva_tx: 18', 'author) || 1']) {
      assert.ok(!src.includes(bad), `${f} contient ${bad}`);
    }
  }
});

test('un montant partiel de paiement n’est jamais remplacé par le total', async () => {
  const { api, calls } = makeApi({ version: '24.0.1' });
  const args = validator.validate('add_payment_to_invoice', { id: 5, datepaye: '2025-03-01', payment_mode_id: 2, accountid: 1, amount: 40 });
  await handlerFor('add_payment_to_invoice')('add_payment_to_invoice', args, api, cfg);
  const post = calls.find((c) => c.method === 'POST');
  assert.equal(post.url, '/invoices/paymentsdistributed');
  assert.deepEqual(post.data.arrayofamounts, { 5: { amount: '40', multicurrency_amount: '' } });
});

test('l’auteur par défaut est le propriétaire de la clé API, pas l’utilisateur 1', async () => {
  const { api, calls } = makeApi({ version: '24.0.1', respond: (c) => (c.url === '/users/info' ? { id: 7 } : 1) });
  const args = validator.validate('create_invoice', { socid: 3 });
  await handlerFor('create_invoice')('create_invoice', args, api, cfg);
  const post = calls.find((c) => c.method === 'POST');
  assert.equal(post.data.fk_user_author, 7);
});
