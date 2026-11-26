import dotenv from 'dotenv';
import { DolibarrAPI } from '../build/api.js';
import { handleSetupTool } from '../build/tools/setup.js';
import { handleAccountingTool } from '../build/tools/accounting.js';
import { handleAccountingConfigTool } from '../build/tools/accounting_config.js';

dotenv.config();

const URL = process.env.DOLIBARR_URL || 'https://gestion.digitalfactory.sn/api/index.php';
const KEY = process.env.DOLIBARR_API_KEY;

async function runLiveValidation() {
  console.log('=== TEST DE VALIDATION LIVE DOLIBARR ===\n');
  const api = new DolibarrAPI(URL, KEY);

  // 1. Filtrage des constantes
  console.log('1. Test filtrage des constantes :');
  const resUnitStr = await handleSetupTool('get_setup_values', { constant: 'MAIN_MONNAIE' }, api);
  const resUnit = JSON.parse(resUnitStr);
  console.log('   - Lecture unitaire MAIN_MONNAIE:', resUnit.value === 'XOF' ? 'PASS (XOF)' : 'FAIL', resUnit);

  const resModuleStr = await handleSetupTool('get_setup_values', { module: 'FACTURE', limit: 5 }, api);
  const resModule = JSON.parse(resModuleStr);
  const keys = Object.keys(resModule.constants || {});
  const allMatch = keys.every(k => k.includes('FACTURE'));
  console.log(`   - Filtrage module FACTURE: ${allMatch && keys.length > 0 ? 'PASS' : 'FAIL'} (${keys.length} clés trouvées sur ${resModule.total_matches} totales)`, keys);

  // 2. Journaux comptables réels
  console.log('\n2. Test lecture réelle des journaux comptables :');
  const resJournalsStr = await handleAccountingTool('list_accounting_journals', {}, api);
  const resJournals = JSON.parse(resJournalsStr);
  const hasJournals = Array.isArray(resJournals) && resJournals.length > 0;
  console.log(`   - Journaux détectés: ${hasJournals ? 'PASS' : 'FAIL'} (${resJournals.length} journaux réels)`);
  if (hasJournals) {
    console.log('     Codes:', resJournals.map(j => `${j.code} (${j.nature_label})`).join(', '));
  }

  // 3. Plan comptable réel (SYSCOHADA)
  console.log('\n3. Test lecture réelle du plan comptable (SYSCOHADA) :');
  const resAccountsStr = await handleAccountingTool('list_accounting_accounts', { search_account: '411', limit: 5 }, api);
  const resAccounts = JSON.parse(resAccountsStr);
  const hasAccounts = Array.isArray(resAccounts) && resAccounts.length > 0;
  console.log(`   - Comptes 411 trouvés: ${hasAccounts ? 'PASS' : 'FAIL'} (${resAccounts.length} comptes)`);
  if (hasAccounts) {
    console.log('     Exemples:', resAccounts.map(a => `${a.account_number} - ${a.label}`).join(' | '));
  }

  // 4. Configuration bancaire & Protection compte #1
  console.log('\n4. Test configuration bancaire & protection compte #1 (ECOBANK) :');
  const resProtectStr = await handleAccountingConfigTool('configure_bank_accounting', { account_id: 1, accounting_number: '521' }, api);
  const resProtect = JSON.parse(resProtectStr);
  console.log('   - Protection compte #1:', resProtect.error === 'PRODUCTION_ACCOUNT_PROTECTED' ? 'PASS (Protégé)' : 'FAIL');

  // 5. Tableau de bord comptable enrichi
  console.log('\n5. Test tableau de bord comptable complet :');
  const resDashStr = await handleAccountingConfigTool('get_accounting_dashboard', {}, api);
  const resDash = JSON.parse(resDashStr);
  console.log('   - Tableau de bord:', resDash.titre ? 'PASS' : 'FAIL', {
    plan: resDash.plan,
    banques: resDash.tresorerie?.banques?.length,
    journaux: resDash.journaux_disponibles?.length
  });

  console.log('\n=== TOUS LES TESTS LIVE ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS ===');
}

runLiveValidation().catch(console.error);
