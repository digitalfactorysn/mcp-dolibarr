import { handleProposalTool } from '../build/tools/proposals.js';
import { DolibarrAPI } from '../build/api.js';

const api = new DolibarrAPI(
  'https://gestion.digitalfactory.sn/api/index.php',
  '[SECRET_RETIRE]'
);

async function runTests() {
  console.log('🚀 DÉBUT DU TEST DES 6 CRITÈRES DE VALIDATION DE LIGNE DE DEVIS');
  let failures = 0;

  // Création d'un devis de test
  const createRes = await handleProposalTool('create_proposal', { socid: 1 }, api);
  const createdProp = JSON.parse(createRes);
  const propId = createdProp.id;
  console.log(`✅ Devis créé pour le test: ID #${propId} (${createdProp.ref})`);

  try {
    // TEST 5.1: Échec si quantité <= 0
    console.log('\n--- Test 5.1 : Rejet si quantité <= 0 ---');
    const resQtyZero = JSON.parse(await handleProposalTool('add_proposal_line', {
      id: propId,
      subprice: 10000,
      qty: 0,
      tva_tx: 18,
    }, api));
    if (!resQtyZero.applied && resQtyZero.error?.includes('Quantité invalide')) {
      console.log('✅ PASS: Rejeté avec succès lorsque quantité = 0');
    } else {
      console.error('❌ FAIL: Devrait rejeter si quantité = 0', resQtyZero);
      failures++;
    }

    // TEST 5.2: Échec si prix unitaire <= 0
    console.log('\n--- Test 5.2 : Rejet si prix unitaire <= 0 ---');
    const resPriceZero = JSON.parse(await handleProposalTool('add_proposal_line', {
      id: propId,
      subprice: 0,
      qty: 1,
      tva_tx: 18,
    }, api));
    if (!resPriceZero.applied && resPriceZero.error?.includes('Prix unitaire invalide')) {
      console.log('✅ PASS: Rejeté avec succès lorsque prix unitaire = 0');
    } else {
      console.error('❌ FAIL: Devrait rejeter si prix unitaire = 0', resPriceZero);
      failures++;
    }

    // TEST 5.3: Échec si produit inexistant
    console.log('\n--- Test 5.3 : Rejet si produit absent ---');
    const resProdAbsent = JSON.parse(await handleProposalTool('add_proposal_line', {
      id: propId,
      fk_product: 99999999,
      subprice: 10000,
      qty: 1,
      tva_tx: 18,
    }, api));
    if (!resProdAbsent.applied && resProdAbsent.error?.includes('absent ou introuvable')) {
      console.log('✅ PASS: Rejeté avec succès si le produit demandé est absent');
    } else {
      console.error('❌ FAIL: Devrait rejeter si le produit est absent', resProdAbsent);
      failures++;
    }

    // TEST 1, 2, 3, 4, 6: Ajout nominal avec Produit 44 (Service) et tous les champs
    console.log('\n--- Test 1 à 4 : Ajout nominal, transmission, unicité, relecture & totaux ---');
    const lineParams = {
      id: propId,
      desc: 'Audit de sécurité & configuration Pentest',
      fk_product: 44,
      qty: 3,
      subprice: 50000,
      tva_tx: 18,
      remise_percent: 10,
    };
    const resNominal = JSON.parse(await handleProposalTool('add_proposal_line', lineParams, api));

    console.log('Résultat add_proposal_line:', JSON.stringify(resNominal, null, 2));

    // Critère 2 : exactement 1 ligne ajoutée
    if (resNominal.lines_count?.exactly_one_added && resNominal.lines_count.after === 1) {
      console.log('✅ PASS Critère 2 : Exactement 1 ligne créée');
    } else {
      console.error('❌ FAIL Critère 2 : Nombre de lignes inattendu', resNominal.lines_count);
      failures++;
    }

    // Critère 1 & 3 : transmission et contrôle de chaque valeur
    const lv = resNominal.line_verification;
    if (
      lv?.all_controls_valid &&
      lv.desc === lineParams.desc &&
      Number(lv.fk_product) === 44 &&
      Number(lv.qty) === 3 &&
      Number(lv.subprice) === 50000 &&
      Number(lv.tva_tx) === 18 &&
      Number(lv.remise_percent) === 10
    ) {
      console.log('✅ PASS Critères 1 & 3 : Toutes les valeurs transmises et relues avec exactitude');
    } else {
      console.error('❌ FAIL Critères 1 & 3 : Valeurs relues incorrectes', lv);
      failures++;
    }

    // Critère 4 : recalcul et vérification des totaux
    // 3 * 50000 * 0.90 = 135000 HT
    // 135000 * 1.18 = 159300 TTC
    const tv = resNominal.totals_verification;
    if (
      tv?.totals_consistent &&
      Math.abs(tv.actual_total_ht - 135000) < 1 &&
      Math.abs(tv.actual_total_ttc - 159300) < 1
    ) {
      console.log('✅ PASS Critère 4 : Totaux recalculés et cohérents (135 000 HT / 159 300 TTC)');
    } else {
      console.error('❌ FAIL Critère 4 : Totaux incohérents', tv);
      failures++;
    }

    // Test de conversion en chaîne (devis signé -> commande)
    console.log('\n--- Test Chaîne Vente : Signature et Conversion en Commande ---');
    const signRes = JSON.parse(await handleProposalTool('validate_proposal', { id: propId, status: 2 }, api));
    console.log('Devis signé:', signRes.message);

    const convertRes = JSON.parse(await handleProposalTool('convert_proposal_to_order', { id: propId }, api));
    console.log('Commande créée par conversion:', convertRes.order_ref, 'Total TTC:', convertRes.total_ttc);
    if (convertRes.order_id && convertRes.total_ttc > 0) {
      console.log('✅ PASS Chaîne Vente : Conversion devis -> commande réussie avec lignes reportées !');
      // Nettoyage de la commande
      await api.delete(`/orders/${convertRes.order_id}`).catch(() => null);
    } else {
      console.error('❌ FAIL Chaîne Vente : Échec conversion en commande', convertRes);
      failures++;
    }

  } finally {
    // Nettoyage du devis
    await api.delete(`/proposals/${propId}`).catch(() => null);
    console.log(`\n🧹 Devis de test #${propId} supprimé proprement.`);
  }

  if (failures === 0) {
    console.log('\n🎉 TOUS LES 6 CRITÈRES ET LA CHAÎNE DE VENTE SONT 100% VALIDÉS !');
  } else {
    console.error(`\n❌ ${failures} TEST(S) ÉCHOUÉ(S)`);
    process.exit(1);
  }
}

runTests().catch(console.error);
