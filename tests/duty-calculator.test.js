/**
 * Duty + landed-cost calculation.
 *
 * Network is stubbed out: DutyCalculator normally asks HsCodeService, which
 * queries external tariff services. These tests inject a local stub so the
 * suite is deterministic and runs offline.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DutyCalculator,
  VAT_RATES,
  NTB_COSTS,
  STR_THRESHOLDS,
} = require('../src/core/duty-calculator');
const { EAC_DUTY_RATES } = require('../src/core/hs-codes');

/** Calculator with a stubbed HS service (no network). */
function calcWith(code) {
  const calc = new DutyCalculator();
  calc.hsService = {
    getByCode: async () => (code ? { code, description: 'stubbed', source: 'test' } : null),
    search: async () => (code ? [{ code, description: 'stubbed', source: 'test' }] : []),
  };
  return calc;
}

const round2 = (n) => Math.round(n * 100) / 100;

test('exports the EAC VAT table with the expected Uganda and Kenya rates', () => {
  assert.equal(VAT_RATES.UG, 18);
  assert.equal(VAT_RATES.KE, 16);
  assert.equal(VAT_RATES.TZ, 18);
  assert.equal(VAT_RATES.NG, 7.5);
});

test('exports simplified-trade-regime thresholds capped at USD 2000', () => {
  assert.equal(STR_THRESHOLDS.UG.max_value_usd, 2000);
  assert.equal(STR_THRESHOLDS.KE.max_value_usd, 2000);
  assert.equal(STR_THRESHOLDS.TZ.max_value_usd, 2000);
});

test('exports per-border non-tariff costs', () => {
  assert.ok(NTB_COSTS.BUSIA);
  assert.equal(typeof NTB_COSTS.BUSIA.inspection, 'number');
  assert.equal(typeof NTB_COSTS.MALABA.inspection, 'number');
});

test('formal regime charges duty on CIF, then VAT on value + duty', async () => {
  const calc = calcWith('1001'); // chapter 10 = cereals, duty 60%
  assert.equal(EAC_DUTY_RATES['10'].duty, 60);

  const r = await calc.calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 10,
    unit: 'kg',
    unitPriceUSD: 100,
    origin: 'TZ',
    destination: 'UG',
    border: 'BUSIA',
    tradeRegime: 'formal',
  });

  assert.equal(r.totalValueUSD, 1000);
  assert.equal(r.isSTR, false);
  assert.equal(r.dutyRate, '60%');
  assert.equal(r.vatRate, '18%');

  // 1000 * 60% = 600
  assert.equal(r.fees.customsDuty, 600);
  // (1000 + 600) * 18% = 288
  assert.equal(r.fees.vat, 288);
  assert.equal(r.fees.inspection, NTB_COSTS.BUSIA.inspection);
  assert.equal(r.fees.documentation, NTB_COSTS.BUSIA.documentation);

  assert.equal(r.fees.total, round2(600 + 288 + NTB_COSTS.BUSIA.inspection + NTB_COSTS.BUSIA.documentation + 15 + 25));
  assert.equal(r.totalLandedCost, round2(1000 + r.fees.total));
  assert.equal(r.totalPerUnit, round2(r.totalLandedCost / 10));
});

test('simplified regime under the threshold waives duty but still charges VAT', async () => {
  const calc = calcWith('1001');

  const r = await calc.calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 10,
    unit: 'kg',
    unitPriceUSD: 100,
    origin: 'TZ',
    destination: 'UG',
    border: 'BUSIA',
    tradeRegime: 'simplified',
  });

  assert.equal(r.isSTR, true);
  assert.equal(r.tradeRegime, 'simplified');
  assert.equal(r.fees.customsDuty, 0);
  // VAT base is CIF only when duty is waived: 1000 * 18% = 180
  assert.equal(r.fees.vat, 180);
});

test('simplified regime above USD 2000 falls back to the formal regime', async () => {
  const calc = calcWith('1001');

  const r = await calc.calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 30,
    unit: 'kg',
    unitPriceUSD: 100, // 3000 > 2000
    origin: 'TZ',
    destination: 'UG',
    border: 'BUSIA',
    tradeRegime: 'simplified',
  });

  assert.equal(r.totalValueUSD, 3000);
  assert.equal(r.isSTR, false);
  assert.equal(r.tradeRegime, 'formal');
  assert.equal(r.fees.customsDuty, 1800); // 3000 * 60%
});

test('intra-EAC trade gets the cheaper certificate of origin', async () => {
  const r = await calcWith('1001').calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 1,
    unitPriceUSD: 100,
    origin: 'KE',
    destination: 'UG',
    border: 'BUSIA',
  });

  assert.equal(r.isIntraEAC, true);
  assert.equal(r.fees.certificateOfOrigin, 15);
});

test('trade from outside EAC pays the full certificate of origin fee', async () => {
  const r = await calcWith('1001').calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 1,
    unitPriceUSD: 100,
    origin: 'CN',
    destination: 'UG',
    border: 'BUSIA',
  });

  assert.equal(r.isIntraEAC, false);
  assert.equal(r.fees.certificateOfOrigin, 25);
});

test('agricultural chapters add an SPS certificate, machinery does not', async () => {
  const agri = await calcWith('1001').calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 1,
    unitPriceUSD: 100,
    origin: 'TZ',
    destination: 'UG',
  });
  assert.equal(agri.isAgricultural, true);
  assert.equal(agri.fees.spsCertificate, 25);

  const machine = await calcWith('8471').calculate({
    productDescription: 'Laptop',
    hsCode: '8471',
    quantity: 1,
    unitPriceUSD: 500,
    origin: 'CN',
    destination: 'UG',
  });
  assert.equal(machine.isAgricultural, false);
  assert.equal(machine.fees.spsCertificate, 0);
});

test('an unknown destination still produces a cost breakdown', async () => {
  const r = await calcWith('1001').calculate({
    productDescription: 'Maize',
    hsCode: '1001',
    quantity: 1,
    unitPriceUSD: 100,
    origin: 'TZ',
    destination: 'ZZ',
  });

  // Falls back to the default 18% VAT rate and default border costs.
  assert.equal(r.vatRate, '18%');
  assert.equal(r.fees.inspection, 10);
  assert.equal(r.fees.documentation, 5);
  assert.ok(r.fees.total > 0);
});
